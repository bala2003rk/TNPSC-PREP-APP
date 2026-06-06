import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  answerQuestion,
  toggleFlag,
  setCurrentIndex,
  submitExam,
  tickTimer,
} from "../../store/slices/examSlice";
import useTranslation from "../../hooks/useTranslation";
import { cn } from "../../utils/cn";

// ─── Timer Display ────────────────────────────────────────────────────────────
const TimerDisplay = ({ seconds }) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const isWarning = seconds <= 300;
  const isCritical = seconds <= 60;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-2 rounded-xl border font-mono text-sm font-bold transition-all",
      isCritical
        ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
        : isWarning
        ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
        : "bg-white/5 border-white/15 text-white"
    )}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {hrs > 0 && `${String(hrs).padStart(2, "0")}:`}
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
};

// ─── OMR Bubble ───────────────────────────────────────────────────────────────
const OMRBubble = ({ number, status, onClick }) => {
  const colorMap = {
    answered: "bg-green-500/30 border-green-500/60 text-green-400",
    flagged: "bg-orange-500/30 border-orange-500/60 text-orange-400",
    current: "bg-blue-500/30 border-blue-500 text-blue-300 ring-2 ring-blue-500/40",
    unanswered: "bg-white/5 border-white/15 text-white/40",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-9 h-9 rounded-full border text-xs font-bold transition-all hover:scale-110 flex items-center justify-center",
        colorMap[status] || colorMap.unanswered
      )}
      title={`Question ${number}`}
    >
      {number}
    </button>
  );
};

