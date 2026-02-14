import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSearchOccupations = vi.fn();
const mockGetOccupation = vi.fn();
const mockAssessSkills = vi.fn();
const mockCompareSkills = vi.fn();
const mockGetSalaryEstimate = vi.fn();
const mockSearchJobs = vi.fn();

vi.mock("@/lib/career/services/esco-client", () => ({
  searchOccupations: mockSearchOccupations,
  getOccupation: mockGetOccupation,
}));

vi.mock("@/lib/career/services/matching-engine", () => ({
  assessSkills: mockAssessSkills,
  compareSkills: mockCompareSkills,
}));

vi.mock("@/lib/career/services/job-search-client", () => ({
  getSalaryEstimate: mockGetSalaryEstimate,
  searchJobs: mockSearchJobs,
}));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerCareerTools } from "./career";

const sampleOccupation = {
  uri: "http://data.europa.eu/esco/occupation/1",
  title: "Software Developer",
  description: "Develops software applications",
  iscoGroup: "2512",
  skills: [
    { uri: "http://data.europa.eu/esco/skill/1", title: "JavaScript", skillType: "essential" as const, importance: 0.9 },
    { uri: "http://data.europa.eu/esco/skill/2", title: "Python", skillType: "optional" as const, importance: 0.5 },
  ],
  alternativeLabels: ["Programmer", "Coder"],
};

const sampleSkills = [
  { uri: "http://data.europa.eu/esco/skill/1", title: "JavaScript", proficiency: 4 },
  { uri: "http://data.europa.eu/esco/skill/3", title: "TypeScript", proficiency: 3 },
];

const sampleMatchResult = {
  occupation: sampleOccupation,
  score: 75,
  matchedSkills: 1,
  totalRequired: 2,
  gaps: [
    { skill: sampleOccupation.skills[1], userProficiency: 0, requiredLevel: 3, gap: 3, priority: "high" as const },
  ],
};

const sampleSearchResult = {
  uri: "http://data.europa.eu/esco/occupation/1",
  title: "Software Developer",
  className: "Occupation",
  _links: { self: { href: "/resource/occupation?uri=http://data.europa.eu/esco/occupation/1" } },
};

const sampleJob = {
  id: "job-1",
  title: "Senior JS Developer",
  company: "Tech Corp",
  location: "London",
  salary_min: 50000,
  salary_max: 75000,
  currency: "\u00a3",
  description: "Great job",
  url: "https://example.com/job/1",
  created: "2024-01-01",
  category: "IT",
};

