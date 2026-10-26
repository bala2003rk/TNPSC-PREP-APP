const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 or buffer image to Cloudinary
 * @param {string} fileStr - base64 data URI or file path
 * @param {string} folder  - Cloudinary folder name
 * @returns {Promise<{url: string, publicId: string}>}
 */
exports.uploadImage = async (fileStr, folder = 'tnpsc-avatars') => {
  const result = await cloudinary.uploader.upload(fileStr, {
    folder,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
  return { url: result.secure_url, publicId: result.public_id };
};

/**
 * Delete an image from Cloudinary by publicId
 */
exports.deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};
