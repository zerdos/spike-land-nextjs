import type { SupportedLanguage } from "./types";
import { SUPPORTED_LANGUAGES } from "./types";

/**
 * Parse Accept-Language header and return the best matching supported language.
 * Returns null if no supported language is found.
 */
export function detectLanguageFromHeader(acceptLanguage: string | null): SupportedLanguage | null {
  if (!acceptLanguage) return null;

  const entries = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.trim().slice(2)) : 1.0;
      return { lang: lang!.trim().toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    // Check exact match (e.g., "hu", "de")
    const exact = lang as SupportedLanguage;
    if (SUPPORTED_LANGUAGES.includes(exact)) return exact;

    // Check prefix match (e.g., "hu-HU" -> "hu")
    const prefix = lang.split("-")[0] as SupportedLanguage;
    if (prefix && SUPPORTED_LANGUAGES.includes(prefix)) return prefix;
  }

  return null;
}

/**
 * Resolve the display language with priority:
 * 1. ?lang= query parameter
 * 2. spike-lang cookie
 * 3. Accept-Language header
 * 4. Default to "en"
 */
export function resolveLanguage(options: {
  queryLang?: string;
  cookieLang?: string;
  acceptLanguage?: string | null;
}): SupportedLanguage {
  const { queryLang, cookieLang, acceptLanguage } = options;

  // Priority 1: query param
  if (queryLang && SUPPORTED_LANGUAGES.includes(queryLang as SupportedLanguage)) {
    return queryLang as SupportedLanguage;
  }

  // Priority 2: cookie
  if (cookieLang && SUPPORTED_LANGUAGES.includes(cookieLang as SupportedLanguage)) {
    return cookieLang as SupportedLanguage;
  }

  // Priority 3: Accept-Language header
  const detected = detectLanguageFromHeader(acceptLanguage ?? null);
  if (detected) return detected;

  // Default: English
  return "en";
}
