import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

const TEST_TYPES   = ["MOCK","PYQ","DAILY_QUIZ","SUBJECT_TEST","GRAND_TEST"];
const EXAM_GROUPS  = ["GROUP_1","GROUP_2","GROUP_2A","GROUP_4","VAO","ALL"];
const DIFFICULTIES = ["easy","medium","hard"];
const SUBJECTS = [
  "History","Geography","Polity","Economy","Science",
  "Environment","Current Affairs","Tamil","General Knowledge",
];

// ── Utility: extract the real Mongo ID from any question shape ────────────────
const extractId = (q) =>
  q?._id?.toString?.()   ||   // populated ObjectId
  q?.id?.toString?.()    ||   // lean() string alias
  (typeof q?._id === 'string' ? q._id : null);

// ── Utility: extract display text from string or { en, ta } object ────────────
const getText = (obj, lang = 'en') => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object') return (lang === 'ta' && obj.ta) ? obj.ta : (obj.en || '');
  return String(obj);
};

// ── Step Indicator ────────────────────────────────────────────────────────────
const StepBar = ({ current, t }) => {
  const steps = [
    { n: 1, label: t("createTest.step1") },
    { n: 2, label: t("createTest.step2") },
    { n: 3, label: t("createTest.step3") },
  ];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-2 flex-1">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all",
              current > n   ? "bg-green-500 border-green-500 text-white" :
              current === n ? "bg-primary border-primary text-white" :
                              "bg-white border-gray-200 text-gray-300"
            )}>
              {current > n ? "✓" : n}
            </div>
            <span className={cn(
              "text-xs font-medium hidden sm:block whitespace-nowrap",
              current === n ? "text-primary" : "text-gray-400"
            )}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("flex-1 h-0.5 transition-all", current > n ? "bg-green-500" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  );
};

