import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

const FILTER_TABS = [
  { key: "MOCK", label: "tests.mock" },
  { key: "PYQ", label: "tests.pyq" },
  { key: "DAILY_QUIZ", label: "tests.dailyQuiz" },
];

const DifficultyBadge = ({ difficulty, t, lang }) => {
  const map = {
    easy: { label: t("tests.easy"), class: "bg-green-100 text-green-700 border-green-200" },
    medium: { label: t("tests.medium"), class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    hard: { label: t("tests.hard"), class: "bg-red-100 text-red-700 border-red-200" },
  };
  const d = map[difficulty?.toLowerCase()] || map.medium;
  return (
    <span className={cn("px-2 py-0.5 rounded-full border text-xs font-semibold", d.class, lang === "ta" && "font-tamil")}>
      {d.label}
    </span>
  );
};

const TestCard = ({ test, t, lang, onStart }) => {
  const isPremium = test.isPremium;
  const hasBestScore = test.bestScore !== undefined && test.bestScore !== null;

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
      isPremium ? "border-amber-200" : "border-gray-200"
    )}>
      {/* Premium ribbon */}
      {isPremium && (
        <div className="absolute top-0 right-0">
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">
            ⭐ {t("tests.premium")}
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3 pr-16">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary text-lg group-hover:bg-primary/20 transition-colors">
            📋
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-gray-900 font-bold text-sm leading-snug", lang === "ta" && "font-tamil")}>
              {lang === "ta" && test.title_ta ? test.title_ta : test.title}
            </h3>
            {test.subject && (
              <p className="text-gray-400 text-xs mt-0.5">{test.subject}</p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {test.duration} {t("tests.minutes")}
          </div>
          <span className="text-gray-200">|</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {test.questionCount} {t("tests.questions")}
          </div>
          {test.difficulty && (
            <>
              <span className="text-gray-200">|</span>
              <DifficultyBadge difficulty={test.difficulty} t={t} lang={lang} />
            </>
          )}
        </div>

        {/* Attempt history */}
        {(test.attempts > 0 || hasBestScore) && (
          <div className="flex gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            {test.attempts > 0 && (
              <div className="flex-1 text-center">
                <p className="text-gray-900 text-sm font-bold">{test.attempts}</p>
                <p className={cn("text-gray-400 text-xs", lang === "ta" && "font-tamil")}>{t("tests.attempts")}</p>
              </div>
            )}
            {hasBestScore && (
              <div className="flex-1 text-center">
                <p className="text-primary text-sm font-bold">{test.bestScore}%</p>
                <p className={cn("text-gray-400 text-xs", lang === "ta" && "font-tamil")}>{t("tests.bestScore")}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onStart(test)}
          disabled={isPremium && !test.isUnlocked}
          className={cn(
            "w-full py-2.5 rounded-xl text-sm font-bold transition-all",
            isPremium && !test.isUnlocked
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              : "bg-gradient-to-r from-primary to-accent text-white shadow-md hover:opacity-90 hover:shadow-primary/30"
          )}
        >
          {isPremium && !test.isUnlocked ? (
            <span className={cn(lang === "ta" && "font-tamil")}>🔒 {t("tests.locked")}</span>
          ) : (
            <span className={cn(lang === "ta" && "font-tamil")}>{t("tests.startTest")} →</span>
          )}
        </button>
      </div>
    </div>
  );
};

const TestListPage = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("MOCK");
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchTests = async (type) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/tests", { params: { type } });
      setTests(res.data?.tests || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests(activeTab);
  }, [activeTab]);

  const handleStart = (test) => {
    navigate(`/exam/${test._id}`);
  };

  const filteredTests = tests.filter((test) => {
    if (!search.trim()) return true;
    const title = (lang === "ta" && test.title_ta ? test.title_ta : test.title || "").toLowerCase();
    return title.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-dark px-4 pt-8 pb-20">
        <div className="max-w-5xl mx-auto">
          <h1 className={cn("text-2xl font-black text-white mb-1", lang === "ta" && "font-tamil")}>
            {t("tests.title")}
          </h1>
          <p className="text-white/40 text-sm">Select a test to begin your preparation</p>

          {/* Search */}
          <div className="mt-5 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className={cn(
                "w-full pl-10 pr-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-primary focus:bg-white/12 transition-all text-sm",
                lang === "ta" && "font-tamil"
              )}
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12">
        {/* Filter Tabs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm mb-6 flex gap-1">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                activeTab === key
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-md"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
                lang === "ta" && "font-tamil"
              )}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2 bg-gray-50 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded mb-4 w-2/3" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={() => fetchTests(activeTab)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-5xl">📭</span>
            <p className={cn("text-gray-400 text-sm", lang === "ta" && "font-tamil")}>{t("tests.noTests")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {filteredTests.map((test) => (
              <TestCard
                key={test._id}
                test={test}
                t={t}
                lang={lang}
                onStart={handleStart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestListPage;
