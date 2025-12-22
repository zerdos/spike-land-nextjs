import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PipelineCard, PipelineData } from "./PipelineCard";

const mockPipeline: PipelineData = {
  id: "p1",
  name: "Test Pipeline",
  description: "A test pipeline description",
  tier: "TIER_2K",
  visibility: "PUBLIC",
  usageCount: 42,
  isOwner: true,
  isSystemDefault: false,
  createdAt: new Date().toISOString(),
};

describe("PipelineCard", () => {
  it("renders pipeline information correctly", () => {
    render(<PipelineCard pipeline={mockPipeline} />);

    expect(screen.getByText("Test Pipeline")).toBeInTheDocument();
    expect(screen.getByText("A test pipeline description")).toBeInTheDocument();
    expect(screen.getByText("2K")).toBeInTheDocument(); // Tier label
    expect(screen.getByText("public")).toBeInTheDocument(); // Visibility
    expect(screen.getByText("42 uses")).toBeInTheDocument();
  });

  it("shows System badge for system default pipelines", () => {
    const systemPipeline = { ...mockPipeline, isSystemDefault: true, isOwner: false };
    render(<PipelineCard pipeline={systemPipeline} />);

    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<PipelineCard pipeline={mockPipeline} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Test Pipeline").closest("div[class*='relative']")!);
    expect(onSelect).toHaveBeenCalledWith(mockPipeline);
  });

  it("shows correct actions for owner", async () => {
    const user = userEvent.setup();
    render(<PipelineCard pipeline={mockPipeline} />);

    // Open dropdown
    const menuBtn = screen.getByRole("button", { name: "Open actions menu" });
    await user.click(menuBtn);

    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(await screen.findByText("Fork")).toBeInTheDocument();
    expect(await screen.findByText("Delete")).toBeInTheDocument();
  });

  it("shows correct actions for non-owner", async () => {
    const user = userEvent.setup();
    const nonOwnerPipeline = { ...mockPipeline, isOwner: false };
    render(<PipelineCard pipeline={nonOwnerPipeline} />);

    const menuBtn = screen.getByRole("button", { name: "Open actions menu" });
    await user.click(menuBtn);

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(await screen.findByText("Fork")).toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("calls onEdit action", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<PipelineCard pipeline={mockPipeline} onEdit={onEdit} />);

    const menuBtn = screen.getByRole("button", { name: "Open actions menu" });
    await user.click(menuBtn); // Open menu
    const editBtn = await screen.findByText("Edit");
    await user.click(editBtn);

    expect(onEdit).toHaveBeenCalledWith(mockPipeline);
  });

  it("calls onFork action", async () => {
    const user = userEvent.setup();
    const onFork = vi.fn();
    render(<PipelineCard pipeline={mockPipeline} onFork={onFork} />);

    const menuBtn = screen.getByRole("button", { name: "Open actions menu" });
    await user.click(menuBtn); // Open menu
    const forkBtn = await screen.findByText("Fork");
    await user.click(forkBtn);

    expect(onFork).toHaveBeenCalledWith(mockPipeline);
  });

  it("calls onDelete action", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<PipelineCard pipeline={mockPipeline} onDelete={onDelete} />);

    const menuBtn = screen.getByRole("button", { name: "Open actions menu" });
    await user.click(menuBtn); // Open menu
    const deleteBtn = await screen.findByText("Delete");
    await user.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith(mockPipeline);
  });

  it("does not show menu for system default pipelines if not owner", () => {
    // Usually users are not owners of system default.
    const systemPipeline = { ...mockPipeline, isSystemDefault: true, isOwner: false };
    render(<PipelineCard pipeline={systemPipeline} />);

    // The condition in code is: {(pipeline.isOwner || !pipeline.isSystemDefault) && (...)}
    // So if it is system default AND not owner, the menu should NOT appear.
    const menuButtons = screen.queryAllByRole("button");
    expect(menuButtons).toHaveLength(0);
  });
});
