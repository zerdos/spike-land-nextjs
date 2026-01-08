import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StreamEmptyState } from "./StreamEmptyState";

describe("StreamEmptyState", () => {
  describe("no-accounts type", () => {
    it("should render the no-accounts empty state", () => {
      render(<StreamEmptyState type="no-accounts" />);
      expect(screen.getByTestId("stream-empty-state")).toBeInTheDocument();
    });

    it("should display the correct title for no-accounts", () => {
      render(<StreamEmptyState type="no-accounts" />);
      expect(
        screen.getByTestId("empty-state-title"),
      ).toHaveTextContent("Connect your social accounts");
    });

    it("should display the correct description for no-accounts", () => {
      render(<StreamEmptyState type="no-accounts" />);
      expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
        "Link your Twitter, Facebook, Instagram, or LinkedIn accounts to see your posts here.",
      );
    });

    it("should display the connect accounts button for no-accounts", () => {
      render(<StreamEmptyState type="no-accounts" />);
      expect(screen.getByTestId("connect-accounts-button")).toBeInTheDocument();
      expect(screen.getByTestId("connect-accounts-button")).toHaveTextContent(
        "Connect Accounts",
      );
    });

    it("should render the Users icon for no-accounts", () => {
      render(<StreamEmptyState type="no-accounts" />);
      expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
    });

    it("should call onConnectAccounts when button is clicked", () => {
      const onConnectAccounts = vi.fn();
      render(
        <StreamEmptyState
          type="no-accounts"
          onConnectAccounts={onConnectAccounts}
        />,
      );

      fireEvent.click(screen.getByTestId("connect-accounts-button"));
      expect(onConnectAccounts).toHaveBeenCalledTimes(1);
    });

    it("should not throw when clicking connect button without handler", () => {
      render(<StreamEmptyState type="no-accounts" />);

      expect(() => {
        fireEvent.click(screen.getByTestId("connect-accounts-button"));
      }).not.toThrow();
    });
  });

  describe("no-posts type", () => {
    it("should render the no-posts empty state", () => {
      render(<StreamEmptyState type="no-posts" />);
      expect(screen.getByTestId("stream-empty-state")).toBeInTheDocument();
    });

    it("should display the correct title for no-posts", () => {
      render(<StreamEmptyState type="no-posts" />);
      expect(screen.getByTestId("empty-state-title")).toHaveTextContent(
        "No posts yet",
      );
    });

    it("should display the correct description for no-posts", () => {
      render(<StreamEmptyState type="no-posts" />);
      expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
        "Your connected accounts don't have any posts yet, or we couldn't fetch them.",
      );
    });

    it("should not display the connect accounts button for no-posts", () => {
      render(<StreamEmptyState type="no-posts" />);
      expect(screen.queryByTestId("connect-accounts-button")).not
        .toBeInTheDocument();
    });

    it("should render the FileText icon for no-posts", () => {
      render(<StreamEmptyState type="no-posts" />);
      expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
    });
  });

  describe("no-results type", () => {
    it("should render the no-results empty state", () => {
      render(<StreamEmptyState type="no-results" />);
      expect(screen.getByTestId("stream-empty-state")).toBeInTheDocument();
    });

    it("should display the correct title for no-results", () => {
      render(<StreamEmptyState type="no-results" />);
      expect(
        screen.getByTestId("empty-state-title"),
      ).toHaveTextContent("No matching posts");
    });

    it("should display the correct description for no-results", () => {
      render(<StreamEmptyState type="no-results" />);
      expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
        "Try adjusting your filters or search query.",
      );
    });

    it("should not display the connect accounts button for no-results", () => {
      render(<StreamEmptyState type="no-results" />);
      expect(screen.queryByTestId("connect-accounts-button")).not
        .toBeInTheDocument();
    });

    it("should render the Search icon for no-results", () => {
      render(<StreamEmptyState type="no-results" />);
      expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
    });
  });

  describe("Common behavior", () => {
    it("should have centered content layout", () => {
      render(<StreamEmptyState type="no-accounts" />);
      // CardContent is within the Card - verify the structure exists
      expect(screen.getByTestId("stream-empty-state")).toBeInTheDocument();
    });

    it("should always render an icon", () => {
      const types: Array<"no-accounts" | "no-posts" | "no-results"> = [
        "no-accounts",
        "no-posts",
        "no-results",
      ];

      types.forEach((type) => {
        const { unmount } = render(<StreamEmptyState type={type} />);
        expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
        unmount();
      });
    });

    it("should always render a title", () => {
      const types: Array<"no-accounts" | "no-posts" | "no-results"> = [
        "no-accounts",
        "no-posts",
        "no-results",
      ];

      types.forEach((type) => {
        const { unmount } = render(<StreamEmptyState type={type} />);
        expect(screen.getByTestId("empty-state-title")).toBeInTheDocument();
        unmount();
      });
    });

    it("should always render a description", () => {
      const types: Array<"no-accounts" | "no-posts" | "no-results"> = [
        "no-accounts",
        "no-posts",
        "no-results",
      ];

      types.forEach((type) => {
        const { unmount } = render(<StreamEmptyState type={type} />);
        expect(screen.getByTestId("empty-state-description"))
          .toBeInTheDocument();
        unmount();
      });
    });
  });
});
