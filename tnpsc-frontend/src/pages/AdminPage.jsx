import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────
const SUBJECTS = [
  "HISTORY","GEOGRAPHY","POLITY","ECONOMICS","SCIENCE",
  "ENVIRONMENT","CURRENT_AFFAIRS","APTITUDE","TAMIL","ENGLISH","GK",
];
const DIFFICULTIES  = ["EASY","MEDIUM","HARD"];
const EXAM_GROUPS   = ["GROUP_1","GROUP_2","GROUP_2A","GROUP_4","VAO","ALL"];
const CORRECT_OPTS  = ["A","B","C","D"];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Stats Overview
// ─────────────────────────────────────────────────────────────────────────────
const StatsSection = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then(r => setStats(r.data?.data || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { icon:"👥", label:"Total Users",     value: stats?.totalUsers,     color:"bg-blue-50 border-blue-100" },
    { icon:"❓", label:"Total Questions",  value: stats?.totalQuestions, color:"bg-green-50 border-green-100" },
    { icon:"📝", label:"Total Exams",      value: stats?.totalExams,     color:"bg-purple-50 border-purple-100" },
    { icon:"🏃", label:"Total Attempts",   value: stats?.totalAttempts,  color:"bg-orange-50 border-orange-100" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-800">Platform Overview</h2>
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ icon, label, value, color }) => (
            <div key={label} className={cn("rounded-2xl border p-5", color)}>
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl font-black text-gray-900">{value?.toLocaleString() ?? "—"}</div>
              <div className="text-gray-500 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Subject breakdown */}
      {stats?.subjectBreakdown?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm">Questions by Subject</h3>
          </div>
          <div className="p-5 space-y-3">
            {stats.subjectBreakdown.map(({ _id, count }) => {
              const pct = Math.round((count / stats.totalQuestions) * 100);
              return (
                <div key={_id} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600 w-28 truncate">{_id}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width:`${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Question Management
// ─────────────────────────────────────────────────────────────────────────────

// ── Question Form (Add / Edit) ────────────────────────────────────────────────
const QuestionForm = ({ initial, onSave, onCancel }) => {
  const blank = {
    questionText_en:"", questionText_ta:"",
    option_A_en:"", option_A_ta:"",
    option_B_en:"", option_B_ta:"",
    option_C_en:"", option_C_ta:"",
    option_D_en:"", option_D_ta:"",
    correctOption:"A", subject:"HISTORY", unit:"", difficulty:"MEDIUM",
    examGroups:["ALL"], isPYQ:false, pyqYear:"",
    explanation_en:"", explanation_ta:"",
  };

  const [form,    setForm]    = useState(initial || blank);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [showTa,  setShowTa]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleGroup = (g) => {
    setForm(f => ({
      ...f,
      examGroups: f.examGroups.includes(g)
        ? f.examGroups.filter(x => x !== g)
        : [...f.examGroups, g],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800 placeholder-gray-400";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* Language toggle */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setShowTa(false)}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
            !showTa ? "bg-primary text-white border-primary" : "bg-gray-50 text-gray-500 border-gray-200")}>
          English
        </button>
        <button type="button" onClick={() => setShowTa(true)}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border font-tamil transition-all",
            showTa ? "bg-primary text-white border-primary" : "bg-gray-50 text-gray-500 border-gray-200")}>
          தமிழ்
        </button>
        <span className="text-gray-400 text-xs ml-2">
          {showTa ? "Enter Tamil translations (optional)" : "Enter English content (required)"}
        </span>
      </div>

      {/* Question text */}
      <div>
        <label className={lbl}>
          Question Text {!showTa && <span className="text-red-400">*</span>}
        </label>
        <textarea
          value={showTa ? form.questionText_ta : form.questionText_en}
          onChange={e => set(showTa ? "questionText_ta" : "questionText_en", e.target.value)}
          rows={3} required={!showTa}
          placeholder={showTa ? "தமிழில் கேள்வியை உள்ளிடவும்" : "Enter question in English"}
          className={cn(inp, "resize-none", showTa && "font-tamil")}
        />
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className={lbl}>Options {!showTa && <span className="text-red-400">*</span>}</label>
        {CORRECT_OPTS.map(opt => (
          <div key={opt} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 cursor-pointer border-2 transition-all",
              form.correctOption === opt
                ? "bg-green-500 border-green-500 text-white"
                : "border-gray-300 text-gray-400 hover:border-green-400"
            )} onClick={() => set("correctOption", opt)} title="Click to set as correct answer">
              {opt}
            </div>
            <input
              value={showTa ? form[`option_${opt}_ta`] : form[`option_${opt}_en`]}
              onChange={e => set(showTa ? `option_${opt}_ta` : `option_${opt}_en`, e.target.value)}
              required={!showTa}
              placeholder={showTa ? `விருப்பம் ${opt} (தமிழ்)` : `Option ${opt}`}
              className={cn(inp, "flex-1", showTa && "font-tamil")}
            />
            {form.correctOption === opt && (
              <span className="text-green-500 text-xs font-bold flex-shrink-0">✓ Correct</span>
            )}
          </div>
        ))}
        <p className="text-gray-400 text-xs">Click the letter circle to set correct answer</p>
      </div>

      {/* Metadata row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className={lbl}>Subject *</label>
          <select value={form.subject} onChange={e => set("subject", e.target.value)}
            className={cn(inp)}>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Unit</label>
          <input value={form.unit} onChange={e => set("unit", e.target.value)}
            placeholder="e.g. Maurya Empire" className={inp} />
        </div>
        <div>
          <label className={lbl}>Difficulty</label>
          <select value={form.difficulty} onChange={e => set("difficulty", e.target.value)}
            className={inp}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Exam Groups */}
      <div>
        <label className={lbl}>Exam Groups</label>
        <div className="flex flex-wrap gap-2">
          {EXAM_GROUPS.map(g => (
            <button key={g} type="button" onClick={() => toggleGroup(g)}
              className={cn("px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                form.examGroups.includes(g)
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300")}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* PYQ */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => set("isPYQ", !form.isPYQ)}
            className={cn("w-10 h-5 rounded-full relative transition-all cursor-pointer",
              form.isPYQ ? "bg-primary" : "bg-gray-300")}>
            <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
              form.isPYQ ? "left-5" : "left-0.5")} />
          </div>
          <span className="text-sm text-gray-700 font-medium">Previous Year Question</span>
        </label>
        {form.isPYQ && (
          <input type="number" value={form.pyqYear} onChange={e => set("pyqYear", e.target.value)}
            placeholder="Year e.g. 2022" min="1990" max="2030"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-32 text-gray-800 focus:outline-none focus:border-primary" />
        )}
      </div>

      {/* Explanation */}
      <div>
        <label className={lbl}>Explanation (optional)</label>
        <textarea
          value={showTa ? form.explanation_ta : form.explanation_en}
          onChange={e => set(showTa ? "explanation_ta" : "explanation_en", e.target.value)}
          rows={2} placeholder={showTa ? "தமிழில் விளக்கம்" : "Explanation in English"}
          className={cn(inp, "resize-none", showTa && "font-tamil")}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className={cn("flex-1 py-2.5 rounded-xl font-bold text-white text-sm transition-all",
            saving ? "bg-primary/50 cursor-not-allowed" : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md")}>
          {saving ? "Saving..." : initial ? "Update Question" : "Add Question"}
        </button>
      </div>
    </form>
  );
};

// ── Bulk Upload ────────────────────────────────────────────────────────────────
const BulkUpload = () => {
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef(null);

  const validate = (f) => {
    if (!f.name.match(/\.(xlsx?|csv)$/i)) { setError("Only Excel or CSV files allowed"); return; }
    setError(null); setFile(f); setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true); setError(null);
    try {
      const res = await api.post("/admin/questions/bulk-upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Template download hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">📋 Required Excel Column Headers:</p>
        <p className="font-mono text-xs bg-white border border-blue-100 rounded-lg px-3 py-2 mt-2 overflow-x-auto whitespace-nowrap">
          questionText_en | option_A_en | option_B_en | option_C_en | option_D_en | correctOption | subject | unit | difficulty | examGroups | isPYQ
        </p>
        <p className="text-xs mt-2 text-blue-600">
          Optional: questionText_ta, option_A_ta…D_ta, explanation_en, explanation_ta, pyqYear
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={e => { e.preventDefault(); setDragging(false); e.dataTransfer.files[0] && validate(e.dataTransfer.files[0]); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !file && inputRef.current?.click()}
        className={cn("border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
          dragging ? "border-primary bg-primary/5" :
          file ? "border-green-400 bg-green-50 cursor-default" :
          "border-gray-200 hover:border-primary/50 hover:bg-gray-50")}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => e.target.files[0] && validate(e.target.files[0])} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📊</span>
            <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
            <p className="text-gray-400 text-xs">{(file.size/1024).toFixed(1)} KB</p>
            <button onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="text-xs text-red-400 hover:text-red-600">✕ Remove</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">📁</span>
            <p className="text-gray-600 text-sm font-medium">Drag & drop Excel/CSV here</p>
            <p className="text-gray-400 text-xs">or click to browse</p>
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      {file && !result && (
        <button onClick={handleUpload} disabled={uploading}
          className={cn("w-full py-3 rounded-xl font-bold text-white text-sm transition-all",
            uploading ? "bg-primary/50 cursor-not-allowed" : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md")}>
          {uploading ? "⏳ Uploading..." : "📤 Upload Questions"}
        </button>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-green-600">{result.inserted}</div>
              <div className="text-xs text-green-600 mt-1">Inserted</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-red-500">{result.failed}</div>
              <div className="text-xs text-red-500 mt-1">Failed</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-gray-700">{result.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Rows</div>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-red-100">
              <table className="w-full text-xs">
                <thead className="bg-red-50 border-b border-red-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-red-600 font-semibold">Row</th>
                    <th className="px-3 py-2 text-left text-red-600 font-semibold">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50 bg-white">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-gray-600">{e.row}</td>
                      <td className="px-3 py-2 text-gray-600">{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => { setFile(null); setResult(null); }}
            className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:border-gray-300">
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
};

// ── Questions Section ─────────────────────────────────────────────────────────
const QuestionsSection = () => {
  const [view,        setView]        = useState("list"); // list | add | edit | bulk
  const [questions,   setQuestions]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editTarget,  setEditTarget]  = useState(null);
  const [filters,     setFilters]     = useState({ subject:"", difficulty:"", search:"" });
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [deleting,    setDeleting]    = useState(null);
  const [confirmDel,  setConfirmDel]  = useState(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filters.subject)    params.subject    = filters.subject;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search)     params.search     = filters.search;
      const res  = await api.get("/admin/questions", { params });
      const data = res.data?.data || res.data;
      setQuestions(data?.questions || []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotal(data?.pagination?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleSaveNew = async (form) => {
    await api.post("/admin/questions", form);
    setView("list");
    fetchQuestions();
  };

  const handleSaveEdit = async (form) => {
    await api.patch(`/admin/questions/${editTarget._id}`, form);
    setView("list");
    setEditTarget(null);
    fetchQuestions();
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/admin/questions/${id}`);
      setQuestions(prev => prev.filter(q => q._id !== id));
      setTotal(t => t - 1);
    } catch (e) { console.error(e); }
    finally { setDeleting(null); setConfirmDel(null); }
  };

  const handleEdit = async (q) => {
    // Fetch full question with all fields
    const res = await api.get(`/admin/questions/${q._id}`);
    const full = res.data?.data;
    const opts = full.options || [];
    setEditTarget({
      ...full,
      questionText_en: full.questionText?.en || "",
      questionText_ta: full.questionText?.ta || "",
      option_A_en: opts[0]?.text?.en || "", option_A_ta: opts[0]?.text?.ta || "",
      option_B_en: opts[1]?.text?.en || "", option_B_ta: opts[1]?.text?.ta || "",
      option_C_en: opts[2]?.text?.en || "", option_C_ta: opts[2]?.text?.ta || "",
      option_D_en: opts[3]?.text?.en || "", option_D_ta: opts[3]?.text?.ta || "",
      explanation_en: full.explanation?.en || "",
      explanation_ta: full.explanation?.ta || "",
      examGroups: full.examGroups || ["ALL"],
    });
    setView("edit");
  };

  const diffColor = (d) =>
    d === "EASY"   ? "bg-green-100 text-green-700 border-green-200" :
    d === "HARD"   ? "bg-red-100 text-red-700 border-red-200" :
                     "bg-yellow-100 text-yellow-700 border-yellow-200";

  // Sub-nav
  const subNav = [
    { key:"list", label:"All Questions" },
    { key:"add",  label:"+ Add Question" },
    { key:"bulk", label:"📤 Bulk Upload" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-800">Question Bank</h2>
        <span className="text-gray-400 text-sm">{total} questions</span>
      </div>

      {/* Sub nav */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {subNav.map(({ key, label }) => (
          <button key={key} onClick={() => { setView(key); setEditTarget(null); }}
            className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
              view === key ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700")}>
            {label}
          </button>
        ))}
      </div>

      {/* List view */}
      {(view === "list" || view === "edit") && view !== "edit" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filters.subject}
              onChange={e => { setFilters(f => ({ ...f, subject:e.target.value })); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-700 focus:outline-none focus:border-primary">
              <option value="">All Subjects</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.difficulty}
              onChange={e => { setFilters(f => ({ ...f, difficulty:e.target.value })); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-700 focus:outline-none focus:border-primary">
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search:e.target.value })); setPage(1); }}
              placeholder="Search questions..."
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary flex-1 min-w-32" />
            <button onClick={() => { setFilters({ subject:"", difficulty:"", search:"" }); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:border-gray-300">
              Reset
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_,i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-sm">No questions found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Question</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Difficulty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Correct</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {questions.map((q, idx) => (
                      <tr key={q._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {(page - 1) * 15 + idx + 1}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-gray-800 line-clamp-2">
                            {q.questionText?.en || "—"}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{q.unit}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full border border-blue-100 font-semibold">
                            {q.subject}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 text-[10px] rounded-full border font-semibold", diffColor(q.difficulty))}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-black flex items-center justify-center">
                            {q.correctOption}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleEdit(q)}
                              className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-xs rounded-lg hover:bg-blue-100 font-semibold">
                              ✏️ Edit
                            </button>
                            {confirmDel === q._id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => setConfirmDel(null)}
                                  className="px-2 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg">✕</button>
                                <button onClick={() => handleDelete(q._id)} disabled={deleting === q._id}
                                  className="px-2 py-1.5 bg-red-500 text-white text-xs rounded-lg font-semibold disabled:opacity-60">
                                  {deleting === q._id ? "…" : "✓"}
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDel(q._id)}
                                className="px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-500 text-xs rounded-lg hover:bg-red-100 font-semibold">
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40">←</button>
                  <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40">→</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Question */}
      {view === "add" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-5">Add New Question</h3>
          <QuestionForm onSave={handleSaveNew} onCancel={() => setView("list")} />
        </div>
      )}

      {/* Edit Question */}
      {view === "edit" && editTarget && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-5">Edit Question</h3>
          <QuestionForm initial={editTarget} onSave={handleSaveEdit}
            onCancel={() => { setView("list"); setEditTarget(null); }} />
        </div>
      )}

      {/* Bulk Upload */}
      {view === "bulk" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-5">Bulk Upload Questions</h3>
          <BulkUpload />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: User Management
// ─────────────────────────────────────────────────────────────────────────────
const UsersSection = () => {
  const { user: me } = useSelector(s => s.auth);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [totalPages,setTotalPages] = useState(1);
  const [updating,setUpdating]= useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await api.get("/admin/users", { params: { search, page, limit:15 } });
      const data = res.data?.data || res.data;
      setUsers(data?.users || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "student" : "admin";
    setUpdating(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (e) { console.error(e); }
    finally { setUpdating(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-800">Manage Users</h2>
      </div>

      {/* Search */}
      <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by name or email..."
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800 placeholder-gray-400" />

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_,i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Name","Email","Role","Joined","Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border",
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-700 border-purple-200"
                          : "bg-blue-100 text-blue-700 border-blue-200")}>
                        {u.role === "admin" ? "👑 Admin" : "👤 Student"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      {u._id === me?._id ? (
                        <span className="text-xs text-gray-300 italic">You</span>
                      ) : (
                        <button
                          onClick={() => handleRoleToggle(u._id, u.role)}
                          disabled={updating === u._id}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-60",
                            u.role === "admin"
                              ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                              : "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100")}>
                          {updating === u._id ? "…"
                            : u.role === "admin" ? "Remove Admin" : "Make Admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40">←</button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40">→</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Exam Management (Unpublished + Publish)
// ─────────────────────────────────────────────────────────────────────────────
const ExamsSection = () => {
  const navigate = useNavigate();
  const [exams,     setExams]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [publishing,setPublishing]= useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/exams/unpublished");
      setExams(res.data?.data?.exams || res.data?.exams || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExams(); }, []);

  const handlePublish = async (id) => {
    setPublishing(id);
    try {
      await api.post(`/admin/exams/${id}/publish`);
      setExams(prev => prev.filter(e => e._id !== id));
    } catch (e) { console.error(e); }
    finally { setPublishing(null); setConfirmId(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-800">Exam Management</h2>
        <button onClick={() => navigate("/admin/create-test")}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90">
          ＋ Create Test
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_,i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-20" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <span className="text-4xl block mb-2">✅</span>
          <p className="text-gray-400 text-sm">All exams are published</p>
          <button onClick={() => navigate("/admin/create-test")}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90">
            Create New Test
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-50">
          {exams.map(exam => (
            <div key={exam._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 font-semibold text-sm truncate">
                  {exam.title?.en || exam.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{exam.type}</span>
                  <span>·</span>
                  <span>{exam.totalQuestions} Qs</span>
                  <span>·</span>
                  <span>{exam.duration} min</span>
                  {exam.scheduledAt && (
                    <>
                      <span>·</span>
                      <span className="text-primary font-semibold">
                        📅 {new Date(exam.scheduledAt).toLocaleString("en-IN")}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {confirmId === exam._id ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => setConfirmId(null)}
                    className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">
                    Cancel
                  </button>
                  <button onClick={() => handlePublish(exam._id)} disabled={publishing === exam._id}
                    className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg font-semibold disabled:opacity-60">
                    {publishing === exam._id ? "…" : "✓ Confirm"}
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(exam._id)}
                  className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 whitespace-nowrap">
                  🚀 Publish
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AdminPage with sliding sidebar
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key:"overview",  icon:"📊", label:"Overview" },
  { key:"questions", icon:"❓", label:"Questions" },
  { key:"users",     icon:"👥", label:"Users" },
  { key:"exams",     icon:"📝", label:"Exams" },
];

const AdminPage = () => {
  const { user } = useSelector(s => s.auth);
  const navigate  = useNavigate();
  const [active,  setActive]  = useState("overview");
  const [sidebar, setSidebar] = useState(true); // open on desktop

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <span className="text-5xl">🚫</span>
        <p className="text-gray-600 font-semibold">Admin access required</p>
        <button onClick={() => navigate("/dashboard")}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen bg-dark border-r border-white/8 z-40 transition-all duration-300 flex flex-col",
        sidebar ? "w-56" : "w-0 lg:w-14 overflow-hidden"
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/8 flex-shrink-0">
          {sidebar && (
            <div>
              <p className="text-white font-black text-sm">Admin Panel</p>
              <p className="text-white/40 text-xs">{user?.name}</p>
            </div>
          )}
          <button onClick={() => setSidebar(v => !v)}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebar
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />}
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ key, icon, label }) => (
            <button key={key} onClick={() => setActive(key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                active === key
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-white/50 hover:text-white hover:bg-white/8"
              )}>
              <span className="text-lg flex-shrink-0">{icon}</span>
              {sidebar && <span className="text-sm font-medium">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom: back to app */}
        <div className="px-2 pb-4 border-t border-white/8 pt-3">
          <button onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all">
            <span className="text-lg flex-shrink-0">🏠</span>
            {sidebar && <span className="text-sm">Back to App</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebar && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebar(v => !v)}
            className="lg:hidden p-2 rounded-lg border border-gray-200 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="font-black text-gray-900 text-lg">
              {NAV_ITEMS.find(n => n.key === active)?.icon}{" "}
              {NAV_ITEMS.find(n => n.key === active)?.label}
            </h1>
          </div>
        </div>

        {/* Section content */}
        <div className="p-6 max-w-5xl">
          {active === "overview"  && <StatsSection />}
          {active === "questions" && <QuestionsSection />}
          {active === "users"     && <UsersSection />}
          {active === "exams"     && <ExamsSection />}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;