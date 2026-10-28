import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

const getTitle = (exam, lang) => {
  const title = exam?.title;
  if (typeof title === "string") return title;
  if (title && typeof title === "object") {
    return (lang === "ta" && title.ta) || title.en || title.ta || "";
  }
  return "";
};

const CompletedAttemptsPage = () => {
  const { type, examId } = useParams();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const listPath = `/tests?type=${encodeURIComponent(type)}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.get("/tests/attempts/history", { params: { type } })
      .then(({ data }) => {
        if (!active) return;
        const completedTest = (data.attempts || []).find(
          (item) => item.examId?._id === examId
        );
        if (!completedTest) {
          setError(t("tests.noAttempts"));
          return;
        }
        setTest(completedTest.examId);
        setAttempts(completedTest.attempts || []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || t("common.error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [examId, type, t]);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-dark px-4 pt-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(listPath, { replace: true })}
            className="text-sm text-white/60 hover:text-white mb-5"
          >
            ← {type === "DAILY_QUIZ" ? t("tests.dailyQuiz") : t("tests.mock")}
          </button>
          <h1 className={cn("text-2xl font-black text-white", lang === "ta" && "font-tamil")}>
            {test ? getTitle(test, lang) : t("tests.attemptHistory")}
          </h1>
          <p className="text-white/50 text-sm mt-2">{t("tests.attemptHistory")}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7">
          {loading ? (
            <p className="text-sm text-gray-400">{t("common.loading")}</p>
          ) : error ? (
            <div className="space-y-4">
              <p className="text-sm text-red-500">{error}</p>
              <button
                type="button"
                onClick={() => navigate(listPath, { replace: true })}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
              >
                ← {type === "DAILY_QUIZ" ? t("tests.dailyQuiz") : t("tests.mock")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt, index) => (
                <div
                  key={attempt._id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between border border-gray-100 rounded-xl p-4"
                >
                  <div>
                    <p className="font-bold text-gray-800">
                      {t("tests.attempt")} {index + 1}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {attempt.submittedAt && new Date(attempt.submittedAt).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-primary font-black">
                      {attempt.score}/{attempt.totalMarks}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/results/${attempt._id}`, {
                        state: { from: listPath },
                      })}
                      className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 text-sm font-bold"
                    >
                      {t("tests.viewSolutions")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompletedAttemptsPage;
