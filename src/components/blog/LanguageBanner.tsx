"use client";

import type { SupportedLanguage } from "@/lib/blog/types";
import { LANGUAGE_NAMES } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { Globe, X } from "lucide-react";
import { useCallback, useState } from "react";

interface LanguageBannerProps {
  currentLang: SupportedLanguage;
  availableLanguages: SupportedLanguage[];
  slug: string;
}

export function LanguageBanner({ currentLang, availableLanguages, slug }: LanguageBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleLanguageSwitch = useCallback(
    (lang: SupportedLanguage) => {
      // Set cookie for persistence
      document.cookie = `spike-lang=${lang};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      // Store in localStorage as backup
      try {
        localStorage.setItem("spike-lang", lang);
      } catch {
        // Ignore storage errors
      }
      // Navigate with query param
      const url = lang === "en" ? `/blog/${slug}` : `/blog/${slug}?lang=${lang}`;
      window.location.href = url;
    },
    [slug],
  );

  if (dismissed || availableLanguages.length === 0) return null;

  const isTranslated = currentLang !== "en";
  const otherLanguages = availableLanguages.filter((l) => l !== currentLang);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm",
        "border border-border bg-muted/50",
      )}
      role="complementary"
      aria-label="Language options"
    >
      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />

      <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {isTranslated ? (
          <>
            <span className="text-muted-foreground">
              Reading in <strong className="text-foreground">{LANGUAGE_NAMES[currentLang]}</strong>
            </span>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => handleLanguageSwitch("en")}
              className="text-primary hover:underline font-medium"
            >
              Switch to English
            </button>
            {otherLanguages.length > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                {otherLanguages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageSwitch(lang)}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {LANGUAGE_NAMES[lang]}
                  </button>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Also available in:</span>
            {availableLanguages.map((lang, i) => (
              <span key={lang}>
                <button
                  type="button"
                  onClick={() => handleLanguageSwitch(lang)}
                  className="text-primary hover:underline font-medium"
                >
                  {LANGUAGE_NAMES[lang]}
                </button>
                {i < availableLanguages.length - 1 && (
                  <span className="text-muted-foreground">, </span>
                )}
              </span>
            ))}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Dismiss language banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
