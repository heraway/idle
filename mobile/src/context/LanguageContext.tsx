import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { LanguageCode, LANGUAGES, TranslationKey, translations } from "../i18n/translations";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: TranslationKey) => string;
}

const STORAGE_KEY = "idle:language";
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const isLanguage = (v: unknown): v is LanguageCode => LANGUAGES.some((l) => l.code === v);

// Language is kept on the device (so it applies instantly, even logged out) and mirrored to the
// account, so it follows the person to a new phone: logging in adopts the account's saved choice.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (isLanguage(saved)) setLanguageState(saved);
    });
  }, []);

  useEffect(() => {
    const fromAccount = (user as any)?.language;
    if (isLanguage(fromAccount)) {
      setLanguageState(fromAccount);
      AsyncStorage.setItem(STORAGE_KEY, fromAccount);
    }
  }, [user?.id]);

  const setLanguage = useCallback(
    async (code: LanguageCode) => {
      setLanguageState(code);
      await AsyncStorage.setItem(STORAGE_KEY, code);
      if (user) {
        try {
          await api("/users/me/settings", { method: "PATCH", body: { language: code } });
        } catch {
          // Saved on this device regardless; it will sync next time the setting is changed.
        }
      }
    },
    [user?.id]
  );

  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? translations.en[key] ?? key,
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
