import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { InboxList } from "./inbox-list";

vi.mock("next/navigation", () => ({
  useParams: () => ({
    workspaceSlug: "test-workspace",
  }),
}));

vi.mock("@/hooks/useDocumentVisibility", () => ({
  useDocumentVisibility: () => true,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("InboxList", () => {
  it("should render without crashing", () => {
    render(<InboxList onItemSelected={() => {}} filters={{}} />, {
      wrapper: createWrapper(),
    });
  });
});
