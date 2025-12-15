import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Prose } from "./Prose";

describe("Prose", () => {
  it("renders children content", () => {
    render(
      <Prose>
        <p>Test paragraph content</p>
      </Prose>,
    );

    expect(screen.getByText("Test paragraph content")).toBeInTheDocument();
  });

  it("applies prose-blog class for typography styling", () => {
    render(
      <Prose>
        <p>Content</p>
      </Prose>,
    );

    const container = screen.getByText("Content").parentElement;
    expect(container).toHaveClass("prose-blog");
  });

  it("applies max-w-none class", () => {
    render(
      <Prose>
        <p>Content</p>
      </Prose>,
    );

    const container = screen.getByText("Content").parentElement;
    expect(container).toHaveClass("max-w-none");
  });

  it("merges custom className with default classes", () => {
    render(
      <Prose className="custom-class">
        <p>Content</p>
      </Prose>,
    );

    const container = screen.getByText("Content").parentElement;
    expect(container).toHaveClass("prose-blog");
    expect(container).toHaveClass("custom-class");
  });

  it("renders multiple children", () => {
    render(
      <Prose>
        <h1>Heading</h1>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </Prose>,
    );

    expect(screen.getByText("Heading")).toBeInTheDocument();
    expect(screen.getByText("Paragraph 1")).toBeInTheDocument();
    expect(screen.getByText("Paragraph 2")).toBeInTheDocument();
  });

  it("renders complex nested content", () => {
    render(
      <Prose>
        <article>
          <header>
            <h1>Blog Title</h1>
          </header>
          <section>
            <p>Content paragraph</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
          </section>
        </article>
      </Prose>,
    );

    expect(screen.getByRole("heading", { name: "Blog Title" })).toBeInTheDocument();
    expect(screen.getByText("Content paragraph")).toBeInTheDocument();
    expect(screen.getByText("List item 1")).toBeInTheDocument();
    expect(screen.getByText("List item 2")).toBeInTheDocument();
  });
});
