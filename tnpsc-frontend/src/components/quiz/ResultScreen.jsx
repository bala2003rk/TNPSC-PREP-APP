import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import useTranslation from "../../hooks/useTranslation";
import { cn } from "../../utils/cn";

// ── Score Ring ────────────────────────────────────────────────────────────────
const ScoreRing = ({ percentage }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - percentage) / 100) * circumference;
  const color =
    percentage >= 75 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{percentage}%</span>
        <span className="text-white/40 text-xs mt-1">Accuracy</span>
      </div>
    </div>
  );
};

// ── Solution Item ─────────────────────────────────────────────────────────────
const SolutionItem = ({ question, userAnswer, index, lang, t }) => {
  const [open, setOpen] = useState(false);
  const options = question.options || [];
  const correctIdx = question.correctAnswer ?? question.correct_option;
  const isCorrect = userAnswer === correctIdx;
  const isSkipped = userAnswer === undefined || userAnswer === null;

  const getText = (obj) => {
    if (typeof obj === "string") return obj;
    return lang === "ta" && obj?.text_ta ? obj.text_ta : obj?.text || obj?.text_en || "";
  };

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden mb-3 transition-all",
      isSkipped
        ? "border-gray-200"
        : isCorrect
        ? "border-green-200"
        : "border-red-200"
    )}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-start gap-3 p-4 text-left",
          isSkipped ? "bg-gray-50" : isCorrect ? "bg-green-50" : "bg-red-50"
        )}
      >
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold",
          isSkipped ? "bg-gray-400" : isCorrect ? "bg-green-500" : "bg-red-500"
        )}>
          {isSkipped ? "—" : isCorrect ? "✓" : "✗"}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-gray-800 text-sm font-medium line-clamp-2",
            lang === "ta" && "font-tamil"
          )}>
            <span className="text-gray-400 mr-2">Q{index + 1}.</span>
            {getText(question)}
          </p>
        </div>
        <svg
          className={cn("w-4 h-4 text-gray-400 flex-shrink-0 transition-transform", open && "rotate-180")}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="p-4 border-t border-gray-100 space-y-3 bg-white">
          <div className="space-y-2">
            {options.map((opt, idx) => {
              const optText = getText(opt);
              const optLabel = ["A", "B", "C", "D"][idx] || String(idx + 1);
              const isCorrectOpt = idx === correctIdx;
              const isUserOpt = idx === userAnswer;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg border text-sm",
                    isCorrectOpt
                      ? "bg-green-50 border-green-300 text-green-800"
                      : isUserOpt && !isCorrect
                      ? "bg-red-50 border-red-300 text-red-800"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  )}
                >
                  <span className="font-bold text-xs w-5 text-center">{optLabel}</span>
                  <span className={cn("flex-1", lang === "ta" && "font-tamil")}>{optText}</span>
                  {isCorrectOpt && <span className="text-green-600">✓</span>}
                  {isUserOpt && !isCorrect && <span className="text-red-600">✗</span>}
                </div>
              );
            })}
          </div>

          {(question.explanation || question.explanation_ta) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-xs font-semibold mb-1">{t("results.explanation")}</p>
              <p className={cn("text-blue-600 text-sm", lang === "ta" && "font-tamil")}>
                {lang === "ta" && question.explanation_ta
                  ? question.explanation_ta
                  : question.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main ResultScreen ─────────────────────────────────────────────────────────
const ResultScreen = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { questions, answers, result } = useSelector((s) => s.exam);
  const [showSolutions, setShowSolutions] = useState(false);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  const {
    score = 0,
    totalMarks = questions.length,
    correct = 0,
    incorrect = 0,
    skipped = 0,
    accuracy = 0,
    timeTaken = 0,
    sectionBreakdown = [],
    rank,
    totalParticipants,
  } = result;

  const performanceLabel =
    accuracy >= 80
      ? t("results.excellent")
      : accuracy >= 60
      ? t("results.good")
      : accuracy >= 40
      ? t("results.average")
      : t("results.poor");

  const performanceColor =
    accuracy >= 80 ? "text-green-500" : accuracy >= 60 ? "text-yellow-500" : accuracy >= 40 ? "text-orange-500" : "text-red-500";

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header Banner */}
      <div className="bg-dark py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className={cn("text-3xl font-black mb-1", performanceColor)}>{performanceLabel}</p>
          <p className="text-white/40 text-sm">{t("results.title")}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 space-y-5">
        {/* Score Card */}
        <div className="bg-dark rounded-2xl p-6 shadow-xl border border-white/10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing percentage={Math.round(accuracy)} />
            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: t("results.score"), value: `${score}/${totalMarks}`, color: "text-white" },
                  { label: t("results.correct"), value: correct, color: "text-green-400" },
                  { label: t("results.incorrect"), value: incorrect, color: "text-red-400" },
                  { label: t("results.skipped"), value: skipped, color: "text-gray-400" },
                  { label: t("results.timeTaken"), value: formatTime(timeTaken), color: "text-blue-400" },
                  ...(rank ? [{ label: t("results.rank"), value: `#${rank}`, color: "text-accent" }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className={cn("text-xl font-black", color)}>{value}</div>
                    <div className={cn("text-white/40 text-xs mt-1", lang === "ta" && "font-tamil")}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section Breakdown */}
        {sectionBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className={cn("font-bold text-gray-800", lang === "ta" && "font-tamil")}>
                {t("results.sectionBreakdown")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[t("results.section"), t("results.correct"), t("results.incorrect"), t("results.skipped"), t("results.marks")].map((h) => (
                      <th key={h} className={cn("px-4 py-2.5 text-left text-xs font-semibold text-gray-500", lang === "ta" && "font-tamil")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sectionBreakdown.map((sec, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className={cn("px-4 py-3 text-sm font-medium text-gray-800", lang === "ta" && "font-tamil")}>
                        {lang === "ta" && sec.name_ta ? sec.name_ta : sec.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 font-semibold">{sec.correct}</td>
                      <td className="px-4 py-3 text-sm text-red-500 font-semibold">{sec.incorrect}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{sec.skipped}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-bold">{sec.marks}/{sec.totalMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/tests")}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            ← {t("results.backToTests")}
          </button>
          <button
            onClick={() => setShowSolutions((v) => !v)}
            className="flex-1 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all"
          >
            {showSolutions ? t("results.hideSolutions") : t("results.viewSolutions")}
          </button>
        </div>

        {/* Solutions Section */}
        {showSolutions && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className={cn("font-bold text-gray-800", lang === "ta" && "font-tamil")}>
                {t("results.viewSolutions")}
              </h3>
            </div>
            <div className="p-4">
              {questions.map((q, idx) => (
                <SolutionItem
                  key={idx}
                  question={q}
                  userAnswer={answers[idx]}
                  index={idx}
                  lang={lang}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultScreen;
