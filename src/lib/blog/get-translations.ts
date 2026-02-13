import fs from "fs";
import matter from "gray-matter";
import path from "path";
import readingTime from "reading-time";

import { tryCatchSync } from "@/lib/try-catch";

import type { BlogPost, SupportedLanguage } from "./types";
import { SUPPORTED_LANGUAGES, blogPostFrontmatterSchema } from "./types";

const TRANSLATIONS_DIR = path.join(process.cwd(), "content/blog/translations");

/**
 * Get available translation languages for a given slug.
 * Returns language codes that have a corresponding MDX file.
 */
export function getAvailableLanguages(slug: string): SupportedLanguage[] {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return [];

  const languages: SupportedLanguage[] = [];
  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang === "en") continue;
    const filePath = path.join(TRANSLATIONS_DIR, lang, `${slug}.mdx`);
    if (fs.existsSync(filePath)) {
      languages.push(lang);
    }
  }
  return languages;
}

/**
 * Get a translated blog post by slug and language.
 * Returns null if the translation doesn't exist or is invalid.
 */
export function getTranslatedPost(slug: string, lang: SupportedLanguage): BlogPost | null {
  if (lang === "en") return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  if (!SUPPORTED_LANGUAGES.includes(lang)) return null;

  const filePath = path.join(TRANSLATIONS_DIR, lang, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) return null;

  const { data: fileContents, error: readError } = tryCatchSync(() =>
    fs.readFileSync(filePath, "utf8"),
  );

  if (readError) {
    console.error(`Failed to read translation ${lang}/${slug}.mdx:`, readError.message);
    return null;
  }

  const { data: parsed, error: parseError } = tryCatchSync(() => matter(fileContents));

  if (parseError) {
    console.error(`Failed to parse frontmatter in ${lang}/${slug}.mdx:`, parseError.message);
    return null;
  }

  const { data, content } = parsed;

  const { data: stats, error: readingTimeError } = tryCatchSync(() => readingTime(content));

  if (readingTimeError) {
    console.error(
      `Failed to calculate reading time for ${lang}/${slug}.mdx:`,
      readingTimeError.message,
    );
    return null;
  }

  const parseResult = blogPostFrontmatterSchema.safeParse(data);

  if (!parseResult.success) {
    console.error(
      `Invalid frontmatter in ${lang}/${slug}.mdx:`,
      parseResult.error.flatten().fieldErrors,
    );
    return null;
  }

  return {
    frontmatter: parseResult.data,
    content,
    slug,
    readingTime: stats.text,
  };
}
