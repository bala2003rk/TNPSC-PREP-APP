import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import LanguageToggle from "../components/common/LanguageToggle";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

// ── Step 1: Enter Email ───────────────────────────────────────────────────────
const StepEmail = ({ onSuccess, t, lang }) => {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    setLoading(true); setError(null);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      onSuccess(email.trim().toLowerCase());
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/15 border border-primary/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
          🔐
        </div>
        <h2 className={cn("text-2xl font-black text-white mb-2", lang === "ta" && "font-tamil")}>
          Forgot Password?
        </h2>
        <p className="text-white/50 text-sm">
          Enter your registered email and we'll send a 6-digit OTP.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            required
            className="w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-primary text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-white text-sm transition-all",
            loading
              ? "bg-primary/50 cursor-not-allowed"
              : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30"
          )}
        >
          {loading ? "Sending OTP..." : "Send OTP →"}
        </button>
      </form>
    </div>
  );
};

// ── Step 2: Enter OTP ─────────────────────────────────────────────────────────
const StepOtp = ({ email, onSuccess, onBack, t, lang }) => {
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [resending,setResending] = useState(false);
  const [resent,  setResent]  = useState(false);
  const inputs = Array(6).fill(null).map(() => null);
  const refs   = inputs.map(() => ({ current: null }));

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return; // digits only
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    // Auto-focus next input
    if (val && idx < 5) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    refs[Math.min(pasted.length, 5)].current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length < 6) { setError("Please enter the complete 6-digit OTP"); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp: otpStr });
      onSuccess(res.data?.resetToken);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
      setOtp(["","","","","",""]);
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true); setError(null);
    try {
      await api.post("/auth/forgot-password", { email });
      setResent(true);
      setOtp(["","","","","",""]);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      setError("Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-500/15 border border-green-500/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
          📧
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Check Your Email</h2>
        <p className="text-white/50 text-sm">
          We sent a 6-digit OTP to
        </p>
        <p className="text-primary font-semibold text-sm mt-1">{email}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}
      {resent && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
          ✅ New OTP sent to your email!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP input boxes */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-3 text-center">
            Enter 6-digit OTP
          </label>
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { refs[idx].current = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className={cn(
                  "w-11 h-14 text-center text-xl font-black border-2 rounded-xl bg-white/8 text-white focus:outline-none transition-all",
                  digit
                    ? "border-primary bg-primary/15"
                    : "border-white/20 focus:border-primary"
                )}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || otp.join("").length < 6}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-white text-sm transition-all",
            loading || otp.join("").length < 6
              ? "bg-primary/50 cursor-not-allowed"
              : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30"
          )}
        >
          {loading ? "Verifying..." : "Verify OTP →"}
        </button>
      </form>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-white/40 text-sm hover:text-white transition-colors"
        >
          ← Change email
        </button>
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-primary text-sm hover:text-primary/80 transition-colors font-medium disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>
      </div>
    </div>
  );
};

// ── Step 3: New Password ──────────────────────────────────────────────────────
const StepNewPassword = ({ resetToken, t, lang }) => {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ password:"", confirm:"" });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError(null);
    try {
      await api.post("/auth/reset-password", {
        resetToken,
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-green-500/15 border border-green-500/30 rounded-full flex items-center justify-center text-4xl mx-auto">
          ✅
        </div>
        <h2 className="text-2xl font-black text-white">Password Reset!</h2>
        <p className="text-white/50 text-sm">
          Your password has been reset successfully.
          Redirecting to login...
        </p>
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-primary text-sm pr-11";

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-accent/15 border border-accent/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
          🔑
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Set New Password</h2>
        <p className="text-white/50 text-sm">Choose a strong password for your account.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 8 characters"
              required
              className={inputCls}
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {show ? "🙈" : "👁️"}
            </button>
          </div>
          {/* Password strength indicator */}
          {form.password && (
            <div className="mt-2 flex gap-1">
              {[1,2,3,4].map(i => (
                <div key={i} className={cn(
                  "flex-1 h-1 rounded-full transition-all",
                  form.password.length >= i * 2 + 4
                    ? i <= 1 ? "bg-red-400"
                    : i <= 2 ? "bg-orange-400"
                    : i <= 3 ? "bg-yellow-400"
                    : "bg-green-400"
                    : "bg-white/10"
                )} />
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5">Confirm Password</label>
          <input
            type={show ? "text" : "password"}
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            placeholder="Repeat new password"
            required
            className={cn(
              inputCls,
              form.confirm && form.password !== form.confirm
                ? "border-red-500/50"
                : form.confirm && form.password === form.confirm
                ? "border-green-500/50"
                : ""
            )}
          />
          {form.confirm && form.password !== form.confirm && (
            <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-white text-sm transition-all",
            loading
              ? "bg-primary/50 cursor-not-allowed"
              : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30"
          )}
        >
          {loading ? "Resetting..." : "Reset Password ✓"}
        </button>
      </form>
    </div>
  );
};

// ── Main ForgotPasswordPage ───────────────────────────────────────────────────
const ForgotPasswordPage = () => {
  const { t, lang } = useTranslation();
  const [step,       setStep]       = useState(1); // 1=email, 2=otp, 3=newPassword
  const [email,      setEmail]      = useState("");
  const [resetToken, setResetToken] = useState("");

  const stepLabels = ["Email", "OTP", "New Password"];

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end mb-8">
          <LanguageToggle />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            return (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all",
                    step > n  ? "bg-green-500 border-green-500 text-white" :
                    step === n ? "bg-primary border-primary text-white" :
                                 "bg-white/10 border-white/20 text-white/30"
                  )}>
                    {step > n ? "✓" : n}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium whitespace-nowrap",
                    step === n ? "text-primary" : "text-white/30"
                  )}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mb-4 transition-all",
                    step > n ? "bg-green-500" : "bg-white/10"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-dark/60 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {step === 1 && (
            <StepEmail
              t={t} lang={lang}
              onSuccess={(mail) => { setEmail(mail); setStep(2); }}
            />
          )}
          {step === 2 && (
            <StepOtp
              t={t} lang={lang}
              email={email}
              onBack={() => setStep(1)}
              onSuccess={(token) => { setResetToken(token); setStep(3); }}
            />
          )}
          {step === 3 && (
            <StepNewPassword
              t={t} lang={lang}
              resetToken={resetToken}
            />
          )}
        </div>

        {/* Back to login */}
        {step === 1 && (
          <p className="text-center text-sm text-white/40 mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Back to Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
