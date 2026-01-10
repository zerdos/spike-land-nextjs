
import { render, screen } from '@testing-library/react';
import { InboxItem } from './inbox-item';
import { InboxItem as InboxItemType } from '@prisma/client';

const mockItem: InboxItemType = {
  id: '1',
  platform: 'TWITTER',
  type: 'MENTION',
  status: 'UNREAD',
  content: 'This is a test mention',
  senderName: 'John Doe',
  senderAvatarUrl: 'https://example.com/avatar.png',
  receivedAt: new Date(),
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
};

describe('InboxItem', () => {
  it('renders the item content correctly', () => {
    render(<InboxItem item={mockItem} isSelected={false} onClick={() => {}} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('This is a test mention')).toBeInTheDocument();
    expect(screen.getByText('MENTION')).toBeInTheDocument();
  });

  it('highlights the item when selected', () => {
    const { container } = render(<InboxItem item={mockItem} isSelected={true} onClick={() => {}} />);
    expect(container.firstChild).toHaveClass('bg-gray-100');
  });
});