// ─── Confirm Modal ────────────────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, onConfirm, onCancel, t, unanswered }) => {
  // ✅ no useSelector here anymore — receives unanswered as a prop instead

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#1a1f35] border border-white/15 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-bold mb-2">{t("quiz.submitConfirmTitle")}</h3>
          <p className="text-white/50 text-sm mb-3">{t("quiz.submitConfirmMsg")}</p>
          {unanswered > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 text-orange-400 text-sm">
              ⚠️ {unanswered} question{unanswered > 1 ? "s" : ""} unanswered
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-sm font-medium transition-all"
          >
            {t("quiz.cancelSubmit")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
          >
            {t("quiz.confirmSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main DynamicQuizEngine ───────────────────────────────────────────────────
const DynamicQuizEngine = () => {
  const dispatch = useDispatch();
  const { t, lang } = useTranslation();
  const { questions, answers, flagged, currentIndex, timeRemaining, status } =
    useSelector((s) => s.exam);

  const [showModal, setShowModal] = useState(false);
  const [omrPanelOpen, setOmrPanelOpen] = useState(false);
  const timerRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (status !== "active") return;
    timerRef.current = setInterval(() => {
      dispatch(tickTimer());
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, dispatch]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining <= 0 && status === "active") {
      clearInterval(timerRef.current);
      handleFinalSubmit();
    }
  }, [timeRemaining, status]);

  const handleFinalSubmit = useCallback(() => {
    dispatch(submitExam());
    setShowModal(false);
  }, [dispatch]);

  const handleOptionSelect = (optionIndex) => {
    dispatch(answerQuestion({ questionIndex: currentIndex, optionIndex }));
  };

  const handleFlagToggle = () => {
    dispatch(toggleFlag(currentIndex));
  };

  const handleNavigate = (index) => {
    dispatch(setCurrentIndex(index));
    setOmrPanelOpen(false);
  };

  const getQuestionStatus = (index) => {
    if (index === currentIndex) return "current";
    if (flagged.includes(index)) return "flagged";
    if (answers[index] !== undefined && answers[index] !== null) return "answered";
    return "unanswered";
  };

  const answeredCount = Object.values(answers).filter((v) => v !== undefined && v !== null).length;
  const flaggedCount = flagged.length;
  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const questionText = lang === "ta" && currentQuestion.text_ta
    ? currentQuestion.text_ta
    : currentQuestion.text || currentQuestion.text_en;

  const options = currentQuestion.options || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top Bar ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-dark border-b border-white/10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setOmrPanelOpen(true)}
              className="lg:hidden p-2 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors"
              aria-label="Open OMR panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-white/40 text-xs hidden sm:block truncate">{t("quiz.examName")}</p>
              <p className="text-white text-sm font-semibold">
                {t("quiz.question")} {currentIndex + 1} / {questions.length}
              </p>
            </div>
          </div>

          <TimerDisplay seconds={timeRemaining} />

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white text-sm font-bold rounded-lg shadow-md hover:opacity-90 transition-all whitespace-nowrap"
          >
            {t("quiz.submit")}
          </button>
        </div>
      </div>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* ── Left: Question Panel ───────────────────────────────── */}
        <main className="flex-1 px-4 py-6 lg:pr-6">
          {/* Question Header */}
          <div className="flex items-start justify-between mb-5 gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-primary/20 border border-primary/30 text-primary text-xs font-bold rounded-full">
                  Q.{currentIndex + 1}
                </span>
                {currentQuestion.subject && (
                  <span className="px-2 py-1 bg-white/8 border border-white/10 text-white/40 text-xs rounded-full">
                    {currentQuestion.subject}
                  </span>
                )}
                {currentQuestion.marks && (
                  <span className="px-2 py-1 bg-accent/10 border border-accent/20 text-accent text-xs rounded-full">
                    {currentQuestion.marks} {t("results.marks")}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleFlagToggle}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all flex-shrink-0",
                flagged.includes(currentIndex)
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                  : "bg-white/5 border-white/15 text-white/40 hover:text-white hover:border-white/30"
              )}
            >
              🚩 {flagged.includes(currentIndex) ? t("quiz.unflagQuestion") : t("quiz.flagQuestion")}
            </button>
          </div>

          {/* Question Text */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <p className={cn(
              "text-gray-800 text-base leading-relaxed font-medium",
              lang === "ta" && "font-tamil text-lg"
            )}>
              {questionText}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            <p className={cn("text-gray-400 text-xs font-medium mb-2", lang === "ta" && "font-tamil")}>
              {t("quiz.chooseAnswer")}
            </p>
            {options.map((option, idx) => {
              const optionText = lang === "ta" && option.text_ta ? option.text_ta : option.text || option;
              const isSelected = answers[currentIndex] === idx;
              const optionLabel = ["A", "B", "C", "D"][idx] || String(idx + 1);

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all group hover:shadow-md",
                    isSelected
                      ? "bg-primary/10 border-primary text-gray-900 shadow-md"
                      : "bg-white border-gray-200 text-gray-700 hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all",
                    isSelected
                      ? "bg-primary border-primary text-white"
                      : "border-gray-300 text-gray-400 group-hover:border-primary/50"
                  )}>
                    {optionLabel}
                  </div>
                  <span className={cn("flex-1 text-sm leading-relaxed pt-0.5", lang === "ta" && "font-tamil text-base")}>
                    {optionText}
                  </span>
                  {isSelected && (
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => currentIndex > 0 && handleNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                currentIndex === 0
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-gray-300 text-gray-600 hover:border-primary/50 hover:text-primary hover:bg-primary/5"
              )}
            >
              ← {t("quiz.prev")}
            </button>

            <div className="text-gray-400 text-xs text-center hidden sm:block">
              <span className="text-green-500 font-semibold">{answeredCount}</span> / {questions.length} {t("quiz.answered")}
            </div>

            <button
              onClick={() => currentIndex < questions.length - 1 && handleNavigate(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                currentIndex === questions.length - 1
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-gray-300 text-gray-600 hover:border-primary/50 hover:text-primary hover:bg-primary/5"
              )}
            >
              {t("quiz.next")} →
            </button>
          </div>
        </main>

        {/* ── Right: OMR Panel (desktop) ────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-72 border-l border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-gray-800 font-bold text-sm mb-3">{t("quiz.omrPanel")}</h3>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { color: "bg-green-500/20 border-green-500/40", label: t("quiz.answered"), count: answeredCount },
                { color: "bg-orange-500/20 border-orange-500/40", label: t("quiz.flagged"), count: flaggedCount },
                { color: "bg-blue-500/20 border-blue-500/40", label: t("quiz.currentQuestion"), count: 1 },
                { color: "bg-gray-100 border-gray-200", label: t("quiz.unanswered"), count: questions.length - answeredCount },
              ].map(({ color, label, count }) => (
                <div key={label} className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs", color)}>
                  <span className="font-bold text-gray-700">{count}</span>
                  <span className="text-gray-500 truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OMR Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, idx) => (
                <OMRBubble
                  key={idx}
                  number={idx + 1}
                  status={getQuestionStatus(idx)}
                  onClick={() => handleNavigate(idx)}
                />
              ))}
            </div>
          </div>

          {/* Submit button in panel */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-bold text-sm rounded-xl shadow-md hover:opacity-90 transition-all"
            >
              {t("quiz.submit")}
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile OMR Drawer */}
      {omrPanelOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOmrPanelOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{t("quiz.omrPanel")}</h3>
              <button
                onClick={() => setOmrPanelOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="grid grid-cols-6 gap-2 mb-4">
                {questions.map((_, idx) => (
                  <OMRBubble
                    key={idx}
                    number={idx + 1}
                    status={getQuestionStatus(idx)}
                    onClick={() => handleNavigate(idx)}
                  />
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-bold text-sm rounded-xl"
              >
                {t("quiz.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Submit Modal */}
      <ConfirmModal
        isOpen={showModal}
        onConfirm={handleFinalSubmit}
        onCancel={() => setShowModal(false)}
        t={t}
      />
    </div>
  );
};

export default DynamicQuizEngine;
