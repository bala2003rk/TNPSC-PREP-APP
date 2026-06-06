import { useCallback, useEffect, useRef, useState } from "react";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

const AdminStatCard = ({ icon, label, value, color }) => (
  <div className={cn("rounded-2xl border p-5 flex items-center gap-4", color)}>
    <div className="text-3xl">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value ?? "—"}</p>
    </div>
  </div>
);

const UploadZone = ({ t, lang, onUpload }) => {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  }, []);

  const validateAndSet = (f) => {
    if (!f.name.match(/\.(xlsx?|csv)$/i)) {
      setUploadError("Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    setUploadError(null);
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setUploadError(null);
    try {
      const res = await api.post("/admin/questions/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      onUpload?.();
    } catch (err) {
      setUploadError(err.response?.data?.message || t("admin.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setResult(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className={cn("font-bold text-gray-800 mb-5", lang === "ta" && "font-tamil")}>
        📤 {t("admin.bulkUpload")}
      </h3>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer",
          dragging ? "border-primary bg-primary/5"
            : file ? "border-green-400 bg-green-50 cursor-default"
            : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
        )}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => e.target.files[0] && validateAndSet(e.target.files[0])} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">📊</div>
            <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
            <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
            <button onClick={(e) => { e.stopPropagation(); handleClear(); }} className="text-xs text-red-400 hover:text-red-600 mt-1">✕ Remove</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">📁</div>
            <div>
              <p className={cn("text-gray-600 text-sm font-medium", lang === "ta" && "font-tamil")}>{t("admin.dragDrop")}</p>
              <p className={cn("text-gray-400 text-xs mt-1", lang === "ta" && "font-tamil")}>{t("admin.orBrowse")} · Excel, CSV</p>
            </div>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{uploadError}</div>
      )}

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
              <div className="text-3xl font-black text-green-600">{result.summary?.inserted ?? 0}</div>
              <div className="text-xs text-green-600 mt-1">{t("admin.inserted")}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-red-500">{result.summary?.failed ?? 0}</div>
              <div className="text-xs text-red-500 mt-1">{t("admin.failed")}</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{t("admin.errorRows")}</h4>
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
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-gray-600">{err.row}</td>
                        <td className="px-3 py-2 text-gray-600">{Array.isArray(err.errors) ? err.errors.join(', ') : err.message || 'Validation failed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <button onClick={handleClear} className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300 transition-all">
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
};

const UnpublishedExams = ({ t, lang, onPublished }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    api.get("/admin/exams/unpublished")
      .then(res => setExams(res.data?.exams || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePublish = async (examId) => {
    setPublishing(examId);
    try {
      await api.post(`/admin/exams/${examId}/publish`);
      setExams(prev => prev.filter(e => e._id !== examId));
      onPublished?.();
    } catch (e) { console.error(e); }
    finally { setPublishing(null); setConfirmId(null); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className={cn("font-bold text-gray-800", lang === "ta" && "font-tamil")}>📋 {t("admin.unpublishedExams")}</h3>
        <span className="px-2.5 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">{exams.length}</span>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">{t("common.loading")}</div>
      ) : exams.length === 0 ? (
        <div className="p-8 text-center"><span className="text-4xl block mb-2">✅</span><p className="text-gray-400 text-sm">All exams are published</p></div>
      ) : (
        <div className="divide-y divide-gray-50">
          {exams.map(exam => (
            <div key={exam._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className={cn("text-gray-800 font-semibold text-sm truncate", lang === "ta" && "font-tamil")}>
                  {lang === "ta" && exam.title_ta ? exam.title_ta : exam.title?.en || exam.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-400 text-xs">{exam.totalQuestions} Qs</span>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-gray-400 text-xs">{exam.duration} min</span>
                  {exam.type && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100">{exam.type}</span>}
                </div>
              </div>
              {confirmId === exam._id ? (
                <div className="flex gap-2">
                  <button onClick={() => setConfirmId(null)} className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">{t("common.cancel")}</button>
                  <button onClick={() => handlePublish(exam._id)} disabled={publishing === exam._id}
                    className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg font-semibold disabled:opacity-60">
                    {publishing === exam._id ? "..." : "✓ Confirm"}
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

const QuestionList = ({ lang, refreshKey }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchQ = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/questions?page=${page}&limit=10`);
        setQuestions(res.data.questions || []);
        setTotal(res.data.total || 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchQ();
  }, [page, refreshKey]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">❓ Question Bank</h3>
        <span className="px-2.5 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">{total} total</span>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : questions.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No questions found</div>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {questions.map((q, i) => (
              <div key={i} className="px-5 py-3 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full flex-shrink-0 mt-0.5">{q.subject}</span>
                  <p className="text-gray-800 text-sm flex-1">
                    {lang === "ta" && q.questionText?.ta ? q.questionText.ta : q.questionText?.en || q.questionText}
                  </p>
                </div>
                <p className="text-gray-400 text-xs mt-1 ml-16">{q.unit} · {q.difficulty}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:border-gray-300">← Prev</button>
            <span className="text-gray-400 text-xs">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={questions.length < 10}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:border-gray-300">Next →</button>
          </div>
        </>
      )}
    </div>
  );
};

const AdminPage = () => {
  const { t, lang } = useTranslation();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get("/admin/stats")
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, [refreshKey]);

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-dark px-4 pt-8 pb-12">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className={cn("text-2xl font-black text-white mb-1", lang === "ta" && "font-tamil")}>⚙️ {t("admin.title")}</h1>
            <p className="text-white/40 text-sm">Manage your TNPSC platform</p>
          </div>
          <button onClick={handleRefresh} className="p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl border border-white/15 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">{t("admin.stats")}</h2>
          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AdminStatCard icon="👥" label={t("admin.totalUsers")}     value={stats?.stats?.[0]?.count ?? stats?.totalUsers ?? "—"} color="bg-blue-50 border-blue-100" />
              <AdminStatCard icon="❓" label={t("admin.totalQuestions")} value={stats?.questions ?? stats?.totalQuestions ?? "—"}      color="bg-green-50 border-green-100" />
              <AdminStatCard icon="📝" label={t("admin.totalExams")}     value={stats?.exams ?? stats?.totalExams ?? "—"}              color="bg-purple-50 border-purple-100" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UploadZone t={t} lang={lang} onUpload={handleRefresh} />
          <UnpublishedExams t={t} lang={lang} onPublished={handleRefresh} />
        </div>

        <QuestionList lang={lang} refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default AdminPage;

// import { useCallback, useEffect, useRef, useState } from "react";
// import api from "../utils/api";
// import useTranslation from "../hooks/useTranslation";
// import { cn } from "../utils/cn";

// // ── Stat Card ──────────────────────────────────────────────────────────────────
// const AdminStatCard = ({ icon, label, value, color }) => (
//   <div className={cn("rounded-2xl border p-5 flex items-center gap-4", color)}>
//     <div className="text-3xl">{icon}</div>
//     <div>
//       <p className="text-sm text-gray-500">{label}</p>
//       <p className="text-2xl font-black text-gray-900">{value ?? "—"}</p>
//     </div>
//   </div>
// );

// // ── Upload Zone ────────────────────────────────────────────────────────────────
// const UploadZone = ({ t, lang, onUpload }) => {
//   const [dragging, setDragging] = useState(false);
//   const [file, setFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [result, setResult] = useState(null);
//   const [uploadError, setUploadError] = useState(null);
//   const inputRef = useRef(null);

//   const handleDrop = useCallback((e) => {
//     e.preventDefault();
//     setDragging(false);
//     const dropped = e.dataTransfer.files[0];
//     if (dropped) validateAndSet(dropped);
//   }, []);

//   const handleDragOver = (e) => {
//     e.preventDefault();
//     setDragging(true);
//   };

//   const handleDragLeave = () => setDragging(false);

//   const validateAndSet = (f) => {
//     const validTypes = [
//       "application/vnd.ms-excel",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//       "text/csv",
//     ];
//     if (!validTypes.includes(f.type) && !f.name.match(/\.(xlsx?|csv)$/i)) {
//       setUploadError("Please upload an Excel (.xlsx, .xls) or CSV file.");
//       return;
//     }
//     setUploadError(null);
//     setFile(f);
//     setResult(null);
//   };

//   const handleUpload = async () => {
//     if (!file) return;
//     const formData = new FormData();
//     formData.append("file", file);
//     setUploading(true);
//     setUploadError(null);
//     try {
//       const res = await api.post("/admin/questions/bulk-upload", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setResult(res.data);
//       onUpload?.();
//     } catch (err) {
//       setUploadError(err.response?.data?.message || t("admin.uploadFailed"));
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleClear = () => {
//     setFile(null);
//     setResult(null);
//     setUploadError(null);
//     if (inputRef.current) inputRef.current.value = "";
//   };

//   return (
//     <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
//       <h3 className={cn("font-bold text-gray-800 mb-5", lang === "ta" && "font-tamil")}>
//         📤 {t("admin.bulkUpload")}
//       </h3>

//       {/* Drop zone */}
//       <div
//         onDrop={handleDrop}
//         onDragOver={handleDragOver}
//         onDragLeave={handleDragLeave}
//         onClick={() => !file && inputRef.current?.click()}
//         className={cn(
//           "border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer",
//           dragging
//             ? "border-primary bg-primary/5"
//             : file
//             ? "border-green-400 bg-green-50 cursor-default"
//             : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
//         )}
//       >
//         <input
//           ref={inputRef}
//           type="file"
//           accept=".xlsx,.xls,.csv"
//           className="hidden"
//           onChange={(e) => e.target.files[0] && validateAndSet(e.target.files[0])}
//         />
//         {file ? (
//           <div className="flex flex-col items-center gap-2">
//             <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">📊</div>
//             <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
//             <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
//             <button
//               onClick={(e) => { e.stopPropagation(); handleClear(); }}
//               className="text-xs text-red-400 hover:text-red-600 mt-1"
//             >
//               ✕ Remove
//             </button>
//           </div>
//         ) : (
//           <div className="flex flex-col items-center gap-3">
//             <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">📁</div>
//             <div>
//               <p className={cn("text-gray-600 text-sm font-medium", lang === "ta" && "font-tamil")}>
//                 {t("admin.dragDrop")}
//               </p>
//               <p className={cn("text-gray-400 text-xs mt-1", lang === "ta" && "font-tamil")}>
//                 {t("admin.orBrowse")} · Excel, CSV
//               </p>
//             </div>
//           </div>
//         )}
//       </div>

//       {uploadError && (
//         <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
//           {uploadError}
//         </div>
//       )}

//       {file && !result && (
//         <button
//           onClick={handleUpload}
//           disabled={uploading}
//           className={cn(
//             "mt-4 w-full py-3 rounded-xl font-bold text-white text-sm transition-all",
//             uploading
//               ? "bg-primary/50 cursor-not-allowed"
//               : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md"
//           )}
//         >
//           {uploading ? `⏳ ${t("admin.uploading")}` : `📤 ${t("admin.bulkUpload")}`}
//         </button>
//       )}

//       {/* Upload Result */}
//       {result && (
//         <div className="mt-5 space-y-4">
//           <div className="grid grid-cols-2 gap-3">
//             <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
//               <div className="text-3xl font-black text-green-600">{result.summary?.inserted ?? result.inserted ?? 0}</div>
//               <div className={cn("text-xs text-green-600 mt-1", lang === "ta" && "font-tamil")}>{t("admin.inserted")}</div>
//             </div>
//             <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
//               <div className="text-3xl font-black text-red-500">{result.summary?.failed ?? result.failed ?? 0}</div>
//               <div className={cn("text-xs text-red-500 mt-1", lang === "ta" && "font-tamil")}>{t("admin.failed")}</div>
//             </div>
//           </div>

//           {result.errors?.length > 0 && (
//             <div>
//               <h4 className={cn("text-sm font-semibold text-gray-700 mb-2", lang === "ta" && "font-tamil")}>
//                 {t("admin.errorRows")}
//               </h4>
//               <div className="overflow-x-auto rounded-xl border border-red-100">
//                 <table className="w-full text-xs">
//                   <thead className="bg-red-50 border-b border-red-100">
//                     <tr>
//                       <th className="px-3 py-2 text-left text-red-600 font-semibold">{t("admin.row")}</th>
//                       <th className="px-3 py-2 text-left text-red-600 font-semibold">{t("admin.error")}</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-red-50 bg-white">
//                     {result.errors.map((err, i) => (
//                       <tr key={i}>
//                         <td className="px-3 py-2 font-mono text-gray-600">{err.row}</td>
//                         <td className="px-3 py-2 text-gray-600">{err.message || err.error || (Array.isArray(err.errors) ? err.errors.join(', ') : 'Validation failed')}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}

//           <button
//             onClick={handleClear}
//             className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300 hover:text-gray-700 transition-all"
//           >
//             Upload Another File
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// // ── Unpublished Exams ──────────────────────────────────────────────────────────
// const UnpublishedExams = ({ t, lang, onPublished }) => {
//   const [exams, setExams] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [publishing, setPublishing] = useState(null);
//   const [confirmId, setConfirmId] = useState(null);

//   const fetchUnpublished = async () => {
//     try {
//       const res = await api.get("/admin/exams/unpublished");
//       setExams(res.data?.exams || res.data || []);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchUnpublished();
//   }, []);

//   const handlePublish = async (examId) => {
//     setPublishing(examId);
//     try {
//       await api.patch(`/admin/exams/${examId}/publish`);
//       setExams((prev) => prev.filter((e) => e._id !== examId));
//       onPublished?.();
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setPublishing(null);
//       setConfirmId(null);
//     }
//   };

//   return (
//     <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
//       <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
//         <h3 className={cn("font-bold text-gray-800", lang === "ta" && "font-tamil")}>
//           📋 {t("admin.unpublishedExams")}
//         </h3>
//         <span className="px-2.5 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
//           {exams.length}
//         </span>
//       </div>

//       {loading ? (
//         <div className="p-8 text-center text-gray-400 text-sm">{t("common.loading")}</div>
//       ) : exams.length === 0 ? (
//         <div className="p-8 text-center">
//           <span className="text-4xl block mb-2">✅</span>
//           <p className="text-gray-400 text-sm">All exams are published</p>
//         </div>
//       ) : (
//         <div className="divide-y divide-gray-50">
//           {exams.map((exam) => (
//             <div key={exam._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
//               <div className="flex-1 min-w-0">
//                 <p className={cn("text-gray-800 font-semibold text-sm truncate", lang === "ta" && "font-tamil")}>
//                   {lang === "ta" && exam.title_ta ? exam.title_ta : exam.title}
//                 </p>
//                 <div className="flex items-center gap-3 mt-1">
//                   <span className="text-gray-400 text-xs">{exam.questionCount} Qs</span>
//                   <span className="text-gray-400 text-xs">·</span>
//                   <span className="text-gray-400 text-xs">{exam.duration} min</span>
//                   {exam.type && (
//                     <>
//                       <span className="text-gray-400 text-xs">·</span>
//                       <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100">
//                         {exam.type}
//                       </span>
//                     </>
//                   )}
//                 </div>
//               </div>

//               {confirmId === exam._id ? (
//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => setConfirmId(null)}
//                     className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300"
//                   >
//                     {t("common.cancel")}
//                   </button>
//                   <button
//                     onClick={() => handlePublish(exam._id)}
//                     disabled={publishing === exam._id}
//                     className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold disabled:opacity-60"
//                   >
//                     {publishing === exam._id ? "..." : "✓ Confirm"}
//                   </button>
//                 </div>
//               ) : (
//                 <button
//                   onClick={() => setConfirmId(exam._id)}
//                   className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all whitespace-nowrap"
//                 >
//                   🚀 {t("admin.publish")}
//                 </button>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// // ── Main AdminPage ─────────────────────────────────────────────────────────────
// const AdminPage = () => {
//   const { t, lang } = useTranslation();
//   const [stats, setStats] = useState(null);
//   const [statsLoading, setStatsLoading] = useState(true);
//   const [refreshKey, setRefreshKey] = useState(0);

//   const fetchStats = async () => {
//     try {
//       const res = await api.get("/admin/stats");
//       setStats(res.data);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setStatsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchStats();
//   }, [refreshKey]);

//   const handleRefresh = () => setRefreshKey((k) => k + 1);

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-dark px-4 pt-8 pb-12">
//         <div className="max-w-5xl mx-auto flex items-center justify-between">
//           <div>
//             <h1 className={cn("text-2xl font-black text-white mb-1", lang === "ta" && "font-tamil")}>
//               ⚙️ {t("admin.title")}
//             </h1>
//             <p className="text-white/40 text-sm">Manage your TNPSC platform</p>
//           </div>
//           <button
//             onClick={handleRefresh}
//             className="p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl border border-white/15 transition-colors"
//             title="Refresh"
//           >
//             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//             </svg>
//           </button>
//         </div>
//       </div>

//       <div className="max-w-5xl mx-auto px-4 -mt-6 pb-12 space-y-6">
//         {/* Platform Stats */}
//         <div>
//           <h2 className={cn("text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide", lang === "ta" && "font-tamil")}>
//             {t("admin.stats")}
//           </h2>
//           {statsLoading ? (
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//               {[...Array(3)].map((_, i) => (
//                 <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
//                   <div className="flex gap-4 items-center">
//                     <div className="w-10 h-10 bg-gray-100 rounded-xl" />
//                     <div className="flex-1 space-y-2">
//                       <div className="h-3 bg-gray-100 rounded w-2/3" />
//                       <div className="h-6 bg-gray-100 rounded w-1/3" />
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//               <AdminStatCard
//                 icon="👥"
//                 label={t("admin.totalUsers")}
//                 value={stats?.totalUsers?.toLocaleString()}
//                 color="bg-blue-50 border-blue-100"
//               />
//               <AdminStatCard
//                 icon="❓"
//                 label={t("admin.totalQuestions")}
//                 value={stats?.totalQuestions?.toLocaleString()}
//                 color="bg-green-50 border-green-100"
//               />
//               <AdminStatCard
//                 icon="📝"
//                 label={t("admin.totalExams")}
//                 value={stats?.totalExams?.toLocaleString()}
//                 color="bg-purple-50 border-purple-100"
//               />
//             </div>
//           )}
//         </div>

//         {/* Main content grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           <UploadZone t={t} lang={lang} onUpload={handleRefresh} />
//           <UnpublishedExams t={t} lang={lang} onPublished={handleRefresh} />
//         </div>
//         <QuestionList lang={lang} refreshKey={refreshKey} />
//       </div>
//     </div>
//   );
// };
// const QuestionList = ({ t, lang, refreshKey }) => {
//   const [questions, setQuestions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [total, setTotal] = useState(0);

//   useEffect(() => {
//     const fetch = async () => {
//       try {
//         setLoading(true);
//         const res = await api.get(`/questions?page=${page}&limit=10`);
//         setQuestions(res.data.questions || []);
//         setTotal(res.data.total || 0);
//       } catch (e) { console.error(e); }
//       finally { setLoading(false); }
//     };
//     fetch();
//   }, [page, refreshKey]);

//   return (
//     <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
//       <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
//         <h3 className="font-bold text-gray-800">❓ Question Bank</h3>
//         <span className="px-2.5 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
//           {total} total
//         </span>
//       </div>

//       {loading ? (
//         <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
//       ) : questions.length === 0 ? (
//         <div className="p-8 text-center text-gray-400 text-sm">No questions found</div>
//       ) : (
//         <>
//           <div className="divide-y divide-gray-50">
//             {questions.map((q, i) => (
//               <div key={i} className="px-5 py-3 hover:bg-gray-50">
//                 <div className="flex items-start gap-3">
//                   <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full flex-shrink-0 mt-0.5">
//                     {q.subject}
//                   </span>
//                   <p className="text-gray-800 text-sm flex-1">{q.questionText}</p>
//                 </div>
//                 <p className="text-gray-400 text-xs mt-1 ml-16">{q.unit} · {q.difficulty}</p>
//               </div>
//             ))}
//           </div>

//           {/* Pagination */}
//           <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
//             <button
//               onClick={() => setPage(p => Math.max(1, p - 1))}
//               disabled={page === 1}
//               className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:border-gray-300"
//             >
//               ← Prev
//             </button>
//             <span className="text-gray-400 text-xs">Page {page}</span>
//             <button
//               onClick={() => setPage(p => p + 1)}
//               disabled={questions.length < 10}
//               className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:border-gray-300"
//             >
//               Next →
//             </button>
//           </div>
//           {/* After the existing grid div */}
// <QuestionList t={t} lang={lang} refreshKey={refreshKey} />
//         </>
//       )}
//     </div>
//   );
// };
// {/* After the existing grid div */}
// {/* <QuestionList t={t} lang={lang} refreshKey={refreshKey} /> */}
// export default AdminPage;
