import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "",                  icon: "📂", labelKey: "common.all" },
  { key: "NOTES",             icon: "📄", labelKey: "materials.notes" },
  { key: "CURRENT_AFFAIRS",   icon: "📰", labelKey: "materials.currentAffairs" },
  { key: "TAMIL_ELIGIBILITY", icon: "🔤", labelKey: "materials.tamilEligibility" },
  { key: "PREVIOUS_PAPERS",   icon: "📜", labelKey: "materials.previousPapers" },
  { key: "BOOKS",             icon: "📚", labelKey: "materials.books" },
  { key: "SYLLABUS",          icon: "📋", labelKey: "materials.syllabus" },
];

const SUBJECTS = [
  "","History","Geography","Polity","Economy",
  "Science","Environment","Current Affairs","Tamil","General Knowledge",
];

const EXAM_GROUPS = ["","GROUP_1","GROUP_2","GROUP_2A","GROUP_4","VAO"];

// ── Premium Modal ─────────────────────────────────────────────────────────────
const PremiumModal = ({ onClose, t, lang }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
      <div className="text-5xl mb-4">⭐</div>
      <h3 className={cn("text-lg font-black text-gray-800 mb-2", lang === "ta" && "font-tamil")}>
        {t("materials.premiumRequired")}
      </h3>
      <p className={cn("text-gray-500 text-sm mb-5", lang === "ta" && "font-tamil")}>
        {t("materials.premiumMsg")}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={() => { /* navigate to pricing */ onClose(); }}
          className="flex-1 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-bold"
        >
          {t("materials.upgrade")}
        </button>
      </div>
    </div>
  </div>
);

// ── Material Card ─────────────────────────────────────────────────────────────
const MaterialCard = ({ material, t, lang, onDownload }) => {
  const categoryIcon = CATEGORIES.find((c) => c.key === material.category)?.icon || "📄";
  const title = lang === "ta" && material.title?.ta ? material.title.ta : material.title?.en || material.title;
  const desc  = lang === "ta" && material.description?.ta ? material.description.ta : material.description?.en || "";

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
      {/* Card top accent */}
      <div className="h-1 bg-gradient-to-r from-primary to-accent" />

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-primary/20 transition-colors">
            {categoryIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn("text-gray-800 font-bold text-sm leading-snug line-clamp-2", lang === "ta" && "font-tamil")}>
                {title}
              </h3>
              {material.isPremium && (
                <span className="flex-shrink-0 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                  ⭐
                </span>
              )}
            </div>
            {desc && (
              <p className={cn("text-gray-400 text-xs mt-1 line-clamp-2", lang === "ta" && "font-tamil")}>
                {desc}
              </p>
            )}
          </div>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {material.subject && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full border border-blue-100 font-semibold">
              {material.subject}
            </span>
          )}
          {material.fileType && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full font-semibold">
              {material.fileType}
            </span>
          )}
          {material.year && (
            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-full border border-purple-100 font-semibold">
              {material.year}
            </span>
          )}
          {material.fileSize > 0 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] rounded-full">
              {formatSize(material.fileSize)}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-xs">
            ⬇ {material.downloadCount || 0} {t("materials.downloads")}
          </span>
          <button
            onClick={() => onDownload(material)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t("materials.download")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main StudyMaterialsPage ───────────────────────────────────────────────────
const StudyMaterialsPage = () => {
  const { t, lang } = useTranslation();
  const { user } = useSelector((s) => s.auth);

  const [materials,  setMaterials]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showPremium,setShowPremium]= useState(false);
  const [search,     setSearch]     = useState("");
  const [category,   setCategory]   = useState("");
  const [subject,    setSubject]    = useState("");
  const [examGroup,  setExamGroup]  = useState("");
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isSubscribed =
    user?.subscription?.isActive &&
    new Date(user.subscription.endDate) > new Date();

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12 };
      if (category)  params.category  = category;
      if (subject)   params.subject   = subject;
      if (examGroup) params.examGroup = examGroup;
      if (search)    params.search    = search;

      const res  = await api.get("/materials", { params });
      const data = res.data?.data || res.data;
      setMaterials(data?.materials || data || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [category, subject, examGroup, search, page]);

  useEffect(() => {
    setPage(1);
  }, [category, subject, examGroup, search]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleDownload = (material) => {
    if (material.isPremium && !isSubscribed && user?.role !== "admin") {
      setShowPremium(true);
      return;
    }
    window.open(material.fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} t={t} lang={lang} />}

      {/* Header */}
      <div className="bg-dark px-4 pt-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <h1 className={cn("text-2xl font-black text-white mb-1", lang === "ta" && "font-tamil")}>
            📚 {t("materials.title")}
          </h1>
          <p className="text-white/40 text-sm mb-5">Notes, books, and previous papers</p>
          {/* Search */}
          <div className="relative max-w-xl">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("materials.search")}
              className={cn(
                "app-search-input w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl placeholder-gray-500 focus:outline-none focus:border-primary text-sm",
                lang === "ta" && "font-tamil"
              )}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-12 pb-12">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left sidebar: categories */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Category</h3>
              </div>
              <div className="p-2">
                {CATEGORIES.map(({ key, icon, labelKey }) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      category === key
                        ? "bg-primary/15 text-primary"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800",
                      lang === "ta" && "font-tamil"
                    )}
                  >
                    <span>{icon}</span>
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right: filters + grid */}
          <div className="flex-1">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-primary"
              >
                <option value="">{t("materials.filterBySubject")}</option>
                {SUBJECTS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={examGroup}
                onChange={(e) => setExamGroup(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-primary"
              >
                <option value="">{t("materials.filterByGroup")}</option>
                {EXAM_GROUPS.filter(Boolean).map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {(subject || examGroup || category) && (
                <button
                  onClick={() => { setSubject(""); setExamGroup(""); setCategory(""); }}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 hover:border-gray-300"
                >
                  {t("common.reset")}
                </button>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                    <div className="h-1 bg-gray-100 rounded mb-4" />
                    <div className="flex gap-3 mb-3">
                      <div className="w-11 h-11 bg-gray-100 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-2 bg-gray-50 rounded w-full" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-red-500 text-sm">{error}</p>
                <button onClick={fetchMaterials} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">{t("common.retry")}</button>
              </div>
            ) : materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-5xl">📭</span>
                <p className={cn("text-gray-400 text-sm", lang === "ta" && "font-tamil")}>{t("materials.noMaterials")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((m) => (
                    <MaterialCard key={m._id} material={m} t={t} lang={lang} onDownload={handleDownload} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:border-gray-300"
                    >←</button>
                    <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:border-gray-300"
                    >→</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyMaterialsPage;
