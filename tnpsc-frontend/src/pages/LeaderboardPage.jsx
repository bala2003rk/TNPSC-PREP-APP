import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

// ── Skeleton Row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(5)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 bg-gray-100 rounded w-3/4 mx-auto" />
      </td>
    ))}
  </tr>
);

// ── Medal Badge ───────────────────────────────────────────────────────────────
const RankBadge = ({ rank }) => {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
      {rank}
    </span>
  );
};

// ── Leaderboard Table ─────────────────────────────────────────────────────────
const LeaderboardTable = ({ rows, currentUserId, t, lang, loading }) => (
  <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          {[
            t("leaderboard.rank"),
            t("leaderboard.name"),
            t("leaderboard.score"),
            t("leaderboard.accuracy"),
            t("leaderboard.testsTaken"),
          ].map((h) => (
            <th
              key={h}
              className={cn(
                "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide",
                lang === "ta" && "font-tamil"
              )}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {loading ? (
          [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
              {t("leaderboard.noData")}
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const rank = row.rank || idx + 1;
            const isMe = row.userId === currentUserId || row._id === currentUserId;
            return (
              <tr
                key={row.userId || row._id || idx}
                className={cn(
                  "transition-colors",
                  isMe
                    ? "bg-primary/8 border-l-4 border-l-primary"
                    : rank <= 3
                    ? "bg-amber-50/60"
                    : "hover:bg-gray-50"
                )}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={rank} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(row.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className={cn("text-sm font-semibold text-gray-800", lang === "ta" && "font-tamil")}>
                        {row.name}
                      </span>
                      {isMe && (
                        <span className="ml-2 px-1.5 py-0.5 bg-primary/15 text-primary text-[10px] rounded-full font-bold">
                          {t("leaderboard.you")}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-800">{row.score ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {row.accuracy != null ? `${Math.round(row.accuracy)}%` : "—"}
                    </span>
                    {row.accuracy != null && (
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, row.accuracy)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.testsTaken ?? row.totalTests ?? "—"}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

// ── Main LeaderboardPage ──────────────────────────────────────────────────────
const LeaderboardPage = () => {
  const { t, lang } = useTranslation();
  const { user } = useSelector((s) => s.auth);

  const TABS = [
    { key: "global",  label: t("leaderboard.global") },
    { key: "weekly",  label: t("leaderboard.weekly") },
    { key: "perExam", label: t("leaderboard.perExam") },
  ];

  const [activeTab,   setActiveTab]   = useState("global");
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [exams,       setExams]       = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");

  // Fetch exams list for per-exam tab
  useEffect(() => {
    if (activeTab === "perExam" && exams.length === 0) {
      api.get("/tests", { params: { type: "MOCK", limit: 50 } })
        .then((r) => {
          const list = r.data?.data?.tests || r.data?.tests || r.data || [];
          setExams(list);
          if (list.length > 0) setSelectedExamId(list[0]._id);
        })
        .catch(console.error);
    }
  }, [activeTab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (activeTab === "global") {
        res = await api.get("/analytics/leaderboard/global", { params: { period: "30d" } });
      } else if (activeTab === "weekly") {
        res = await api.get("/analytics/leaderboard/global", { params: { period: "7d" } });
      } else if (activeTab === "perExam" && selectedExamId) {
        res = await api.get(`/tests/${selectedExamId}/leaderboard`);
      } else {
        setLoading(false);
        return;
      }
      const data = res.data?.data || res.data;
      setRows(Array.isArray(data) ? data : data?.leaderboard || data?.rankings || []);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedExamId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-dark px-4 pt-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <h1 className={cn("text-2xl font-black text-white mb-1", lang === "ta" && "font-tamil")}>
            🏆 {t("leaderboard.title")}
          </h1>
          <p className="text-white/40 text-sm">See how you rank among all aspirants</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 pb-12 space-y-5">
        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm flex gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setRows([]); }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all",
                activeTab === key
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-md"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
                lang === "ta" && "font-tamil"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Per-Exam Selector */}
        {activeTab === "perExam" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <label className={cn("block text-xs font-semibold text-gray-500 mb-2", lang === "ta" && "font-tamil")}>
              {t("leaderboard.selectExam")}
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white"
            >
              {exams.map((e) => (
                <option key={e._id} value={e._id}>
                  {lang === "ta" && e.title?.ta ? e.title.ta : e.title?.en || e.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="text-xs underline">{t("common.retry")}</button>
          </div>
        )}

        {/* Table */}
        <LeaderboardTable
          rows={rows}
          currentUserId={user?._id}
          t={t}
          lang={lang}
          loading={loading}
        />

        {/* User's rank callout */}
        {!loading && rows.length > 0 && (() => {
          const myRow = rows.find((r) => r.userId === user?._id || r._id === user?._id);
          if (!myRow) return null;
          return (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center gap-4">
              <RankBadge rank={myRow.rank || rows.indexOf(myRow) + 1} />
              <div>
                <p className="text-primary font-black text-lg">{t("leaderboard.you")}: #{myRow.rank || rows.indexOf(myRow) + 1}</p>
                <p className="text-gray-500 text-xs">
                  {t("leaderboard.score")}: {myRow.score} · {t("leaderboard.accuracy")}: {Math.round(myRow.accuracy ?? 0)}%
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default LeaderboardPage;
