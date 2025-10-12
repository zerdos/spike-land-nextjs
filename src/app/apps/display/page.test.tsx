import { describe, it, expect, vi } from 'vitest';

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

describe('DisplayAppPage', () => {
  it('should redirect to /apps/display/run', async () => {
    // Import the page component
    const { default: DisplayAppPage } = await import('./page');

    // Call the component (it will redirect)
    DisplayAppPage();

    // Verify redirect was called with correct path
    expect(mockRedirect).toHaveBeenCalledWith('/apps/display/run');
  });
});
