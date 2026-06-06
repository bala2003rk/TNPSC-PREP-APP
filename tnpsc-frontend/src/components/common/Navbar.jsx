import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../store/slices/authSlice";
import { toggleSidebar } from "../../store/slices/uiSlice";
import LanguageToggle from "./LanguageToggle";
import useTranslation from "../../hooks/useTranslation";
import { cn } from "../../utils/cn";

const Navbar = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navLinks = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: "📊" },
    { to: "/tests", label: t("nav.tests"), icon: "📝" },
  ];

  if (user?.role === "admin") {
    navLinks.push({ to: "/admin", label: t("nav.admin"), icon: "⚙️" });
  }

  const handleLogout = () => {
    dispatch(logoutUser());
    setDropdownOpen(false);
    navigate("/login");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const avatarInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-50 bg-dark/95 backdrop-blur-md border-b border-white/8 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                onClick={() => dispatch(toggleSidebar())}
                className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-md group-hover:shadow-primary/40 transition-shadow">
                <span className="text-white text-sm font-black">T</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-white font-bold text-sm leading-none block">TNPSC</span>
                <span className="text-white/40 text-[10px] leading-none">PREP</span>
              </div>
            </Link>
          </div>

          {/* Center: Nav Links (desktop) */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-white/60 hover:text-white hover:bg-white/8"
                    )
                  }
                >
                  <span>{icon}</span>
                  {label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Right: Language Toggle + Avatar */}
          <div className="flex items-center gap-3">
            <LanguageToggle />

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold border-2 border-primary/30">
                      {avatarInitial}
                    </div>
                  )}
                  <svg
                    className={cn("w-3.5 h-3.5 text-white/50 transition-transform hidden sm:block", dropdownOpen && "rotate-180")}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-dark border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in z-50">
                    <div className="px-4 py-3 border-b border-white/8">
                      <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                      <p className="text-white/40 text-xs truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                      >
                        <span>📊</span> {t("nav.dashboard")}
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                      >
                        <span>👤</span> {t("nav.profile")}
                      </Link>
                    </div>
                    <div className="border-t border-white/8 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t("nav.logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm text-white/70 hover:text-white transition-colors"
                >
                  {t("auth.login")}
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  {t("auth.register")}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav Links */}
        {isAuthenticated && (
          <div className="lg:hidden flex items-center gap-1 pb-2 overflow-x-auto scrollbar-none">
            {navLinks.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-white/60 hover:text-white hover:bg-white/8"
                  )
                }
              >
                <span>{icon}</span>
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