// ── STEP 1 ────────────────────────────────────────────────────────────────────
const Step1 = ({ form, setForm, t, lang }) => {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("createTest.titleEn")} *</label>
          <input value={form.titleEn} onChange={e => set("titleEn", e.target.value)}
            placeholder="Enter test title in English"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800 placeholder-gray-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 font-tamil">{t("createTest.titleTa")}</label>
          <input value={form.titleTa} onChange={e => set("titleTa", e.target.value)}
            placeholder="தமிழில் தலைப்பை உள்ளிடவும்"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary font-tamil bg-white text-gray-800 placeholder-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("createTest.type")} *</label>
          <select value={form.type} onChange={e => set("type", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800">
            {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("createTest.examGroup")} *</label>
          <select value={form.examGroup} onChange={e => set("examGroup", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800">
            {EXAM_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("createTest.duration")}</label>
          <input type="number" min="5" value={form.duration} onChange={e => set("duration", Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("createTest.totalMarks")}</label>
          <input type="number" min="1" value={form.totalMarks} onChange={e => set("totalMarks", Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800" />
        </div>
        {form.type === "PYQ" && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("createTest.pyqYear")}</label>
            <input type="number" min="1990" max="2030" value={form.pyqYear} onChange={e => set("pyqYear", Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800" />
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => set("negativeMarking", !form.negativeMarking)}
            className={cn("w-11 h-6 rounded-full transition-all relative cursor-pointer", form.negativeMarking ? "bg-primary" : "bg-gray-300")}>
            <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all", form.negativeMarking ? "left-5" : "left-0.5")} />
          </div>
          <span className="text-sm font-semibold text-gray-700">{t("createTest.negativeMarking")}</span>
        </label>
        {form.negativeMarking && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">{t("createTest.negativeValue")}:</label>
            <input type="number" min="0" max="1" step="0.25" value={form.negativeValue}
              onChange={e => set("negativeValue", Number(e.target.value))}
              className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary bg-white text-gray-800" />
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div onClick={() => set("isPremium", !form.isPremium)}
          className={cn("w-11 h-6 rounded-full transition-all relative cursor-pointer", form.isPremium ? "bg-accent" : "bg-gray-300")}>
          <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all", form.isPremium ? "left-5" : "left-0.5")} />
        </div>
        <span className="text-sm font-semibold text-gray-700">{t("createTest.isPremium")}</span>
        {form.isPremium && <span className="px-2 py-0.5 bg-accent/20 text-amber-700 text-xs rounded-full border border-accent/30">⭐ Premium</span>}
      </label>
    </div>
  );
};

// ── STEP 2 ────────────────────────────────────────────────────────────────────
const Step2 = ({ selectedQuestions, setSelectedQuestions, t, lang }) => {
  const [questions,  setQuestions]  = useState([]);
  const [rawData,    setRawData]    = useState([]);  // full raw objects from API
  const [loading,    setLoading]    = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [noIdWarning,setNoIdWarning]= useState(false);
  const [filters,    setFilters]    = useState({ subject: "", difficulty: "", search: "" });

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.subject)    params.subject    = filters.subject;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search)     params.search     = filters.search;

      const res  = await api.get("/questions", { params });
      const data = res.data?.data || res.data;
      const raw  = data?.questions || (Array.isArray(data) ? data : []);

      // ── Debug: log first item so we can see its shape ──────────────────
      if (raw.length > 0) {
        console.log("🔍 Raw question[0] keys:", Object.keys(raw[0]));
        console.log("🔍 Raw question[0]:", JSON.stringify(raw[0], null, 2));
      }

      // ── Check if _id is present ────────────────────────────────────────
      const hasId = raw.length === 0 || raw.some(q => extractId(q));
      setNoIdWarning(!hasId);

      setRawData(raw);
      setQuestions(raw);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (e) {
      console.error("fetchQuestions error:", e);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const getQId    = (q)  => extractId(q);
  const isSelected = (q) => {
    const id = getQId(q);
    if (id) return selectedQuestions.some(s => extractId(s) === id);
    // fallback: match by question text if no id
    return selectedQuestions.some(s => getText(s.questionText) === getText(q.questionText));
  };

  const toggle = (q) => {
    const id = getQId(q);
    if (isSelected(q)) {
      setSelectedQuestions(prev =>
        id
          ? prev.filter(s => extractId(s) !== id)
          : prev.filter(s => getText(s.questionText) !== getText(q.questionText))
      );
    } else {
      setSelectedQuestions(prev => [...prev, q]);
    }
  };

  const removeOne = (q) => {
    const id = getQId(q);
    setSelectedQuestions(prev =>
      id
        ? prev.filter(s => extractId(s) !== id)
        : prev.filter(s => getText(s.questionText) !== getText(q.questionText))
    );
  };

  const totalMarks = selectedQuestions.reduce((s, q) => s + (q.marks || 1), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 space-y-3">

        {/* Warning banner if no IDs */}
        {noIdWarning && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-xs">
            ⚠️ Questions are missing <code>_id</code> field. Check your question controller's
            <code>.select()</code> or <code>getLocalised()</code> — it must include <code>_id</code>.
            Questions can still be added by text-match but IDs won't be sent to the server.
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input value={filters.search}
            onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            placeholder={t("createTest.searchQuestions")}
            className="col-span-2 sm:col-span-4 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary bg-white text-gray-800 placeholder-gray-400" />
          <select value={filters.subject}
            onChange={e => { setFilters(f => ({ ...f, subject: e.target.value })); setPage(1); }}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none">
            <option value="">{t("createTest.filterSubject")}</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.difficulty}
            onChange={e => { setFilters(f => ({ ...f, difficulty: e.target.value })); setPage(1); }}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none">
            <option value="">{t("createTest.filterDifficulty")}</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => { setFilters({ subject: "", difficulty: "", search: "" }); setPage(1); }}
            className="col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:border-gray-300 bg-white">
            {t("common.reset")}
          </button>
        </div>

        {/* Question list */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">{t("createTest.noQuestionsFound")}</div>
          ) : questions.map((q, idx) => {
            const sel   = isSelected(q);
            const qid   = getQId(q);
            const qText = getText(q.questionText, lang);
            return (
              <div key={qid || idx} className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all",
                sel ? "border-primary/40 bg-primary/5" : "border-gray-200 bg-white hover:border-gray-300"
              )}>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs text-gray-800 line-clamp-2", lang === "ta" && "font-tamil")}>
                    {qText || "(No question text)"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {!qid && <span className="px-1.5 py-0.5 bg-red-50 text-red-400 text-[10px] rounded-full border border-red-100">no id</span>}
                    {q.subject && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full border border-blue-100">{q.subject}</span>}
                    {q.difficulty && (
                      <span className={cn("px-1.5 py-0.5 text-[10px] rounded-full border",
                        q.difficulty === "easy"   ? "bg-green-50 text-green-600 border-green-100" :
                        q.difficulty === "medium" ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                                                    "bg-red-50 text-red-600 border-red-100"
                      )}>{q.difficulty}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => toggle(q)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    sel
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  )}>
                  {sel ? t("createTest.removeQuestion") : t("createTest.addQuestion")}
                </button>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40">←</button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      {/* Selected Questions panel */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-24">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-700">{t("createTest.selectedQuestions")}</h4>
            <div className="text-right">
              <span className="text-primary font-black text-sm">{selectedQuestions.length}</span>
              <p className="text-gray-400 text-[10px]">{totalMarks} {t("createTest.marksTotal")}</p>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {selectedQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-300 gap-2">
                <span className="text-3xl">📋</span>
                <p className="text-xs">No questions selected</p>
              </div>
            ) : selectedQuestions.map((q, idx) => (
              <div key={extractId(q) || idx} className="flex items-start gap-2.5 px-3 py-3 border-b border-gray-50 hover:bg-gray-50">
                <span className="text-[10px] text-gray-400 font-mono w-5 flex-shrink-0 mt-0.5">{idx + 1}</span>
                <p className={cn("flex-1 text-xs text-gray-700 line-clamp-2", lang === "ta" && "font-tamil")}>
                  {getText(q.questionText, lang)}
                </p>
                <button onClick={() => removeOne(q)} className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── STEP 3 ────────────────────────────────────────────────────────────────────
const Step3 = ({ form, selectedQuestions, t, lang }) => {
  const preview = selectedQuestions.slice(0, 3);
  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-5">
        <h3 className="font-bold text-gray-800 mb-4">{t("createTest.summary")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Title (EN)",              value: form.titleEn || "—" },
            { label: "Title (TA)",              value: form.titleTa || "—" },
            { label: t("createTest.type"),      value: form.type },
            { label: t("createTest.examGroup"), value: form.examGroup },
            { label: t("createTest.duration"),  value: `${form.duration} min` },
            { label: t("createTest.totalMarks"),value: form.totalMarks },
            { label: "Questions",               value: selectedQuestions.length },
            { label: "Premium",                 value: form.isPremium ? "Yes ⭐" : "No" },
            { label: "Negative Marking",        value: form.negativeMarking ? `−${form.negativeValue}` : "No" },
            ...(form.type === "PYQ" ? [{ label: "PYQ Year", value: form.pyqYear }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-gray-800 text-sm font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-700 text-sm">{t("createTest.preview")}</h4>
          </div>
          <div className="divide-y divide-gray-50">
            {preview.map((q, i) => (
              <div key={extractId(q) || i} className="px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">Q{i + 1}</p>
                <p className={cn("text-sm text-gray-800", lang === "ta" && "font-tamil")}>
                  {getText(q.questionText, lang)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main CreateTestPage ───────────────────────────────────────────────────────
const CreateTestPage = () => {
  const { t, lang } = useTranslation();
  const navigate    = useNavigate();

  const [step,              setStep]              = useState(1);
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  const [form, setForm] = useState({
    titleEn: "", titleTa: "", type: "MOCK", examGroup: "ALL",
    duration: 90, totalMarks: 100,
    negativeMarking: false, negativeValue: 0.25,
    isPremium: false, pyqYear: new Date().getFullYear(),
  });

  const validateStep1 = () => {
    if (!form.titleEn.trim()) { setError("Title (English) is required."); return false; }
    if (!form.duration || form.duration < 1) { setError("Duration must be at least 1 minute."); return false; }
    setError(null); return true;
  };
  const validateStep2 = () => {
    if (selectedQuestions.length === 0) { setError("Please add at least one question."); return false; }
    setError(null); return true;
  };

  const handleSave = async (publish = false) => {
    setSaving(true);
    setError(null);
    try {
      // ── Extract IDs, filtering nulls ──────────────────────────────────────
      const questionIds = selectedQuestions
        .map(q => extractId(q))
        .filter(Boolean);

      // ── If IDs are missing, try fetching them from backend by text match ──
      if (questionIds.length === 0 && selectedQuestions.length > 0) {
        setError(
          "Questions are missing their database IDs. " +
          "Your question controller must include '_id' in the response. " +
          "See browser console for the fix."
        );
        console.error(
          "❌ FIX NEEDED in backend question controller:\n" +
          "Your GET /api/questions response must include _id.\n" +
          "Find your question controller and change:\n" +
          "  .select('-_id ...')  →  .select('_id ...')\n" +
          "Or if using getLocalised(), make it return _id too."
        );
        setSaving(false);
        return;
      }

      const payload = {
        title: {
          en: form.titleEn.trim(),
          ta: form.titleTa.trim() || form.titleEn.trim(),
        },
        type:            form.type,
        examGroup:       form.examGroup,
        duration:        Number(form.duration),
        totalMarks:      Number(form.totalMarks),
        totalQuestions:  questionIds.length,
        questions:       questionIds,
        negativeMarking: form.negativeMarking ? Number(form.negativeValue) : 0,
        isPremium:       Boolean(form.isPremium),
        isPublished:     false,
        ...(form.type === "PYQ" && form.pyqYear ? { pyqYear: Number(form.pyqYear) } : {}),
      };

      console.log("📤 Payload to server:", JSON.stringify(payload, null, 2));

      const res    = await api.post("/tests/mock", payload);
      const examId = res.data?.data?._id || res.data?.exam?._id || res.data?._id;
      if (!examId) throw new Error("No exam ID returned from server.");

      if (publish) await api.post(`/admin/exams/${examId}/publish`);

      navigate("/admin", {
        state: { toast: publish ? t("createTest.publishSuccess") : t("createTest.draftSuccess") },
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || t("common.error");
      setError(msg);
      console.error("CreateTest save error:", err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-dark px-4 pt-8 pb-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">{t("createTest.title")}</h1>
            <p className="text-white/40 text-sm">{t("admin.title")}</p>
          </div>
          <button onClick={() => navigate("/admin")}
            className="px-3 py-2 bg-white/10 border border-white/15 rounded-xl text-white/60 text-sm hover:text-white transition-all">
            ← {t("common.back")}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 pb-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <StepBar current={step} t={t} />

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              ⚠️ {error}
            </div>
          )}

          {step === 1 && <Step1 form={form} setForm={setForm} t={t} lang={lang} />}
          {step === 2 && <Step2 selectedQuestions={selectedQuestions} setSelectedQuestions={setSelectedQuestions} t={t} lang={lang} />}
          {step === 3 && <Step3 form={form} selectedQuestions={selectedQuestions} t={t} lang={lang} />}

          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            <button onClick={() => { setError(null); setStep(s => s - 1); }} disabled={step === 1}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 disabled:opacity-40 transition-all">
              {t("createTest.back")}
            </button>
            <div className="flex gap-3">
              {step < 3 ? (
                <button onClick={() => {
                    if (step === 1 && !validateStep1()) return;
                    if (step === 2 && !validateStep2()) return;
                    setStep(s => s + 1);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all">
                  {t("createTest.next")}
                </button>
              ) : (
                <>
                  <button onClick={() => handleSave(false)} disabled={saving}
                    className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50 transition-all">
                    {saving ? t("createTest.saving") : t("createTest.saveDraft")}
                  </button>
                  <button onClick={() => handleSave(true)} disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 disabled:opacity-50 transition-all">
                    {saving ? t("createTest.publishing") : t("createTest.savePublish")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTestPage;