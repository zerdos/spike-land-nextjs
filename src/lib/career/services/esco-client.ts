import { ESCO_API_BASE, DEFAULT_RESULTS_LIMIT } from "../constants";
import type {
  EscoSearchResponse,
  EscoSearchResult,
  EscoOccupationDetail,
  EscoSkill,
  Occupation,
  OccupationSkillRequirement,
} from "../types";
import { cacheKey, getCached, setCached } from "./career-cache";

async function escoFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${ESCO_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`ESCO API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function searchOccupations(
  query: string,
  limit = DEFAULT_RESULTS_LIMIT,
  offset = 0,
): Promise<{ results: EscoSearchResult[]; total: number }> {
  const key = cacheKey("occupations", "search", query, String(limit), String(offset));
  const cached = await getCached<{ results: EscoSearchResult[]; total: number }>(key);
  if (cached) return cached;

  const data = await escoFetch<EscoSearchResponse>("/search", {
    text: query,
    type: "occupation",
    language: "en",
    limit: String(limit),
    offset: String(offset),
  });

  const result = {
    results: data._embedded.results,
    total: data.total,
  };

  await setCached(key, result);
  return result;
}

export async function getOccupation(uri: string): Promise<Occupation> {
  const key = cacheKey("occupation", encodeURIComponent(uri));
  const cached = await getCached<Occupation>(key);
  if (cached) return cached;

  const data = await escoFetch<EscoOccupationDetail>("/resource/occupation", {
    uri,
    language: "en",
  });

  const essentialSkills: OccupationSkillRequirement[] = (
    data._links.hasEssentialSkill ?? []
  ).map((s) => ({
    uri: s.uri,
    title: s.title,
    skillType: "essential" as const,
    importance: 1.0,
  }));

  const optionalSkills: OccupationSkillRequirement[] = (
    data._links.hasOptionalSkill ?? []
  ).map((s) => ({
    uri: s.uri,
    title: s.title,
    skillType: "optional" as const,
    importance: 0.5,
  }));

  const occupation: Occupation = {
    uri: data.uri,
    title: data.title,
    description: data.description.en.literal,
    iscoGroup: data._links.iscoGroup?.[0]?.title ?? "",
    skills: [...essentialSkills, ...optionalSkills],
    alternativeLabels: data.alternativeLabel?.en ?? [],
  };

  await setCached(key, occupation);
  return occupation;
}

export async function searchSkills(
  query: string,
  limit = DEFAULT_RESULTS_LIMIT,
): Promise<EscoSearchResult[]> {
  const key = cacheKey("skills", "search", query, String(limit));
  const cached = await getCached<EscoSearchResult[]>(key);
  if (cached) return cached;

  const data = await escoFetch<EscoSearchResponse>("/search", {
    text: query,
    type: "skill",
    language: "en",
    limit: String(limit),
  });

  const results = data._embedded.results;
  await setCached(key, results);
  return results;
}

export async function getSkillDetails(uri: string): Promise<EscoSkill> {
  const key = cacheKey("skill", encodeURIComponent(uri));
  const cached = await getCached<EscoSkill>(key);
  if (cached) return cached;

  const data = await escoFetch<{
    uri: string;
    title: string;
    description: { en: { literal: string } };
    skillType: string;
  }>("/resource/skill", {
    uri,
    language: "en",
  });

  const skill: EscoSkill = {
    uri: data.uri,
    title: data.title,
    description: data.description.en.literal,
    skillType: data.skillType as EscoSkill["skillType"],
  };

  await setCached(key, skill);
  return skill;
}
