import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock PixelLogo component
vi.mock("@/components/brand", () => ({
  PixelLogo: (
    { size, variant, showText }: { size?: string; variant?: string; showText?: boolean; },
  ) => (
    <div
      data-testid="pixel-logo"
      data-size={size}
      data-variant={variant}
      data-show-text={showText}
    >
      PixelLogo
    </div>
  ),
}));

import StorybookPage from "./page";

describe("StorybookPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      render(<StorybookPage />);
      expect(screen.getByRole("heading", { name: /design system/i })).toBeInTheDocument();
    });

    it("should render the page description", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/pixel brand guidelines & component library/i)).toBeInTheDocument();
    });

    it("should render all tab triggers", () => {
      render(<StorybookPage />);
      expect(screen.getByRole("tab", { name: /brand/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /colors/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /typography/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /buttons/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /components/i })).toBeInTheDocument();
    });

    it("should render footer content", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/pixel design system v1\.0/i)).toBeInTheDocument();
      expect(screen.getByText(/part of the spike land platform/i)).toBeInTheDocument();
    });
  });

  describe("brand tab", () => {
    it("should show brand tab content by default", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/logo - the ai spark/i)).toBeInTheDocument();
    });

    it("should render logo sizes section", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/available logo sizes for different contexts/i)).toBeInTheDocument();
    });

    it("should render logo variants section", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/different layout options for the logo/i)).toBeInTheDocument();
    });

    it("should render complete matrix section", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/all size and variant combinations/i)).toBeInTheDocument();
    });

    it("should render icon only section", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/icon only \(showtext=false\)/i)).toBeInTheDocument();
    });

    it("should render PixelLogo components", () => {
      render(<StorybookPage />);
      const logos = screen.getAllByTestId("pixel-logo");
      expect(logos.length).toBeGreaterThan(0);
    });
  });

  describe("colors tab", () => {
    it("should show color palette when colors tab is clicked", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /colors/i }));
      await waitFor(() => {
        expect(screen.getByText(/brand colors optimized for both light and dark modes/i))
          .toBeInTheDocument();
      });
    });

    it("should show brand colors section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /colors/i }));
      await waitFor(() => {
        expect(screen.getByText(/primary brand accent colors/i)).toBeInTheDocument();
      });
    });

    it("should show dark mode palette section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /colors/i }));
      await waitFor(() => {
        expect(screen.getByText(/dark mode palette/i)).toBeInTheDocument();
      });
    });

    it("should show light mode palette section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /colors/i }));
      await waitFor(() => {
        expect(screen.getByText(/light mode palette/i)).toBeInTheDocument();
      });
    });

    it("should show glow effects section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /colors/i }));
      await waitFor(() => {
        expect(screen.getByText(/glow effects/i)).toBeInTheDocument();
      });
    });

    it("should display Pixel Cyan color swatch", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /colors/i }));
      await waitFor(() => {
        expect(screen.getByText("Pixel Cyan")).toBeInTheDocument();
      });
    });
  });

  describe("typography tab", () => {
    it("should show typography content when tab is clicked", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /typography/i }));
      await waitFor(() => {
        expect(screen.getByText(/font families and text styles/i)).toBeInTheDocument();
      });
    });

    it("should show font families section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /typography/i }));
      await waitFor(() => {
        expect(screen.getByText(/montserrat for headers, geist for body/i)).toBeInTheDocument();
      });
    });

    it("should show heading scale section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /typography/i }));
      await waitFor(() => {
        expect(screen.getByText(/all headings use montserrat font/i)).toBeInTheDocument();
      });
    });

    it("should show text colors section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /typography/i }));
      await waitFor(() => {
        expect(screen.getByText(/semantic text color classes/i)).toBeInTheDocument();
      });
    });

    it("should display all heading levels", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /typography/i }));
      await waitFor(() => {
        expect(screen.getByText(/heading level 1/i)).toBeInTheDocument();
        expect(screen.getByText(/heading level 2/i)).toBeInTheDocument();
        expect(screen.getByText(/heading level 3/i)).toBeInTheDocument();
        expect(screen.getByText(/heading level 4/i)).toBeInTheDocument();
        expect(screen.getByText(/heading level 5/i)).toBeInTheDocument();
        expect(screen.getByText(/heading level 6/i)).toBeInTheDocument();
      });
    });
  });

  describe("buttons tab", () => {
    it("should show button content when tab is clicked", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /buttons/i }));
      await waitFor(() => {
        expect(screen.getByText(/interactive button components with various styles/i))
          .toBeInTheDocument();
      });
    });

    it("should show button variants section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /buttons/i }));
      await waitFor(() => {
        expect(screen.getByText(/different button styles for various contexts/i))
          .toBeInTheDocument();
      });
    });

    it("should show button sizes section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /buttons/i }));
      await waitFor(() => {
        expect(screen.getByText(/button size options/i)).toBeInTheDocument();
      });
    });

    it("should show button states section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /buttons/i }));
      await waitFor(() => {
        expect(screen.getByText(/button interaction states/i)).toBeInTheDocument();
      });
    });
  });

  describe("components tab", () => {
    it("should show components content when tab is clicked", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /components/i }));
      await waitFor(() => {
        expect(screen.getByText(/ui component library showcase/i)).toBeInTheDocument();
      });
    });

    it("should show cards section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /components/i }));
      await waitFor(() => {
        expect(screen.getByText(/container components with glass-morphism/i)).toBeInTheDocument();
      });
    });

    it("should show badges section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /components/i }));
      await waitFor(() => {
        expect(screen.getByText(/small status indicators/i)).toBeInTheDocument();
      });
    });

    it("should show form elements section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /components/i }));
      await waitFor(() => {
        expect(screen.getByText(/input fields and form controls/i)).toBeInTheDocument();
      });
    });

    it("should show separators section", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /components/i }));
      await waitFor(() => {
        expect(screen.getByText(/visual dividers for content sections/i)).toBeInTheDocument();
      });
    });

    it("should render input fields", async () => {
      const user = userEvent.setup();
      render(<StorybookPage />);
      await user.click(screen.getByRole("tab", { name: /components/i }));
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/disabled/i)).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<StorybookPage />);
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(/design system/i);
    });

    it("should have accessible tab navigation", () => {
      render(<StorybookPage />);
      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeInTheDocument();
    });
  });
});
