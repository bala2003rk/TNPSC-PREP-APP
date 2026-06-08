const StudyMaterial = require('../models/StudyMaterial.model');
const AppError = require('../middlewares/error.middleware').AppError || class AppError extends Error {
  constructor(message, statusCode) { super(message); this.statusCode = statusCode; this.isOperational = true; }
};

// ── GET /api/materials ─────────────────────────────────────────────────────────
exports.getMaterials = async (req, res, next) => {
  try {
    const { category, subject, examGroup, search, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };

    if (category)  filter.category = category;
    if (subject)   filter.subject  = subject;
    if (examGroup) filter.examGroups = { $in: [examGroup, 'ALL'] };

    if (search) {
      filter.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.ta': { $regex: search, $options: 'i' } },
        { tags:       { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await StudyMaterial.countDocuments(filter);

    const materials = await StudyMaterial.find(filter)
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: {
        materials,
        pagination: {
          total,
          page:       Number(page),
          limit:      Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/materials/:id ─────────────────────────────────────────────────────
exports.getMaterialById = async (req, res, next) => {
  try {
    const material = await StudyMaterial.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $inc: { downloadCount: 1 } },
      { new: true }
    )
      .populate('uploadedBy', 'name')
      .lean();

    if (!material) return next(new AppError('Material not found', 404));

    // Premium check
    if (material.isPremium) {
      const user = req.user;
      const isSubscribed = user?.subscription?.isActive &&
        new Date(user.subscription.endDate) > new Date();
      if (!isSubscribed && user.role !== 'admin') {
        return next(new AppError('This material requires a premium subscription', 403));
      }
    }

    res.status(200).json({ success: true, data: material });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/materials  (admin) ──────────────────────────────────────────────
exports.createMaterial = async (req, res, next) => {
  try {
    const {
      titleEn, titleTa,
      descriptionEn, descriptionTa,
      category, subject, examGroups,
      fileUrl, fileSize, fileType,
      thumbnailUrl, isPremium, tags, year,
    } = req.body;

    if (!titleEn || !fileUrl || !category) {
      return next(new AppError('titleEn, fileUrl and category are required', 400));
    }

    const material = await StudyMaterial.create({
      title:       { en: titleEn, ta: titleTa || '' },
      description: { en: descriptionEn || '', ta: descriptionTa || '' },
      category,
      subject:     subject || '',
      examGroups:  Array.isArray(examGroups) ? examGroups : ['ALL'],
      fileUrl,
      fileSize:    Number(fileSize) || 0,
      fileType:    fileType || 'PDF',
      thumbnailUrl: thumbnailUrl || '',
      isPremium:   Boolean(isPremium),
      uploadedBy:  req.user._id,
      tags:        Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      year:        year ? Number(year) : undefined,
    });

    res.status(201).json({ success: true, data: material });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/materials/:id  (admin, soft delete) ───────────────────────────
exports.deleteMaterial = async (req, res, next) => {
  try {
    const material = await StudyMaterial.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!material) return next(new AppError('Material not found', 404));
    res.status(200).json({ success: true, message: 'Material deleted' });
  } catch (err) {
    next(err);
  }
};
