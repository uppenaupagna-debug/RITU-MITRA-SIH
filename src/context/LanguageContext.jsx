import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../data/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem("raitu_lang") || "en";
    } catch {
      return "en";
    }
  });

  const setLanguage = (lang) => {
    if (!lang) return;
    setLanguageState(lang);
    try {
      localStorage.setItem("raitu_lang", lang);
      // Synchronize cookie for Google Translate fallback if active
      document.cookie = `googtrans=/en/${lang};path=/;max-age=31536000`;
    } catch {
      // Ignore storage errors in restricted contexts
    }

    // If Google Translate combo exists in the DOM, silently trigger it without page reload
    try {
      const combo = document.querySelector(".goog-te-combo");
      if (combo && combo.value !== lang) {
        combo.value = lang;
        combo.dispatchEvent(new Event("change"));
      }
    } catch {
      // Ignore
    }
  };

  // Safe translation helper
  const t = (key) => {
    if (!key) return "";
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const defaultDict = translations["en"];
    if (defaultDict && defaultDict[key]) {
      return defaultDict[key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      language: "en",
      setLanguage: () => {},
      t: (key) => translations["en"]?.[key] || key,
    };
  }
  return context;
}
