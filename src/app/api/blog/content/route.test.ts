import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/blog/get-posts", () => ({
  getPostBySlug: vi.fn(),
}));

import { getPostBySlug } from "@/lib/blog/get-posts";
import { GET, stripMdx } from "./route";

const mockGetPostBySlug = vi.mocked(getPostBySlug);

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/blog/content${query}`);
}

function makePost(slug: string, content = "Hello world") {
  return {
    slug,
    frontmatter: {
      title: `Title for ${slug}`,
      description: `Description for ${slug}`,
      tags: ["tag1", "tag2"],
    },
    content,
  };
}

describe("GET /api/blog/content", () => {
  it("returns 400 when slugs param is missing", async () => {
    const response = await GET(makeRequest(""));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("slugs query parameter is required");
  });

  it("returns 400 when slugs param is empty string", async () => {
    const response = await GET(makeRequest("?slugs="));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("slugs query parameter is required");
  });

  it("returns 400 when slugs param contains only commas and spaces", async () => {
    const response = await GET(makeRequest("?slugs=,,%20,"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("At least one slug is required");
  });

  it("returns 400 when more than 20 slugs are provided", async () => {
    const slugs = Array.from({ length: 21 }, (_, i) => `slug-${i}`).join(",");
    const response = await GET(makeRequest(`?slugs=${slugs}`));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Maximum 20 slugs allowed");
  });

  it("returns posts for valid slugs", async () => {
    const post = makePost("my-post", "Some **bold** content");
    mockGetPostBySlug.mockReturnValue(post);

    const response = await GET(makeRequest("?slugs=my-post"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0]).toEqual({
      slug: "my-post",
      title: "Title for my-post",
      description: "Description for my-post",
      tags: ["tag1", "tag2"],
      plainText: "Some bold content",
    });
  });

  it("returns empty array for non-existent slugs", async () => {
    mockGetPostBySlug.mockReturnValue(undefined);

    const response = await GET(makeRequest("?slugs=no-such-post"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.posts).toEqual([]);
  });

  it("filters out non-existent slugs from mixed input", async () => {
    mockGetPostBySlug.mockImplementation((slug: string) => {
      if (slug === "exists") return makePost("exists");
      return undefined;
    });

    const response = await GET(makeRequest("?slugs=exists,missing,also-missing"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].slug).toBe("exists");
  });
});

describe("stripMdx", () => {
  it("removes code blocks", () => {
    const input = "Before\n```js\nconst x = 1;\n```\nAfter";
    expect(stripMdx(input)).toBe("Before\n\nAfter");
  });

  it("removes inline code but keeps text", () => {
    const input = "Use `console.log` for debugging";
    expect(stripMdx(input)).toBe("Use console.log for debugging");
  });

  it("removes headings", () => {
    expect(stripMdx("# Heading 1")).toBe("Heading 1");
    expect(stripMdx("## Heading 2")).toBe("Heading 2");
    expect(stripMdx("### Heading 3")).toBe("Heading 3");
    expect(stripMdx("###### Heading 6")).toBe("Heading 6");
  });

  it("removes bold markers", () => {
    expect(stripMdx("This is **bold** text")).toBe("This is bold text");
    expect(stripMdx("This is __bold__ text")).toBe("This is bold text");
  });

  it("removes italic markers", () => {
    expect(stripMdx("This is *italic* text")).toBe("This is italic text");
    expect(stripMdx("This is _italic_ text")).toBe("This is italic text");
  });

  it("removes links but keeps text", () => {
    expect(stripMdx("[Click here](https://example.com)")).toBe("Click here");
  });

  it("removes images but keeps alt text", () => {
    expect(stripMdx("![Alt text](https://example.com/img.png)")).toBe("Alt text");
  });

  it("removes horizontal rules", () => {
    expect(stripMdx("Above\n---\nBelow")).toBe("Above\n\nBelow");
    expect(stripMdx("Above\n-----\nBelow")).toBe("Above\n\nBelow");
  });

  it("removes HTML tags", () => {
    expect(stripMdx("<div>content</div>")).toBe("content");
    expect(stripMdx('<a href="url">link</a>')).toBe("link");
  });

  it("collapses multiple newlines", () => {
    expect(stripMdx("Line 1\n\n\n\n\nLine 2")).toBe("Line 1\n\nLine 2");
  });
});
