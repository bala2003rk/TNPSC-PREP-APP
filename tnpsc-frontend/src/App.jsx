import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMe } from "./store/slices/authSlice";
import { loadExam } from "./store/slices/examSlice";
import api from "./utils/api";

// ── Pages ─────────────────────────────────────────────────────────────────────
import LoginPage           from "./pages/LoginPage";
import RegisterPage        from "./pages/RegisterPage";
import ForgotPasswordPage   from "./pages/ForgotPasswordPage";
import ProfilePage         from "./pages/ProfilePage";
import TestListPage        from "./pages/TestListPage";
import CompletedAttemptsPage from "./pages/CompletedAttemptsPage";
import AdminPage           from "./pages/AdminPage";
import CreateTestPage      from "./pages/CreateTestPage";
import LeaderboardPage     from "./pages/LeaderboardPage";
import StudyMaterialsPage  from "./pages/StudyMaterialsPage";
import SyllabusPage        from "./pages/SyllabusPage";

// ── Components ────────────────────────────────────────────────────────────────
import Navbar              from "./components/common/Navbar";
import DynamicQuizEngine   from "./components/quiz/DynamicQuizEngine";
import ResultScreen        from "./components/quiz/ResultScreen";
import AnalyticsDashboard  from "./components/analytics/AnalyticsDashboard";

// ─── Dashboard ────────────────────────────────────────────────────────────────
const DashboardPage = () => (
  <div className="min-h-screen bg-gray-50">
    <AnalyticsDashboard />
  </div>
);

// ─── Exam Page ────────────────────────────────────────────────────────────────
const ExamPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((s) => s.exam);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    dispatch(loadExam(id))
      .unwrap()
      .catch((err) => setError(err?.message || "Failed to load exam"))
      .finally(() => setLoading(false));
  }, [id, dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading exam…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => navigate("/tests")}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
        >
          Back to Tests
        </button>
      </div>
    );
  }

  return <DynamicQuizEngine />;
};

// ─── Results Page ─────────────────────────────────────────────────────────────
const ResultsPage = () => {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const backTo = location.state?.from || "/tests";
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api.get(`/tests/attempts/${attemptId}/review`)
      .then(({ data }) => {
        if (!active) return;
        const questions = (data.questions || []).map((question) => ({
          ...question,
          questionText: question.questionText,
        }));
        const attempt = data.attempt;
        setReview({
          questions,
          answers: questions.map((question) => question.selectedOption),
          result: {
            attemptId: attempt._id,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            correct: attempt.correct,
            incorrect: attempt.incorrect,
            skipped: attempt.skipped,
            accuracy: attempt.accuracy,
            timeTaken: attempt.timeTaken,
            sectionBreakdown: attempt.sectionWiseAnalysis || [],
          },
        });
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || "Failed to load test review.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
        <p className="text-gray-400 text-sm">Loading results…</p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
        <p className="text-red-500 text-sm">{error || "Test review not found."}</p>
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="text-primary text-sm font-semibold"
        >
          Back to Tests
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResultScreen review={review} backTo={backTo} />
    </div>
  );
};

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((s) => s.auth);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// ─── Admin Route ──────────────────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ─── Layout ───────────────────────────────────────────────────────────────────
const Layout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <main className="flex-1">{children}</main>
  </div>
);

// ─── Toast Container ──────────────────────────────────────────────────────────
const ToastContainer = () => {
  const toasts = useSelector((s) => s.ui?.toasts || []);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl border shadow-xl text-sm font-medium pointer-events-auto max-w-sm animate-fade-in ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : toast.type === "warning"
              ? "bg-yellow-50 border-yellow-200 text-yellow-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

// ─── App Init ─────────────────────────────────────────────────────────────────
const AppInitialiser = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) dispatch(fetchMe());
  }, [dispatch]);
  return null;
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const App = () => (
  <BrowserRouter>
    <AppInitialiser />
    <ToastContainer />
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected with Navbar */}
      <Route path="/" element={
        <ProtectedRoute><Layout><Navigate to="/dashboard" replace /></Layout></ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
      } />

      <Route path="/tests" element={
        <ProtectedRoute><Layout><TestListPage /></Layout></ProtectedRoute>
      } />

      <Route path="/tests/completed/:type/:examId" element={
        <ProtectedRoute><Layout><CompletedAttemptsPage /></Layout></ProtectedRoute>
      } />

      <Route path="/pyq" element={
        <ProtectedRoute><Layout><TestListPage initialType="PYQ" isPYQ /></Layout></ProtectedRoute>
      } />

      <Route path="/leaderboard" element={
        <ProtectedRoute><Layout><LeaderboardPage /></Layout></ProtectedRoute>
      } />

      <Route path="/materials" element={
        <ProtectedRoute><Layout><StudyMaterialsPage /></Layout></ProtectedRoute>
      } />

      <Route path="/syllabus" element={
        <ProtectedRoute><Layout><SyllabusPage /></Layout></ProtectedRoute>
      } />

      {/* Exam — no Navbar */}
      <Route path="/exam/:id" element={
        <ProtectedRoute><ExamPage /></ProtectedRoute>
      } />

      <Route path="/results/:attemptId" element={
        <ProtectedRoute><Layout><ResultsPage /></Layout></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <AdminRoute><Layout><AdminPage /></Layout></AdminRoute>
      } />

      <Route path="/admin/create-test" element={
        <AdminRoute><Layout><CreateTestPage /></Layout></AdminRoute>
      } />

      <Route path="/admin/edit-test/:id" element={
        <AdminRoute><Layout><CreateTestPage /></Layout></AdminRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
