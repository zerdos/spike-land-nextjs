import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

describe("DropdownMenu Component", () => {
  describe("DropdownMenu", () => {
    it("should render dropdown menu trigger", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        </DropdownMenu>,
      );
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("should toggle menu on trigger click", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const trigger = screen.getByText("Open");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument();
      });
    });

    it("should close menu when pressing escape", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeInTheDocument();
      });

      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
      });
    });

    it("should render with controlled open state", () => {
      render(
        <DropdownMenu open={true}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Always visible</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByText("Always visible")).toBeInTheDocument();
    });

    it("should handle onOpenChange callback", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Trigger"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("DropdownMenuTrigger", () => {
    it("should render trigger button", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Click me</DropdownMenuTrigger>
        </DropdownMenu>,
      );
      expect(screen.getByText("Click me")).toBeInTheDocument();
    });

    it("should render trigger as child", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button>Custom button</button>
          </DropdownMenuTrigger>
        </DropdownMenu>,
      );
      expect(screen.getByText("Custom button")).toBeInTheDocument();
    });

    it("should handle disabled state", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger disabled>Disabled</DropdownMenuTrigger>
        </DropdownMenu>,
      );
      expect(screen.getByText("Disabled")).toBeDisabled();
    });
  });

  describe("DropdownMenuContent", () => {
    it("should render menu content", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <div>Menu content</div>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Menu content")).toBeInTheDocument();
      });
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent className="custom-content">
            <div>Content</div>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        const content = screen.getByText("Content").parentElement;
        expect(content).toHaveClass("custom-content");
      });
    });

    it("should render with custom sideOffset", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={10}>
            <div>Content</div>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Content")).toBeInTheDocument();
      });
    });

    it("should forward ref correctly", async () => {
      const user = userEvent.setup();
      const ref = { current: null };
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent ref={ref}>
            <div>Content</div>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });
    });
  });

  describe("DropdownMenuItem", () => {
    it("should render menu item", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Action</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Action")).toBeInTheDocument();
      });
    });

    it("should handle click events", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onClick}>Clickable</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Clickable")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Clickable"));
      expect(onClick).toHaveBeenCalled();
    });

    it("should apply inset class", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset>Inset item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Inset item")).toHaveClass("pl-8");
      });
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="custom-item">Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Item")).toHaveClass("custom-item");
      });
    });

    it("should handle disabled state", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Disabled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        const item = screen.getByText("Disabled");
        expect(item).toHaveAttribute("data-disabled");
      });
    });

    it("should forward ref correctly", async () => {
      const user = userEvent.setup();
      const ref = { current: null };
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem ref={ref}>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });
    });
  });

  describe("DropdownMenuCheckboxItem", () => {
    it("should render checkbox item", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem>Checkbox</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Checkbox")).toBeInTheDocument();
      });
    });

    it("should render checked state", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        const item = screen.getByText("Checked");
        expect(item).toHaveAttribute("data-state", "checked");
      });
    });

    it("should handle onCheckedChange", async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem onCheckedChange={onCheckedChange}>
              Toggle
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Toggle")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Toggle"));
      expect(onCheckedChange).toHaveBeenCalled();
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem className="custom-checkbox">
              Item
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Item")).toHaveClass("custom-checkbox");
      });
    });

    it("should forward ref correctly", async () => {
      const user = userEvent.setup();
      const ref = { current: null };
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem ref={ref}>Item</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });
    });
  });

  describe("DropdownMenuRadioItem", () => {
    it("should render radio item", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup>
              <DropdownMenuRadioItem value="1">Radio 1</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Radio 1")).toBeInTheDocument();
      });
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup>
              <DropdownMenuRadioItem value="1" className="custom-radio">
                Radio
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Radio")).toHaveClass("custom-radio");
      });
    });

    it("should forward ref correctly", async () => {
      const user = userEvent.setup();
      const ref = { current: null };
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup>
              <DropdownMenuRadioItem ref={ref} value="1">
                Radio
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });
    });
  });

  describe("DropdownMenuLabel", () => {
    it("should render label", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Label")).toBeInTheDocument();
      });
    });

    it("should apply inset class", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Inset Label")).toHaveClass("pl-8");
      });
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="custom-label">
              Label
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Label")).toHaveClass("custom-label");
      });
    });

    it("should forward ref correctly", async () => {
      const user = userEvent.setup();
      const ref = { current: null };
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel ref={ref}>Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });
    });
  });

  describe("DropdownMenuSeparator", () => {
    it("should render separator", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator data-testid="separator" />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByTestId("separator")).toBeInTheDocument();
      });
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator
              className="custom-separator"
              data-testid="sep"
            />
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByTestId("sep")).toHaveClass("custom-separator");
      });
    });

    it("should forward ref correctly", async () => {
      const user = userEvent.setup();
      const ref = { current: null };
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator ref={ref} data-testid="sep" />
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });
    });
  });

  describe("DropdownMenuShortcut", () => {
    it("should render shortcut", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Action
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("⌘K")).toBeInTheDocument();
      });
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Action
              <DropdownMenuShortcut className="custom-shortcut">
                ⌘S
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("⌘S")).toHaveClass("custom-shortcut");
      });
    });
  });

  describe("DropdownMenuSub", () => {
    it("should render submenu", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Submenu item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("More")).toBeInTheDocument();
      });
    });
  });

  describe("DropdownMenuSubTrigger", () => {
    it("should render subtrigger with chevron", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Submenu</DropdownMenuSubTrigger>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        const trigger = screen.getByText("Submenu");
        expect(trigger).toBeInTheDocument();
      });
    });

    it("should apply inset class", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>Inset Sub</DropdownMenuSubTrigger>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Inset Sub")).toHaveClass("pl-8");
      });
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="custom-subtrigger">
                Sub
              </DropdownMenuSubTrigger>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Sub")).toHaveClass("custom-subtrigger");
      });
    });

    it("should forward ref correctly", async () => {
      const user = userEvent.setup();
      const ref = { current: null };
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger ref={ref}>Sub</DropdownMenuSubTrigger>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });
    });
  });

  describe("DropdownMenuSubContent", () => {
    it("should render subcontent", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("More")).toBeInTheDocument();
      });

      await user.hover(screen.getByText("More"));
      await waitFor(() => {
        expect(screen.getByText("Sub item")).toBeInTheDocument();
      });
    });

    it("should apply custom className", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="custom-subcontent">
                <DropdownMenuItem>Sub item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await user.hover(screen.getByText("More"));
      await waitFor(() => {
        const subItem = screen.getByText("Sub item").parentElement;
        expect(subItem).toHaveClass("custom-subcontent");
      });
    });

    it("should forward ref correctly", async () => {
      const user = userEvent.setup();
      const ref = { current: null };
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent ref={ref}>
                <DropdownMenuItem>Sub</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await user.hover(screen.getByText("More"));
      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });
    });
  });

  describe("DropdownMenuGroup", () => {
    it("should render menu group", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Group item 1</DropdownMenuItem>
              <DropdownMenuItem>Group item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Group item 1")).toBeInTheDocument();
        expect(screen.getByText("Group item 2")).toBeInTheDocument();
      });
    });
  });

  describe("DropdownMenuRadioGroup", () => {
    it("should render radio group with value", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="1">
              <DropdownMenuRadioItem value="1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Option 1")).toBeInTheDocument();
        expect(screen.getByText("Option 2")).toBeInTheDocument();
      });
    });

    it("should handle onValueChange", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup onValueChange={onValueChange}>
              <DropdownMenuRadioItem value="1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Option 2")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Option 2"));
      expect(onValueChange).toHaveBeenCalledWith("2");
    });
  });

  describe("DropdownMenuPortal", () => {
    it("should render portal content", async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent>
              <DropdownMenuItem>Portal item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>,
      );

      await user.click(screen.getByText("Open"));
      await waitFor(() => {
        expect(screen.getByText("Portal item")).toBeInTheDocument();
      });
    });
  });
});
