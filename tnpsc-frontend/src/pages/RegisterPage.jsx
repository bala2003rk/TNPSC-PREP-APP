import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, firebaseLogin, clearError } from "../store/slices/authSlice";
import { setLang } from "../store/slices/uiSlice";
import LanguageToggle from "../components/common/LanguageToggle";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";
import { signInWithGoogle } from "../utils/firebase";

const TARGET_EXAMS = [
  { value: "GROUP_1", label: "Group I" },
  { value: "GROUP_2", label: "Group II" },
  { value: "GROUP_4", label: "Group IV" },
  { value: "VAO", label: "VAO" },
];

const RegisterPage = () => {
  const { t, lang } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((s) => s.auth);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    targetExams: [],
    preferredLang: "en",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [step, setStep] = useState(1); // 2-step form
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
    return () => dispatch(clearError());
  }, [isAuthenticated, navigate, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "confirmPassword" || name === "password") {
      setPasswordError("");
    }
  };

  const handleExamToggle = (exam) => {
    setForm((f) => ({
      ...f,
      targetExams: f.targetExams.includes(exam)
        ? f.targetExams.filter((e) => e !== exam)
        : [...f.targetExams, exam],
    }));
  };

  const handleLangPreference = (newLang) => {
    setForm((f) => ({ ...f, preferredLang: newLang }));
    dispatch(setLang(newLang));
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    setStep(2);
  };


// TO:
const handleSubmit = (e) => {
  e.preventDefault();
  const { confirmPassword, preferredLang, ...payload } = form;
  payload.languagePreference = preferredLang;  // rename to match backend
  dispatch(registerUser(payload));
};

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setGoogleError("");
    dispatch(clearError());
    try {
      const { idToken } = await signInWithGoogle();
      await dispatch(firebaseLogin(idToken)).unwrap();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      setGoogleError(
        typeof err === "string"
          ? err
          : err.response?.data?.message || err.message || "Google sign-in failed. Please try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-dark via-[#1a2a3a] to-[#0f2235] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-secondary blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-primary blur-3xl" />
        </div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,.2) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-secondary/40">
            <span className="text-white text-3xl font-black">T</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">
            Join <span className="text-secondary">TNPSC</span> Prep
          </h1>
          <p className="text-white/50 text-lg mb-8">{t("common.tagline")}</p>
          <div className="space-y-3 text-left">
            {[
              { icon: "🎯", text: "Personalized study plan based on your target exam" },
              { icon: "📊", text: "AI-powered weakness detection & improvement tips" },
              { icon: "🏆", text: "Compete with thousands of TNPSC aspirants" },
              { icon: "🌐", text: "Full Tamil & English bilingual support" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3 bg-white/5 border border-white/8 rounded-xl p-3">
                <span className="text-xl">{icon}</span>
                <span className="text-white/60 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Register form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-8">
            <LanguageToggle />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    step >= s
                      ? "bg-primary text-white"
                      : "bg-white/10 text-white/30"
                  )}
                >
                  {step > s ? "✓" : s}
                </div>
                {s < 2 && (
                  <div className={cn("w-12 h-0.5 transition-all", step > s ? "bg-primary" : "bg-white/10")} />
                )}
              </div>
            ))}
            <span className="ml-2 text-white/40 text-xs">
              {step === 1 ? "Account Info" : "Preferences"}
            </span>
          </div>

          <div className={cn("mb-6", lang === "ta" && "font-tamil")}>
            <h2 className="text-3xl font-black text-white mb-1">{t("auth.registerTitle")}</h2>
            <p className="text-white/50 text-sm">{t("auth.registerSubtitle")}</p>
          </div>

          {(googleError || error) && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{googleError || error}</p>
            </div>
          )}

          {/* Step 1: Account details */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white hover:bg-white/10 transition-all font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {googleLoading ? "Signing in..." : t("auth.googleSignUp")}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-dark text-white/30 text-xs">{t("auth.orContinueWith")}</span>
                </div>
              </div>

              <div>
                <label className={cn("block text-xs text-white/50 mb-1.5", lang === "ta" && "font-tamil")}>
                  {t("auth.name")}
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t("auth.namePlaceholder")}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-primary focus:bg-white/8 transition-all text-sm"
                />
              </div>

              <div>
                <label className={cn("block text-xs text-white/50 mb-1.5", lang === "ta" && "font-tamil")}>
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-primary focus:bg-white/8 transition-all text-sm"
                />
              </div>

              <div>
                <label className={cn("block text-xs text-white/50 mb-1.5", lang === "ta" && "font-tamil")}>
                  {t("auth.phone")}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder={t("auth.phonePlaceholder")}
                  className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-primary focus:bg-white/8 transition-all text-sm"
                />
              </div>

              <div>
                <label className={cn("block text-xs text-white/50 mb-1.5", lang === "ta" && "font-tamil")}>
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={t("auth.passwordPlaceholder")}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-primary focus:bg-white/8 transition-all text-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div>
                <label className={cn("block text-xs text-white/50 mb-1.5", lang === "ta" && "font-tamil")}>
                  {t("auth.confirmPassword")}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                  className={cn(
                    "w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/25 focus:outline-none transition-all text-sm",
                    passwordError ? "border-red-500/50 focus:border-red-500" : "border-white/15 focus:border-primary focus:bg-white/8"
                  )}
                />
                {passwordError && (
                  <p className="text-red-400 text-xs mt-1">{passwordError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 transition-all"
              >
                {t("common.next")} →
              </button>
            </form>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Exams */}
              <div>
                <label className={cn("block text-sm text-white/70 mb-3 font-semibold", lang === "ta" && "font-tamil")}>
                  {t("auth.targetExams")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_EXAMS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleExamToggle(value)}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left",
                        form.targetExams.includes(value)
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-white/5 border-white/15 text-white/60 hover:border-white/30 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                          form.targetExams.includes(value) ? "border-primary bg-primary" : "border-white/30"
                        )}>
                          {form.targetExams.includes(value) && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Preference */}
              <div>
                <label className={cn("block text-sm text-white/70 mb-3 font-semibold", lang === "ta" && "font-tamil")}>
                  {t("auth.languagePreference")}
                </label>
                <div className="flex gap-3">
                  {["en", "ta"].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => handleLangPreference(l)}
                      className={cn(
                        "flex-1 py-3 rounded-xl border text-sm font-medium transition-all",
                        form.preferredLang === l
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-white/5 border-white/15 text-white/60 hover:border-white/30"
                      )}
                    >
                      {l === "en" ? "English" : <span className="font-tamil">தமிழ்</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all text-sm"
                >
                  ← {t("common.back")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all",
                    loading
                      ? "bg-primary/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30"
                  )}
                >
                  {loading ? t("auth.registering") : t("auth.register")}
                </button>
              </div>
            </form>
          )}

          <p className={cn("text-center text-sm text-white/40 mt-6", lang === "ta" && "font-tamil")}>
            {t("auth.alreadyHaveAccount")}{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
              {t("auth.loginHere")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