describe("career tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerCareerTools(registry, userId);
  });

  it("should register 6 career tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(6);
  });

  describe("career_assess_skills", () => {
    it("should return assessment results", async () => {
      mockSearchOccupations.mockResolvedValue({ results: [sampleSearchResult], total: 1 });
      mockGetOccupation.mockResolvedValue(sampleOccupation);
      mockAssessSkills.mockReturnValue([sampleMatchResult]);
      const handler = registry.handlers.get("career_assess_skills")!;
      const result = await handler({ skills: sampleSkills });
      expect(getText(result)).toContain("Software Developer");
      expect(getText(result)).toContain("75%");
      expect(getText(result)).toContain("Skills Assessment Results");
    });

    it("should return empty when no occupations found", async () => {
      mockSearchOccupations.mockResolvedValue({ results: [], total: 0 });
      const handler = registry.handlers.get("career_assess_skills")!;
      const result = await handler({ skills: sampleSkills });
      expect(getText(result)).toContain("No matching occupations found");
    });

    it("should show key gaps", async () => {
      mockSearchOccupations.mockResolvedValue({ results: [sampleSearchResult], total: 1 });
      mockGetOccupation.mockResolvedValue(sampleOccupation);
      mockAssessSkills.mockReturnValue([sampleMatchResult]);
      const handler = registry.handlers.get("career_assess_skills")!;
      const result = await handler({ skills: sampleSkills });
      expect(getText(result)).toContain("Key gaps");
      expect(getText(result)).toContain("Python");
    });

    it("should respect limit parameter", async () => {
      mockSearchOccupations.mockResolvedValue({ results: [sampleSearchResult], total: 1 });
      mockGetOccupation.mockResolvedValue(sampleOccupation);
      mockAssessSkills.mockReturnValue([sampleMatchResult, sampleMatchResult, sampleMatchResult]);
      const handler = registry.handlers.get("career_assess_skills")!;
      const result = await handler({ skills: sampleSkills, limit: 1 });
      expect(getText(result)).toContain("1 matches");
    });
  });

  describe("career_search_occupations", () => {
    it("should return search results", async () => {
      mockSearchOccupations.mockResolvedValue({ results: [sampleSearchResult], total: 1 });
      const handler = registry.handlers.get("career_search_occupations")!;
      const result = await handler({ query: "software" });
      expect(getText(result)).toContain("Software Developer");
      expect(getText(result)).toContain("Occupations Found");
    });

    it("should return empty when no results", async () => {
      mockSearchOccupations.mockResolvedValue({ results: [], total: 0 });
      const handler = registry.handlers.get("career_search_occupations")!;
      const result = await handler({ query: "nonexistent" });
      expect(getText(result)).toContain("No occupations found");
    });
  });

  describe("career_get_occupation", () => {
    it("should return occupation details", async () => {
      mockGetOccupation.mockResolvedValue(sampleOccupation);
      const handler = registry.handlers.get("career_get_occupation")!;
      const result = await handler({ uri: sampleOccupation.uri });
      expect(getText(result)).toContain("Software Developer");
      expect(getText(result)).toContain("JavaScript");
      expect(getText(result)).toContain("Essential Skills");
      expect(getText(result)).toContain("Programmer");
    });

    it("should return NOT_FOUND for missing occupation", async () => {
      mockGetOccupation.mockResolvedValue(null);
      const handler = registry.handlers.get("career_get_occupation")!;
      const result = await handler({ uri: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should show optional skills", async () => {
      mockGetOccupation.mockResolvedValue(sampleOccupation);
      const handler = registry.handlers.get("career_get_occupation")!;
      const result = await handler({ uri: sampleOccupation.uri });
      expect(getText(result)).toContain("Optional Skills");
      expect(getText(result)).toContain("Python");
    });
  });

  describe("career_compare_skills", () => {
    it("should return skill comparison", async () => {
      mockGetOccupation.mockResolvedValue(sampleOccupation);
      mockCompareSkills.mockReturnValue(sampleMatchResult);
      const handler = registry.handlers.get("career_compare_skills")!;
      const result = await handler({ skills: sampleSkills, occupationUri: sampleOccupation.uri });
      expect(getText(result)).toContain("Skill Comparison");
      expect(getText(result)).toContain("75%");
      expect(getText(result)).toContain("Priority");
    });

    it("should return NOT_FOUND for missing occupation", async () => {
      mockGetOccupation.mockResolvedValue(null);
      const handler = registry.handlers.get("career_compare_skills")!;
      const result = await handler({ skills: sampleSkills, occupationUri: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("career_get_salary", () => {
    it("should return salary data", async () => {
      mockGetSalaryEstimate.mockResolvedValue({
        median: 55000, p25: 42000, p75: 70000, currency: "\u00a3", source: "Adzuna", location: "United Kingdom",
      });
      const handler = registry.handlers.get("career_get_salary")!;
      const result = await handler({ occupationTitle: "Software Developer" });
      expect(getText(result)).toContain("55,000");
      expect(getText(result)).toContain("Median");
    });

    it("should handle missing salary data", async () => {
      mockGetSalaryEstimate.mockResolvedValue(null);
      const handler = registry.handlers.get("career_get_salary")!;
      const result = await handler({ occupationTitle: "Unknown Job" });
      expect(getText(result)).toContain("not available");
    });
  });

  describe("career_get_jobs", () => {
    it("should return job listings", async () => {
      mockSearchJobs.mockResolvedValue({ jobs: [sampleJob], total: 1 });
      const handler = registry.handlers.get("career_get_jobs")!;
      const result = await handler({ query: "javascript" });
      expect(getText(result)).toContain("Senior JS Developer");
      expect(getText(result)).toContain("Tech Corp");
      expect(getText(result)).toContain("50,000");
    });

    it("should return empty when no jobs found", async () => {
      mockSearchJobs.mockResolvedValue({ jobs: [], total: 0 });
      const handler = registry.handlers.get("career_get_jobs")!;
      const result = await handler({ query: "nonexistent" });
      expect(getText(result)).toContain("No job listings found");
    });

    it("should show salary range", async () => {
      mockSearchJobs.mockResolvedValue({ jobs: [sampleJob], total: 1 });
      const handler = registry.handlers.get("career_get_jobs")!;
      const result = await handler({ query: "javascript" });
      expect(getText(result)).toContain("75,000");
    });
  });
});
