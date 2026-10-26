import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "../store/slices/authSlice";
import api from "../utils/api";
import useTranslation from "../hooks/useTranslation";
import { cn } from "../utils/cn";

const TARGET_EXAMS = ["GROUP_1","GROUP_2","GROUP_2A","GROUP_4","VAO"];

// ── Avatar Upload Component ───────────────────────────────────────────────────
const AvatarUpload = ({ user, t, onAvatarUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(user?.avatar || null);
  const [error,     setError]     = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError(null);
    setUploading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      setPreview(base64);
      try {
        const res = await api.post("/profile/avatar", { avatar: base64 });
        onAvatarUpdate(res.data?.data?.avatar);
      } catch (err) {
        setError(err.response?.data?.message || "Upload failed");
        setPreview(user?.avatar || null);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="w-24 h-24 rounded-full overflow-hidden cursor-pointer border-4 border-white shadow-lg group-hover:opacity-80 transition-opacity"
        >
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-black">
              {initial}
            </div>
          )}
        </div>
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
      </div>
      <p className="text-gray-400 text-xs">Click photo to change</p>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
};

// ── Stats Strip ───────────────────────────────────────────────────────────────
const StatsStrip = ({ stats }) => {
  const items = [
    { label: "Tests Taken",  value: stats?.totalTestsTaken ?? 0, icon: "📝" },
    { label: "Questions",    value: stats?.totalQuestionsAttempted ?? 0, icon: "❓" },
    { label: "Avg Accuracy", value: `${stats?.averageAccuracy ?? 0}%`, icon: "🎯" },
    { label: "Day Streak",   value: stats?.currentStreak ?? 0, icon: "🔥" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, icon }) => (
        <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
          <div className="text-2xl mb-1">{icon}</div>
          <div className="text-xl font-black text-gray-900">{value}</div>
          <div className="text-gray-400 text-xs">{label}</div>
        </div>
      ))}
    </div>
  );
};

// ── Change Password Section ───────────────────────────────────────────────────
const ChangePasswordSection = ({ t }) => {
  const [form,    setForm]    = useState({ currentPassword:"", newPassword:"", confirmPassword:"" });
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match"); return;
    }
    if (form.newPassword.length < 8) {
      setError("Password must be at least 8 characters"); return;
    }
    setSaving(true); setError(null);
    try {
      await api.patch("/profile/change-password", {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      });
      setSuccess(true);
      setForm({ currentPassword:"", newPassword:"", confirmPassword:"" });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800 placeholder-gray-400";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
        🔒 Change Password
      </h3>
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          ✅ Password changed successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password</label>
          <input type="password" value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            placeholder="Enter current password" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
          <input type="password" value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
            placeholder="Min 8 characters" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm New Password</label>
          <input type="password" value={form.confirmPassword}
            onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
            placeholder="Repeat new password" className={inputCls} required />
        </div>
        <button type="submit" disabled={saving}
          className={cn("w-full py-3 rounded-xl font-bold text-white text-sm transition-all",
            saving ? "bg-primary/50 cursor-not-allowed" : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md")}>
          {saving ? "Changing..." : "Change Password"}
        </button>
      </form>
    </div>
  );
};

// ── Main ProfilePage ──────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { t, lang }   = useTranslation();
  const dispatch      = useDispatch();
  const { user }      = useSelector((s) => s.auth);

  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState(null);
  const [activeTab,setActiveTab]= useState("profile");

  const [form, setForm] = useState({
    name:               "",
    phone:              "",
    targetExams:        [],
    languagePreference: "en",
  });

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile");
        const data = res.data?.data || res.data;
        setProfile(data);
        setForm({
          name:               data.name               || "",
          phone:              data.phone              || "",
          targetExams:        data.targetExams        || [],
          languagePreference: data.languagePreference || "en",
        });
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(false);
    try {
      const res = await api.patch("/profile", form);
      const updated = res.data?.data;
      setProfile(updated);
      dispatch(updateUser(updated)); // sync Redux auth state
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const toggleExam = (exam) => {
    setForm(f => ({
      ...f,
      targetExams: f.targetExams.includes(exam)
        ? f.targetExams.filter(e => e !== exam)
        : [...f.targetExams, exam],
    }));
  };

  const handleAvatarUpdate = (url) => {
    setProfile(p => ({ ...p, avatar: url }));
    dispatch(updateUser({ avatar: url }));
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white text-gray-800 placeholder-gray-400";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-dark px-4 pt-8 pb-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-black text-white mb-1">My Profile</h1>
          <p className="text-white/40 text-sm">Manage your account and preferences</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-16 pb-12 space-y-5">
        {/* Avatar + name card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <AvatarUpload user={profile} t={t} onAvatarUpdate={handleAvatarUpdate} />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-black text-gray-900">{profile?.name}</h2>
              <p className="text-gray-400 text-sm">{profile?.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold border",
                  profile?.role === "admin"
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-blue-100 text-blue-700 border-blue-200"
                )}>
                  {profile?.role === "admin" ? "👑 Admin" : "👤 Student"}
                </span>
                {profile?.subscription?.isActive && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    ⭐ Premium
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsStrip stats={profile?.stats} />

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm flex gap-1">
          {[
            { key:"profile",  label:"Profile Info" },
            { key:"password", label:"Security" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                activeTab === key
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-md"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* Profile Info Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-5">👤 Personal Information</h3>

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                ✅ Profile updated successfully!
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              {/* Name */}
              <div>
                <label className={labelCls}>Full Name</label>
                <input value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name" className={inputCls} required />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className={labelCls}>Email Address</label>
                <input value={profile?.email || ""} readOnly
                  className={cn(inputCls, "bg-gray-50 text-gray-400 cursor-not-allowed")} />
                <p className="text-gray-400 text-xs mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label className={labelCls}>Phone Number</label>
                <input value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="10-digit mobile number" className={inputCls} type="tel" />
              </div>

              {/* Target Exams */}
              <div>
                <label className={labelCls}>Target Exams</label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_EXAMS.map(exam => (
                    <button key={exam} type="button" onClick={() => toggleExam(exam)}
                      className={cn(
                        "px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
                        form.targetExams.includes(exam)
                          ? "bg-primary/15 border-primary text-primary"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                      )}>
                      {exam}
                    </button>
                  ))}
                </div>
              </div>

              {/* Member since */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-400 text-xs">
                  Member since{" "}
                  <span className="font-semibold text-gray-600">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" })
                      : "—"}
                  </span>
                </p>
              </div>

              <button type="submit" disabled={saving}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-white text-sm transition-all",
                  saving ? "bg-primary/50 cursor-not-allowed" : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md"
                )}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "password" && (
          <ChangePasswordSection t={t} />
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
