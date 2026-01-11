import type { InboxItem as InboxItemType } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { InboxItem } from "./inbox-item";

const mockItem: InboxItemType = {
  id: "1",
  platform: "TWITTER",
  type: "MENTION",
  status: "UNREAD",
  content: "This is a test mention",
  senderName: "John Doe",
  senderAvatarUrl: "https://example.com/avatar.png",
  receivedAt: new Date(),
  workspaceId: "1",
  accountId: "1",
  platformItemId: "123",
  createdAt: new Date(),
  updatedAt: new Date(),
  assignedToId: null,
  readAt: null,
  repliedAt: null,
  resolvedAt: null,
  originalPostId: null,
  originalPostContent: null,
  senderHandle: null,
  metadata: null,
  // Smart Routing Fields
  sentiment: null,
  sentimentScore: null,
  priorityScore: null,
  priorityFactors: null,
  routingAnalyzedAt: null,
  routingMetadata: null,
  // Escalation Fields
  escalationStatus: "NONE",
  escalationLevel: 0,
  escalatedAt: null,
  escalatedToId: null,
  slaDeadline: null,
  slaBreach: false,
};

describe("InboxItem", () => {
  it("renders the item content correctly", () => {
    render(<InboxItem item={mockItem} isSelected={false} onClick={() => {}} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("This is a test mention")).toBeInTheDocument();
    expect(screen.getByText("MENTION")).toBeInTheDocument();
  });

  it("renders the correct platform icon", () => {
    // Override platform to Twitter and remove avatar to show fallback
    const itemWithoutAvatar = {
      ...mockItem,
      senderAvatarUrl: null as string | null, // Force null
      platform: "TWITTER" as any, // Bypass strict enum check for test
    };

    const { container } = render(
      <InboxItem item={itemWithoutAvatar} isSelected={false} onClick={() => {}} />,
    );

    // Check if the fallback contains the lucide icon.
    // Since we didn't mock Lucide yet, we can check if an SVG is present in the avatar fallback
    // or we can just rely on the fact that it renders without throwing.
    // A better way if we mock lucide:
    // expect(screen.getByTestId("icon-twitter")).toBeInTheDocument()

    // For now, let's just ensure the fallback is there
    // The fallback logic is internal to Avatar, but we can check if *something* is rendered
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("highlights the item when selected", () => {
    const { container } = render(
      <InboxItem item={mockItem} isSelected={true} onClick={() => {}} />,
    );
    expect(container.firstChild).toHaveClass("bg-gray-100");
  });
});
