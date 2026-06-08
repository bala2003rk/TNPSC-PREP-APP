import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────
const EXAM_GROUPS = ["GROUP_1", "GROUP_2", "GROUP_2A", "GROUP_4", "VAO"];

// ── Overall Progress Bar ──────────────────────────────────────────────────────
const ProgressBar = ({ percent, t, lang }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <h3 className={cn("font-bold text-gray-800 text-sm", lang === "ta" && "font-tamil")}>
        {t("syllabus.overallProgress")}
      </h3>
      <span className="text-primary font-black text-lg">{percent}%</span>
    </div>
    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
        style={{ width: `${percent}%` }}
      />
    </div>
    <p className={cn("text-gray-400 text-xs mt-2", lang === "ta" && "font-tamil")}>
      {percent}% {t("syllabus.completed")}
    </p>
  </div>
);

// ── Unit Row ──────────────────────────────────────────────────────────────────
const UnitRow = ({ unit, subjectKey, isChecked, onToggle, t, lang, navigate }) => {
  const unitName = lang === "ta" && unit.name?.ta ? unit.name.ta : unit.name?.en || unit.name || "";
  const samacheer = unit.samacheerMapping;

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group",
      isChecked && "bg-green-50/50"
    )}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(subjectKey, unit._id || unit.id || unitName, isChecked)}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
          isChecked
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-primary bg-white"
        )}
        title={isChecked ? t("syllabus.markIncomplete") : t("syllabus.markComplete")}
      >
        {isChecked && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Unit info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm text-gray-700 leading-snug",
          isChecked && "line-through text-gray-400",
          lang === "ta" && "font-tamil"
        )}>
          {unitName}
        </p>
        {samacheer && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            📖 {t("syllabus.std")} {samacheer.standard} · {t("syllabus.term")} {samacheer.term} · {t("syllabus.chapter")} {samacheer.chapter}
          </p>
        )}
      </div>

      {/* Practice button */}
      <button
        onClick={() => navigate(`/tests?subject=${subjectKey}&unit=${encodeURIComponent(unitName)}`)}
        className="flex-shrink-0 px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold rounded-lg hover:bg-primary/20 transition-all opacity-0 group-hover:opacity-100"
      >
        {t("syllabus.practiceQuestions")} →
      </button>
    </div>
  );
};

