import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComicSansPage from "./page";

describe("ComicSansPage", () => {
  it("renders the welcome heading", () => {
    render(<ComicSansPage />);
    expect(
      screen.getByRole("heading", { name: /welcome, friend!/i }),
    ).toBeInTheDocument();
  });

  it("renders the Comic Sans explanation text", () => {
    render(<ComicSansPage />);
    expect(
      screen.getByText(/yes, we heard you only have comic sans installed/i),
    ).toBeInTheDocument();
  });

  it("renders the Did You Know card", () => {
    render(<ComicSansPage />);
    expect(screen.getByText(/did you know/i)).toBeInTheDocument();
  });

  it("mentions Comic Sans history", () => {
    render(<ComicSansPage />);
    expect(
      screen.getByText(/designed by vincent connare in 1994/i),
    ).toBeInTheDocument();
  });

  it("mentions dyslexia accessibility benefit", () => {
    render(<ComicSansPage />);
    expect(
      screen.getByText(/easier to read for people with dyslexia/i),
    ).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(<ComicSansPage />);
    expect(
      screen.getByRole("heading", { name: /super fast!/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /made with love/i }),
    ).toBeInTheDocument();
  });

  it("renders the message section", () => {
    render(<ComicSansPage />);
    expect(
      screen.getByRole("heading", { name: /a message for you/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we appreciate your feedback/i),
    ).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<ComicSansPage />);
    const homepageLink = screen.getByRole("link", { name: /go to homepage/i });
    const pixelLink = screen.getByRole("link", { name: /try pixel app/i });

    expect(homepageLink).toHaveAttribute("href", "/");
    expect(pixelLink).toHaveAttribute("href", "/apps/pixel");
  });

  it("applies Comic Sans font family to the main element", () => {
    render(<ComicSansPage />);
    const mainElement = screen.getByRole("main");
    expect(mainElement).toHaveStyle({
      fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
    });
  });

  it("renders the footer with P.S. message", () => {
    render(<ComicSansPage />);
    expect(
      screen.getByText(/comic sans is a perfectly valid font choice/i),
    ).toBeInTheDocument();
  });
});
