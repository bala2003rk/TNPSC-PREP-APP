import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["NOTES","CURRENT_AFFAIRS","TAMIL_ELIGIBILITY","PREVIOUS_PAPERS","BOOKS","SYLLABUS"];
const SUBJECTS   = ["History","Geography","Polity","Economy","Science","Environment","Current Affairs","Tamil","General Knowledge"];
const EXAM_GROUPS= ["GROUP_1","GROUP_2","GROUP_2A","GROUP_4","VAO","ALL"];
const FILE_TYPES = ["PDF","DOC","DOCX","PPT","PPTX","XLS","XLSX","MP4","MP3","ZIP"];

// ── Admin Stat Card ───────────────────────────────────────────────────────────
const AdminStatCard = ({ icon, label, value, color }) => (
  <div className={cn("rounded-2xl border p-5 flex items-center gap-4", color)}>
    <div className="text-3xl">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value ?? "—"}</p>
    </div>
  </div>
);

// ── Bulk Upload Zone ──────────────────────────────────────────────────────────
const UploadZone = ({ t }) => {
  const [dragging,  setDragging]  = useState(false);
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);
  const [uploadErr, setUploadErr] = useState(null);
  const inputRef = useRef(null);

  const validate = (f) => {
    const ok = /\.(xlsx?|csv)$/i.test(f.name);
    if (!ok) { setUploadErr("Please upload an Excel (.xlsx, .xls) or CSV file."); return; }
    setUploadErr(null); setFile(f); setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true); setUploadErr(null);
    try {
      const res = await api.post("/admin/questions/bulk-upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err) {
      setUploadErr(err.response?.data?.message || t("admin.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const clear = () => { setFile(null); setResult(null); setUploadErr(null); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-bold text-gray-800 mb-5">📤 {t("admin.bulkUpload")}</h3>
      <div
        onDrop={(e) => { e.preventDefault(); setDragging(false); e.dataTransfer.files[0] && validate(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
          dragging ? "border-primary bg-primary/5" :
          file ? "border-green-400 bg-green-50 cursor-default" :
          "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
        )}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => e.target.files[0] && validate(e.target.files[0])} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📊</span>
            <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
            <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
            <button onClick={(e) => { e.stopPropagation(); clear(); }} className="text-xs text-red-400 hover:text-red-600">✕ Remove</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">📁</span>
            <p className="text-gray-600 text-sm font-medium">{t("admin.dragDrop")}</p>
            <p className="text-gray-400 text-xs">{t("admin.orBrowse")} · Excel, CSV</p>
          </div>
        )}
      </div>
      {uploadErr && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{uploadErr}</div>}
      {file && !result && (
        <button onClick={handleUpload} disabled={uploading}
          className={cn("mt-4 w-full py-3 rounded-xl font-bold text-white text-sm transition-all",
            uploading ? "bg-primary/50 cursor-not-allowed" : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md")}>
          {uploading ? `⏳ ${t("admin.uploading")}` : `📤 ${t("admin.bulkUpload")}`}
        </button>
      )}
      {result && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-green-600">{result.inserted}</div>
              <div className="text-xs text-green-600 mt-1">{t("admin.inserted")}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-red-500">{result.failed}</div>
              <div className="text-xs text-red-500 mt-1">{t("admin.failed")}</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-red-100">
              <table className="w-full text-xs">
                <thead className="bg-red-50 border-b border-red-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-red-600 font-semibold">{t("admin.row")}</th>
                    <th className="px-3 py-2 text-left text-red-600 font-semibold">{t("admin.error")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50 bg-white">
                  {result.errors.map((err, i) => (
                    <tr key={i}><td className="px-3 py-2 font-mono text-gray-600">{err.row}</td><td className="px-3 py-2 text-gray-600">{err.message || err.error}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={clear} className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300">Upload Another File</button>
        </div>
      )}
    </div>
  );
};

// ── Unpublished Exams ─────────────────────────────────────────────────────────
const UnpublishedExams = ({ t, onPublished }) => {
  const [exams,     setExams]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [publishing,setPublishing]= useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const fetch = async () => {
    try {
      const res = await api.get("/admin/exams/unpublished");
      setExams(res.data?.data?.exams || res.data?.exams || res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handlePublish = async (id) => {
    setPublishing(id);
    try {
      await api.patch(`/admin/exams/${id}/publish`);
      setExams((p) => p.filter((e) => e._id !== id));
      onPublished?.();
    } catch (e) { console.error(e); }
    finally { setPublishing(null); setConfirmId(null); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">📋 {t("admin.unpublishedExams")}</h3>
        <span className="px-2.5 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">{exams.length}</span>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">{t("common.loading")}</div>
      ) : exams.length === 0 ? (
        <div className="p-8 text-center"><span className="text-4xl block mb-2">✅</span><p className="text-gray-400 text-sm">All exams are published</p></div>
      ) : (
        <div className="divide-y divide-gray-50">
          {exams.map((exam) => (
            <div key={exam._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 font-semibold text-sm truncate">{exam.title?.en || exam.title}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{exam.questionCount || exam.questions?.length || 0} Qs</span>
                  <span>·</span><span>{exam.duration} min</span>
                  {exam.type && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">{exam.type}</span>}
                </div>
              </div>
              {confirmId === exam._id ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => setConfirmId(null)} className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">{t("common.cancel")}</button>
                  <button onClick={() => handlePublish(exam._id)} disabled={publishing === exam._id}
                    className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg font-semibold disabled:opacity-60">
                    {publishing === exam._id ? "…" : "✓ Confirm"}
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(exam._id)}
                  className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all whitespace-nowrap">
                  🚀 {t("admin.publish")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Material Upload Form ──────────────────────────────────────────────────────
const MaterialUploadForm = ({ t, lang, onSuccess }) => {
  const blank = {
    titleEn:"", titleTa:"", descEn:"", descTa:"",
    category:"NOTES", subject:"", examGroups:["ALL"],
    year:"", isPremium:false, fileUrl:"", fileType:"PDF", tags:"",
  };
  const [form,     setForm]     = useState(blank);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleGroup = (g) => {
    setForm((f) => ({
      ...f,
      examGroups: f.examGroups.includes(g) ? f.examGroups.filter((x) => x !== g) : [...f.examGroups, g],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titleEn.trim() || !form.fileUrl.trim()) {
      setError("Title (EN) and File URL are required."); return;
    }
    setSaving(true); setError(null);
    try {
      await api.post("/materials", {
        titleEn:      form.titleEn,
        titleTa:      form.titleTa,
        descriptionEn:form.descEn,
        descriptionTa:form.descTa,
        category:     form.category,
        subject:      form.subject,
        examGroups:   form.examGroups,
        year:         form.year || undefined,
        isPremium:    form.isPremium,
        fileUrl:      form.fileUrl,
        fileType:     form.fileType,
        tags:         form.tags,
      });
      setSuccess(true);
      setForm(blank);
      onSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors bg-white";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className={cn("font-bold text-gray-800 mb-5", lang === "ta" && "font-tamil")}>
        📎 {t("admin.uploadMaterial")}
      </h3>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          ✅ {t("admin.uploadSuccess")}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Titles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t("admin.materialTitle")} *</label>
            <input value={form.titleEn} onChange={(e) => handleChange("titleEn", e.target.value)}
              placeholder="Material title in English" className={inputCls} />
          </div>
          <div>
            <label className={cn(labelCls, "font-tamil")}>{t("admin.materialTitleTa")}</label>
            <input value={form.titleTa} onChange={(e) => handleChange("titleTa", e.target.value)}
              placeholder="தமிழில் தலைப்பு" className={cn(inputCls, "font-tamil")} />
          </div>
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t("admin.materialDescEn")}</label>
            <textarea value={form.descEn} onChange={(e) => handleChange("descEn", e.target.value)}
              rows={2} placeholder="Description in English"
              className={cn(inputCls, "resize-none")} />
          </div>
          <div>
            <label className={cn(labelCls, "font-tamil")}>{t("admin.materialDescTa")}</label>
            <textarea value={form.descTa} onChange={(e) => handleChange("descTa", e.target.value)}
              rows={2} placeholder="தமிழில் விளக்கம்"
              className={cn(inputCls, "resize-none font-tamil")} />
          </div>
        </div>

        {/* Category + Subject + File Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t("admin.materialCategory")} *</label>
            <select value={form.category} onChange={(e) => handleChange("category", e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t("admin.materialSubject")}</label>
            <select value={form.subject} onChange={(e) => handleChange("subject", e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t("admin.materialFileType")}</label>
            <select value={form.fileType} onChange={(e) => handleChange("fileType", e.target.value)} className={inputCls}>
              {FILE_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Exam Groups */}
        <div>
          <label className={labelCls}>{t("admin.materialGroups")}</label>
          <div className="flex flex-wrap gap-2">
            {EXAM_GROUPS.map((g) => (
              <button key={g} type="button" onClick={() => toggleGroup(g)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                  form.examGroups.includes(g)
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                )}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Year (for PREVIOUS_PAPERS) */}
        {form.category === "PREVIOUS_PAPERS" && (
          <div className="w-40">
            <label className={labelCls}>{t("admin.materialYear")}</label>
            <input type="number" min="1990" max="2030" value={form.year}
              onChange={(e) => handleChange("year", e.target.value)}
              placeholder="e.g. 2023" className={inputCls} />
          </div>
        )}

        {/* File URL */}
        <div>
          <label className={labelCls}>{t("admin.materialFileUrl")} *</label>
          <input value={form.fileUrl} onChange={(e) => handleChange("fileUrl", e.target.value)}
            placeholder="https://..." className={inputCls} />
          <p className="text-gray-400 text-xs mt-1">Paste Google Drive, S3, or direct download URL</p>
        </div>

        {/* Tags + Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className={labelCls}>{t("admin.materialTags")}</label>
            <input value={form.tags} onChange={(e) => handleChange("tags", e.target.value)}
              placeholder="history, 2023, group1" className={inputCls} />
          </div>
          <div className="flex items-center gap-3 pb-1">
            <label className="text-sm font-semibold text-gray-700">{t("admin.materialPremium")}</label>
            <div onClick={() => handleChange("isPremium", !form.isPremium)}
              className={cn("w-11 h-6 rounded-full relative cursor-pointer transition-all",
                form.isPremium ? "bg-accent" : "bg-gray-300")}>
              <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                form.isPremium ? "left-5" : "left-0.5")} />
            </div>
            {form.isPremium && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">⭐ Premium</span>}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className={cn("w-full py-3 rounded-xl font-bold text-white text-sm transition-all mt-2",
            saving ? "bg-primary/50 cursor-not-allowed" : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md")}>
          {saving ? t("common.loading") : `📎 ${t("admin.uploadMaterial")}`}
        </button>
      </form>
    </div>
  );
};

// ── Materials List (Admin) ────────────────────────────────────────────────────
const MaterialsList = ({ t, lang, refreshKey }) => {
  const [materials, setMaterials] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting,  setDeleting]  = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/materials", { params: { limit: 50 } });
      const data = res.data?.data || res.data;
      setMaterials(data?.materials || data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [refreshKey]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/materials/${id}`);
      setMaterials((p) => p.filter((m) => m._id !== id));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); setConfirmId(null); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className={cn("font-bold text-gray-800", lang === "ta" && "font-tamil")}>
          📄 {t("admin.materialsList")}
        </h3>
        <span className="px-2.5 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">{materials.length}</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">{t("common.loading")}</div>
      ) : materials.length === 0 ? (
        <div className="p-8 text-center">
          <span className="text-4xl block mb-2">📭</span>
          <p className={cn("text-gray-400 text-sm", lang === "ta" && "font-tamil")}>{t("admin.noMaterials")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  t("admin.matTitle"),
                  t("admin.matCategory"),
                  t("admin.matSubject"),
                  t("admin.matDownloads"),
                  t("admin.matPremium"),
                  t("admin.matActions"),
                ].map((h) => (
                  <th key={h} className={cn("px-4 py-3 text-left text-xs font-semibold text-gray-500", lang === "ta" && "font-tamil")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {materials.map((m) => (
                <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className={cn("text-sm font-semibold text-gray-800 truncate", lang === "ta" && "font-tamil")}>
                      {lang === "ta" && m.title?.ta ? m.title.ta : m.title?.en || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100 font-semibold">
                      {m.category?.replace("_"," ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.subject || "—"}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{m.downloadCount ?? 0}</td>
                  <td className="px-4 py-3">
                    {m.isPremium
                      ? <span className="text-amber-500 font-bold text-sm">⭐</span>
                      : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {confirmId === m._id ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setConfirmId(null)}
                          className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg">{t("common.cancel")}</button>
                        <button onClick={() => handleDelete(m._id)} disabled={deleting === m._id}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg font-semibold disabled:opacity-60">
                          {deleting === m._id ? "…" : "✓"}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(m._id)}
                        className="px-2.5 py-1.5 text-xs bg-red-50 border border-red-200 text-red-500 rounded-lg hover:bg-red-100 transition-all font-semibold">
                        🗑 {t("admin.deleteMaterial")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Main AdminPage ────────────────────────────────────────────────────────────
const TABS = ["overview", "bulkUpload", "materials"];

const AdminPage = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [activeTab,    setActiveTab]   = useState("overview");
  const [stats,        setStats]       = useState(null);
  const [statsLoading, setStatsLoading]= useState(true);
  const [refreshKey,   setRefreshKey]  = useState(0);

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data?.data || res.data);
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [refreshKey]);

  const tabLabel = (key) => {
    if (key === "overview")   return `📊 ${t("admin.stats")}`;
    if (key === "bulkUpload") return `📤 ${t("admin.bulkUpload")}`;
    if (key === "materials")  return `📚 ${t("admin.materialsTab")}`;
    return key;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-dark px-4 pt-8 pb-16">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className={cn("text-2xl font-black text-white mb-1", lang === "ta" && "font-tamil")}>
              ⚙️ {t("admin.title")}
            </h1>
            <p className="text-white/40 text-sm">Manage your TNPSC platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/create-test")}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all"
            >
              ＋ {t("admin.createTest")}
            </button>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl border border-white/15"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12 space-y-5">
        {/* Tab bar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all",
                activeTab === tab
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-md"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Stats */}
            {statsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                        <div className="h-6 bg-gray-100 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AdminStatCard icon="👥" label={t("admin.totalUsers")}     value={stats?.totalUsers?.toLocaleString()}     color="bg-blue-50 border-blue-100" />
                <AdminStatCard icon="❓" label={t("admin.totalQuestions")} value={stats?.totalQuestions?.toLocaleString()} color="bg-green-50 border-green-100" />
                <AdminStatCard icon="📝" label={t("admin.totalExams")}     value={stats?.totalExams?.toLocaleString()}     color="bg-purple-50 border-purple-100" />
              </div>
            )}

            {/* Unpublished exams */}
            <UnpublishedExams t={t} onPublished={() => setRefreshKey((k) => k + 1)} />
          </div>
        )}

        {/* ── Bulk Upload Tab ── */}
        {activeTab === "bulkUpload" && <UploadZone t={t} />}

        {/* ── Materials Tab ── */}
        {activeTab === "materials" && (
          <div className="space-y-5">
            <MaterialUploadForm
              t={t}
              lang={lang}
              onSuccess={() => setRefreshKey((k) => k + 1)}
            />
            <MaterialsList t={t} lang={lang} refreshKey={refreshKey} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