// ── Subject Accordion ─────────────────────────────────────────────────────────
const SubjectAccordion = ({ subject, completedUnitIds, onToggle, t, lang, navigate }) => {
  const [open, setOpen] = useState(false);

  const units = subject.units || [];
  const completedInSubject = units.filter((u) =>
    completedUnitIds.has(u._id || u.id || (lang === "ta" && u.name?.ta ? u.name.ta : u.name?.en || u.name))
  ).length;
  const pct = units.length > 0 ? Math.round((completedInSubject / units.length) * 100) : 0;

  const subjectName = lang === "ta" && subject.name?.ta ? subject.name.ta : subject.name?.en || subject.name || "";

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm overflow-hidden transition-all",
      open ? "border-primary/30" : "border-gray-200"
    )}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0",
          pct === 100 ? "bg-green-500" : pct > 50 ? "bg-primary" : "bg-gray-400"
        )}>
          {pct === 100 ? "✓" : subjectName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={cn("font-bold text-gray-800 text-sm", lang === "ta" && "font-tamil")}>
              {subjectName}
            </p>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0",
              pct === 100
                ? "bg-green-100 text-green-700"
                : pct > 0
                ? "bg-primary/15 text-primary"
                : "bg-gray-100 text-gray-500"
            )}>
              {completedInSubject}/{units.length} {t("syllabus.units")}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct === 100 ? "bg-green-500" : "bg-gradient-to-r from-primary to-accent"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <svg
          className={cn("w-4 h-4 text-gray-400 flex-shrink-0 transition-transform", open && "rotate-180")}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Units list */}
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {units.length === 0 ? (
            <p className="px-5 py-4 text-gray-400 text-sm">{t("common.noData")}</p>
          ) : units.map((unit, idx) => {
            const unitKey = unit._id || unit.id || (lang === "ta" && unit.name?.ta ? unit.name.ta : unit.name?.en || unit.name);
            return (
              <UnitRow
                key={unitKey || idx}
                unit={unit}
                subjectKey={subject.name?.en || subject.name}
                isChecked={completedUnitIds.has(unitKey)}
                onToggle={onToggle}
                t={t}
                lang={lang}
                navigate={navigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main SyllabusPage ─────────────────────────────────────────────────────────
const SyllabusPage = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [activeGroup,     setActiveGroup]     = useState("GROUP_1");
  const [syllabus,        setSyllabus]        = useState([]);
  const [completedUnitIds,setCompletedUnitIds]= useState(new Set());
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [saving,          setSaving]          = useState(false);

  // ── Fetch syllabus for active group ────────────────────────────────────────
  const fetchSyllabus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/syllabus/${activeGroup}`);
      const data = res.data?.data || res.data;
      setSyllabus(Array.isArray(data) ? data : data?.subjects || []);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [activeGroup]);

  // ── Load user's progress from their profile ────────────────────────────────
  const loadProgress = useCallback(() => {
    if (!user?.progressTracker) return;
    const ids = new Set(
      user.progressTracker
        .filter((p) => p.examGroup === activeGroup || !p.examGroup)
        .map((p) => p.unitId || p.unit)
    );
    setCompletedUnitIds(ids);
  }, [user, activeGroup]);

  useEffect(() => { fetchSyllabus(); }, [fetchSyllabus]);
  useEffect(() => { loadProgress(); },  [loadProgress]);

  // ── Toggle a unit complete/incomplete ─────────────────────────────────────
  const handleToggle = async (subject, unitId, isChecked) => {
    // Optimistic update
    setCompletedUnitIds((prev) => {
      const next = new Set(prev);
      if (isChecked) { next.delete(unitId); } else { next.add(unitId); }
      return next;
    });

    setSaving(true);
    try {
      if (!isChecked) {
        // Mark complete
        await api.post("/syllabus/progress", {
          subject,
          unit:      unitId,
          examGroup: activeGroup,
          completed: true,
        });
      } else {
        // Mark incomplete — same endpoint with completed:false or DELETE
        await api.post("/syllabus/progress", {
          subject,
          unit:      unitId,
          examGroup: activeGroup,
          completed: false,
        });
      }
    } catch (err) {
      // Revert on error
      console.error("Progress save failed:", err);
      setCompletedUnitIds((prev) => {
        const next = new Set(prev);
        if (isChecked) { next.add(unitId); } else { next.delete(unitId); }
        return next;
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Compute overall progress ───────────────────────────────────────────────
  const totalUnits = syllabus.reduce((s, sub) => s + (sub.units?.length || 0), 0);
  const completedCount = syllabus.reduce((s, sub) => {
    const units = sub.units || [];
    return s + units.filter((u) => {
      const key = u._id || u.id || (lang === "ta" && u.name?.ta ? u.name.ta : u.name?.en || u.name);
      return completedUnitIds.has(key);
    }).length;
  }, 0);
  const overallPct = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-dark px-4 pt-8 pb-20">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          <div>
            <h1 className={cn("text-2xl font-black text-white mb-1", lang === "ta" && "font-tamil")}>
              📋 {t("syllabus.title")}
            </h1>
            <p className="text-white/40 text-sm">{t("syllabus.selectGroup")}</p>
          </div>
          {saving && (
            <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white/60 text-xs">Saving…</span>
            </div>
          )}
        </div>

        {/* Exam Group Tabs */}
        <div className="max-w-4xl mx-auto mt-5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {EXAM_GROUPS.map((group) => (
              <button
                key={group}
                onClick={() => { setActiveGroup(group); setSyllabus([]); }}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                  activeGroup === group
                    ? "bg-primary border-primary text-white shadow-md"
                    : "bg-white/10 border-white/20 text-white/60 hover:text-white hover:bg-white/15"
                )}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10 pb-12 space-y-4">
        {/* Overall progress */}
        {!loading && syllabus.length > 0 && (
          <ProgressBar percent={overallPct} t={t} lang={lang} />
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-2 bg-gray-50 rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={fetchSyllabus}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : syllabus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-5xl">📭</span>
            <p className={cn("text-gray-400 text-sm", lang === "ta" && "font-tamil")}>
              {t("syllabus.noSyllabus")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {syllabus.map((subject, idx) => (
              <SubjectAccordion
                key={subject._id || subject.name?.en || idx}
                subject={subject}
                completedUnitIds={completedUnitIds}
                onToggle={handleToggle}
                t={t}
                lang={lang}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyllabusPage;
