import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PersonasPage from "./page";

describe("PersonasPage", () => {
  it("should render page title", () => {
    render(<PersonasPage />);
    expect(screen.getByText("Customer Personas")).toBeInTheDocument();
  });

  it("should render page description", () => {
    render(<PersonasPage />);
    expect(
      screen.getByText(/Meet our 11 target customer personas/),
    ).toBeInTheDocument();
  });

  it("should render priority personas section", () => {
    render(<PersonasPage />);
    expect(screen.getByText("Priority Personas")).toBeInTheDocument();
  });

  it("should render secondary personas section", () => {
    render(<PersonasPage />);
    expect(screen.getByText("Secondary Personas")).toBeInTheDocument();
  });

  it("should render all 4 priority personas", () => {
    render(<PersonasPage />);
    expect(screen.getByText("The Tech-Savvy Grandson")).toBeInTheDocument();
    expect(screen.getByText("The Social Media Historian")).toBeInTheDocument();
    expect(screen.getByText("The iPhone Upgrader")).toBeInTheDocument();
    expect(screen.getByText("The Childhood Throwback")).toBeInTheDocument();
  });

  it("should render all 7 secondary personas", () => {
    render(<PersonasPage />);
    expect(screen.getByText("The Memory Keeper")).toBeInTheDocument();
    expect(screen.getByText("The Genealogist")).toBeInTheDocument();
    expect(screen.getByText("The Grieving Pet Owner")).toBeInTheDocument();
    expect(screen.getByText("The Nostalgic Parent")).toBeInTheDocument();
    expect(screen.getByText("The Wedding Planner")).toBeInTheDocument();
    expect(screen.getByText("The Real Estate Flipper")).toBeInTheDocument();
    expect(screen.getByText("The Memorial Creator")).toBeInTheDocument();
  });

  it("should have links to individual persona pages", () => {
    render(<PersonasPage />);
    const links = screen.getAllByRole("link");
    const personaLinks = links.filter((link) =>
      link.getAttribute("href")?.startsWith("/personas/")
    );
    expect(personaLinks.length).toBe(11);
  });

  it("should display priority badges for primary personas", () => {
    render(<PersonasPage />);
    const priorityBadges = screen.getAllByText("Priority");
    expect(priorityBadges.length).toBe(4);
  });
});
