import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMe } from "./store/slices/authSlice";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TestListPage from "./pages/TestListPage";
import AdminPage from "./pages/AdminPage";

// Components
import Navbar from "./components/common/Navbar";
import DynamicQuizEngine from "./components/quiz/DynamicQuizEngine";
import ResultScreen from "./components/quiz/ResultScreen";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";

// ── Dashboard page (inline, thin wrapper around AnalyticsDashboard) ───────────
const DashboardPage = () => (
  <div className="min-h-screen bg-gray-50">
    <AnalyticsDashboard />
  </div>
);

// ── Exam page wrapper ─────────────────────────────────────────────────────────
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch as useD } from "react-redux";
import { loadExam } from "./store/slices/examSlice";
import { useEffect as useE, useState as useS } from "react";

const ExamPage = () => {
  const { id } = useParams();
  const dispatch = useD();
  const navigate = useNavigate();
  const { status, result } = useSelector((s) => s.exam);
  const [loading, setLoading] = useS(true);

  useE(() => {
    dispatch(loadExam(id))
      .unwrap()
      .catch(() => navigate("/tests"))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (status === "completed" && result) {
    return <Navigate to={`/results/${result.attemptId}`} replace />;
  }

  return <DynamicQuizEngine />;
};

// ── Results page wrapper ──────────────────────────────────────────────────────
const ResultsPage = () => {
  const { attemptId } = useParams();
  const { result } = useSelector((s) => s.exam);

  // If navigated directly without state, result may be null — show loading/redirect
  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-400 text-sm">Loading results…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResultScreen />
    </div>
  );
};

// ── Protected Route ───────────────────────────────────────────────────────────
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

// ── Admin Route ───────────────────────────────────────────────────────────────
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

// ── Layout with Navbar ────────────────────────────────────────────────────────
const Layout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <main className="flex-1">{children}</main>
  </div>
);

// ── App Initialiser ───────────────────────────────────────────────────────────
const AppInitialiser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      dispatch(fetchMe());
    }
  }, [dispatch]);

  return null;
};

// ── Toast Container (reads from ui.toasts) ────────────────────────────────────
const ToastContainer = () => {
  const toasts = useSelector((s) => s.ui.toasts);

  if (!toasts?.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl border shadow-xl text-sm font-medium pointer-events-auto animate-fade-in max-w-sm ${
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

// ── Root App ──────────────────────────────────────────────────────────────────
const App = () => {
  return (
   <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppInitialiser />
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes with Navbar */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Navigate to="/dashboard" replace />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests"
          element={
            <ProtectedRoute>
              <Layout>
                <TestListPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Exam — no Navbar during exam */}
        <Route
          path="/exam/:id"
          element={
            <ProtectedRoute>
              <ExamPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results/:attemptId"
          element={
            <ProtectedRoute>
              <Layout>
                <ResultsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin route */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Layout>
                <AdminPage />
              </Layout>
            </AdminRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
