import { useDispatch, useSelector } from "react-redux";
import { setLang } from "../../store/slices/uiSlice";
import { cn } from "../../utils/cn";

const LanguageToggle = ({ className = "" }) => {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.ui.lang);

  const handleToggle = (newLang) => {
    if (newLang !== lang) {
      dispatch(setLang(newLang));
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center bg-dark/30 border border-white/10 rounded-full p-0.5",
        className
      )}
      role="group"
      aria-label="Language toggle"
    >
      <button
        onClick={() => handleToggle("en")}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          lang === "en"
            ? "bg-primary text-white shadow-md"
            : "text-white/60 hover:text-white"
        )}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        onClick={() => handleToggle("ta")}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary font-tamil",
          lang === "ta"
            ? "bg-primary text-white shadow-md"
            : "text-white/60 hover:text-white"
        )}
        aria-pressed={lang === "ta"}
      >
        தமிழ்
      </button>
    </div>
  );
};

export default LanguageToggle;
