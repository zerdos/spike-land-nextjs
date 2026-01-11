import { render } from "@testing-library/react";
import { InboxList } from "./inbox-list";

import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({
    workspaceSlug: "test-workspace",
  }),
}));

describe("InboxList", () => {
  it("should render without crashing", () => {
    render(<InboxList onItemSelected={() => {}} filters={{}} />, { wrapper: createWrapper() });
  });
});
