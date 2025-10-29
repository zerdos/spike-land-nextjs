import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyAppsError from './error';
import * as errorLoggerModule from '@/lib/error-logger';

vi.mock('@/lib/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('MyAppsError (My Apps Error Boundary)', () => {
  const mockReset = vi.fn();
  const mockError = new Error('Failed to load apps');

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as { location?: unknown }).location;
    window.location = { href: '' } as Location;
  });

  it('should render error card with title', () => {
    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Error Loading My Apps')).toBeInTheDocument();
    expect(screen.getByText("We couldn't load your apps. This might be a temporary issue.")).toBeInTheDocument();
  });

  it('should display error message in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Failed to load apps')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should display generic message in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.getByText(/An error occurred while loading your apps/i)).toBeInTheDocument();
    expect(screen.queryByText('Failed to load apps')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should display default message when error message is empty', () => {
    const emptyError = new Error('');
    render(<MyAppsError error={emptyError} reset={mockReset} />);

    expect(screen.getByText(/An error occurred while loading your apps/i)).toBeInTheDocument();
  });

  it('should call reset when Try again button is clicked', async () => {
    const user = userEvent.setup();
    render(<MyAppsError error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    await user.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('should navigate to home when Go home button is clicked', async () => {
    const user = userEvent.setup();
    render(<MyAppsError error={mockError} reset={mockReset} />);

    const goHomeButton = screen.getByRole('button', { name: /go home/i });
    await user.click(goHomeButton);

    expect(window.location.href).toBe('/');
  });

  it('should log error with correct route on mount', () => {
    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(errorLoggerModule.errorLogger.logError).toHaveBeenCalledWith(
      mockError,
      {
        route: '/my-apps',
        digest: undefined,
      }
    );
  });

  it('should log error with digest when provided', () => {
    const errorWithDigest = Object.assign(new Error('Error with digest'), {
      digest: 'xyz789',
    });

    render(<MyAppsError error={errorWithDigest} reset={mockReset} />);

    expect(errorLoggerModule.errorLogger.logError).toHaveBeenCalledWith(
      errorWithDigest,
      {
        route: '/my-apps',
        digest: 'xyz789',
      }
    );
  });

  it('should render alert with What happened title', () => {
    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.getByText('What happened?')).toBeInTheDocument();
  });

  it('should have both action buttons', () => {
    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('should re-log error if error changes', () => {
    const { rerender } = render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(errorLoggerModule.errorLogger.logError).toHaveBeenCalledTimes(1);

    const newError = new Error('New error');
    rerender(<MyAppsError error={newError} reset={mockReset} />);

    expect(errorLoggerModule.errorLogger.logError).toHaveBeenCalledTimes(2);
  });

  it('should render within container', () => {
    const { container } = render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(container.querySelector('.container')).toBeInTheDocument();
  });

  it('should use destructive alert variant', () => {
    render(<MyAppsError error={mockError} reset={mockReset} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('should show troubleshooting section in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Development Mode - Troubleshooting')).toBeInTheDocument();
    expect(screen.getByText(/Database is not running/i)).toBeInTheDocument();
    expect(screen.getByText(/DATABASE_URL environment variable/i)).toBeInTheDocument();
    expect(screen.getByText(/Prisma client needs to be generated/i)).toBeInTheDocument();
    expect(screen.getByText(/Database migrations haven't been applied/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show troubleshooting section in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.queryByText('Development Mode - Troubleshooting')).not.toBeInTheDocument();
    expect(screen.queryByText(/Database is not running/i)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should display error digest in development mode when provided', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const errorWithDigest = Object.assign(new Error('Error with digest'), {
      digest: 'abc123xyz',
    });

    render(<MyAppsError error={errorWithDigest} reset={mockReset} />);

    expect(screen.getByText(/Error digest: abc123xyz/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not display error digest section when no digest is provided', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.queryByText(/Error digest:/i)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});
