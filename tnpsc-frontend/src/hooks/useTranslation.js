import { useCallback } from "react";
import { useSelector } from "react-redux";
import translations from "../i18n/translations";

/**
 * useTranslation
 * Returns a `t(key)` function where key is dot-notation e.g. "auth.login"
 * Reads the current language from the Redux ui slice.
 */
const useTranslation = () => {
  const lang = useSelector((state) => state.ui.lang);

  const t = useCallback((key) => {
    const keys = key.split(".");
    let value = translations[lang] || translations["en"];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key missing in current lang
        let fallback = translations["en"];
        for (const fk of keys) {
          if (fallback && typeof fallback === "object" && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return key; // Return raw key as last resort
          }
        }
        return typeof fallback === "string" ? fallback : key;
      }
    }
    return typeof value === "string" ? value : key;
  }, [lang]);

  return { t, lang };
};

export default useTranslation;
