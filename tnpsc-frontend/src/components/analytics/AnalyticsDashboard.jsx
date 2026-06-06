import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import api from "../../utils/api";
import useTranslation from "../../hooks/useTranslation";
import { cn } from "../../utils/cn";

// ─── Colour Palette ────────────────────────────────────────────────────────────
const COLORS = ["#FF6B35", "#2D6A4F", "#FFB627", "#3b82f6", "#8b5cf6", "#ec4899"];

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark border border-white/15 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}
          {p.name?.toLowerCase().includes("accuracy") ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0", color)}>
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-gray-900 text-2xl font-black">{value}</p>
        {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  </div>
);

// ─── Weakness Card ─────────────────────────────────────────────────────────────
const WeaknessCard = ({ weakUnits, t, lang }) => (
  <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-lg">🤖</div>
      <h3 className={cn("font-bold text-gray-800 text-sm", lang === "ta" && "font-tamil")}>
        {t("analytics.weaknessDetector")}
      </h3>
    </div>
    {!weakUnits?.length ? (
      <p className={cn("text-green-600 text-sm", lang === "ta" && "font-tamil")}>
        ✅ {t("analytics.noWeakAreas")}
      </p>
    ) : (
      <div className="space-y-2">
        <p className={cn("text-orange-600 text-xs font-medium mb-3", lang === "ta" && "font-tamil")}>
          {t("analytics.weakUnits")}
        </p>
        {weakUnits.map((unit, i) => (
          <div key={i} className="bg-white border border-orange-100 rounded-xl p-3 flex items-start gap-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-red-500 text-xs font-bold">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-gray-800 text-sm font-semibold", lang === "ta" && "font-tamil")}>
                {lang === "ta" && unit.name_ta ? unit.name_ta : unit.name}
              </p>
              {unit.subject && (
                <p className="text-gray-400 text-xs">{unit.subject}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="px-2 py-0.5 bg-red-100 border border-red-200 rounded-full text-red-600 text-xs font-bold">
                {unit.accuracy}%
              </div>
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full"
                  style={{ width: `${unit.accuracy}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Main AnalyticsDashboard ───────────────────────────────────────────────────
const AnalyticsDashboard = () => {
  const { t, lang } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/analytics/dashboard/${user._id}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || t("analytics.errorLoading"));
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user?._id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className={cn("text-gray-400 text-sm", lang === "ta" && "font-tamil")}>{t("analytics.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const {
    subjectAccuracy = [],
    activityData = [],
    syllabusProgress = [],
    weakUnits = [],
    stats = {},
  } = data || {};

  // Format activity data for LineChart
  const activityChartData = activityData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    tests: d.testsCompleted,
    questions: d.questionsAttempted,
  }));

  // Format subject data for BarChart
  const subjectChartData = subjectAccuracy.map((s) => ({
    name: lang === "ta" && s.name_ta ? s.name_ta : s.name,
    accuracy: Math.round(s.accuracy),
    attempts: s.attempts,
  }));

  // Pie chart data
  const pieData = syllabusProgress.map((s) => ({
    name: lang === "ta" && s.name_ta ? s.name_ta : s.name,
    value: s.completed,
    total: s.total,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn("text-2xl font-black text-gray-900", lang === "ta" && "font-tamil")}>
            {t("analytics.title")}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{user?.name}</p>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon="🔥"
          label={lang === "ta" ? "நாள் தொடர்" : "Day Streak"}
          value={`${stats.streak ?? 0}`}
          sub={`${t("common.days")}`}
          color="bg-orange-50"
        />
        <StatCard
          icon="📝"
          label={t("analytics.testsCompleted")}
          value={stats.totalTests ?? 0}
          color="bg-blue-50"
        />
        <StatCard
          icon="🎯"
          label={t("analytics.accuracy")}
          value={`${stats.avgAccuracy ?? 0}%`}
          color="bg-green-50"
        />
        <StatCard
          icon="📈"
          label={t("analytics.questionsAttempted")}
          value={stats.totalQuestions ?? 0}
          color="bg-purple-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subject Accuracy Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className={cn("font-bold text-gray-800 mb-5 text-sm", lang === "ta" && "font-tamil")}>
            📊 {t("analytics.subjectAccuracy")}
          </h3>
          {subjectChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">{t("common.noData")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectChartData} margin={{ top: 5, right: 10, left: -20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="accuracy" name="Accuracy" radius={[6, 6, 0, 0]}>
                  {subjectChartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 30-Day Activity Line Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className={cn("font-bold text-gray-800 mb-5 text-sm", lang === "ta" && "font-tamil")}>
            📅 {t("analytics.activityChart")}
          </h3>
          {activityChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">{t("common.noData")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={activityChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#9ca3af" }}
                  interval={Math.floor(activityChartData.length / 6)}
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  type="monotone"
                  dataKey="tests"
                  name="Tests"
                  stroke="#FF6B35"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="questions"
                  name="Questions"
                  stroke="#2D6A4F"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie + Weakness Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Syllabus Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className={cn("font-bold text-gray-800 mb-5 text-sm", lang === "ta" && "font-tamil")}>
            🎓 {t("analytics.syllabusProgress")}
          </h3>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">{t("common.noData")}</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="bg-dark border border-white/15 rounded-lg px-2 py-1 text-xs text-white">
                          {payload[0].name}: {payload[0].value}/{payload[0].payload.total}
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
                    <span className="text-gray-600 text-xs flex-1 truncate">{item.name}</span>
                    <span className="text-gray-800 text-xs font-semibold">{item.value}/{item.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Weakness Detector */}
        <WeaknessCard weakUnits={weakUnits} t={t} lang={lang} />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
