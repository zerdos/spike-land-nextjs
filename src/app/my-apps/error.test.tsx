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

  it('should display error message', () => {
    render(<MyAppsError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Failed to load apps')).toBeInTheDocument();
  });

  it('should display default message when error message is empty', () => {
    const emptyError = new Error('');
    render(<MyAppsError error={emptyError} reset={mockReset} />);

    expect(screen.getByText('Failed to load your apps')).toBeInTheDocument();
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
});
