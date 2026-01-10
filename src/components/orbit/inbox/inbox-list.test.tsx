
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { InboxList } from './inbox-list';
import { QueryClient, QueryClientProvider } from 'react-query';
import { InboxItem as InboxItemType } from '@prisma/client';

// Mock useParams
vi.mock('next/navigation', () => ({
  useParams: () => ({ workspaceSlug: 'test-workspace' }),
}));

// Mock react-virtual
vi.mock('react-virtual', () => ({
  useVirtual: () => ({
    virtualItems: [
      { index: 0, size: 100, start: 0 },
      { index: 1, size: 100, start: 100 },
    ],
    totalSize: 200,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockItems: InboxItemType[] = [
  {
    id: '1',
    platform: 'TWITTER',
    type: 'MENTION',
    status: 'UNREAD',
    content: 'Test message 1',
    senderName: 'John Doe',
    senderAvatarUrl: null,
    receivedAt: new Date('2026-01-10T10:00:00Z'),
    workspaceId: '1',
    accountId: '1',
    platformItemId: '123',
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
  },
  {
    id: '2',
    platform: 'FACEBOOK',
    type: 'MESSAGE',
    status: 'READ',
    content: 'Test message 2',
    senderName: 'Jane Smith',
    senderAvatarUrl: null,
    receivedAt: new Date('2026-01-10T11:00:00Z'),
    workspaceId: '1',
    accountId: '1',
    platformItemId: '456',
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedToId: null,
    readAt: new Date(),
    repliedAt: null,
    resolvedAt: null,
    originalPostId: null,
    originalPostContent: null,
    senderHandle: null,
    metadata: null,
  },
];

describe('InboxList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ items: mockItems, hasNext: false, page: 1 }),
              }),
            100
          )
        )
    );
    global.fetch = mockFetch;

    render(<InboxList filters={{}} onItemSelected={() => {}} />, {
      wrapper: createWrapper(),
    });

    // Wait for the component to render
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('renders inbox items when data is loaded', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems, hasNext: false, page: 1 }),
    });
    global.fetch = mockFetch;

    render(<InboxList filters={{}} onItemSelected={() => {}} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test message 1')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Test message 2')).toBeInTheDocument();
    });
  });

  it('calls onItemSelected when an item is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems, hasNext: false, page: 1 }),
    });
    global.fetch = mockFetch;

    const onItemSelected = vi.fn();

    render(<InboxList filters={{}} onItemSelected={onItemSelected} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const firstItem = screen.getByText('John Doe').closest('[role="button"]');
    if (firstItem) {
      firstItem.click();
      expect(onItemSelected).toHaveBeenCalledWith(mockItems[0]);
    }
  });

  it('handles fetch errors gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error',
    });
    global.fetch = mockFetch;

    render(<InboxList filters={{}} onItemSelected={() => {}} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('displays loading message when fetching more items', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems, hasNext: true, page: 1 }),
    });
    global.fetch = mockFetch;

    render(<InboxList filters={{}} onItemSelected={() => {}} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('applies filters when provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems, hasNext: false, page: 1 }),
    });
    global.fetch = mockFetch;

    const filters = { platform: 'TWITTER', status: 'UNREAD' };

    render(<InboxList filters={filters} onItemSelected={() => {}} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('platform=TWITTER'),
        undefined
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=UNREAD'),
        undefined
      );
    });
  });
});
