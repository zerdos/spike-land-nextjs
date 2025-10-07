import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import DisplayClientPage from './page';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe('DisplayClientPage', () => {
  it('renders the page heading', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Join Display as Client', level: 1 })).toBeInTheDocument();
    });
  });

  it('renders the description', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByText('Connect your device to stream video to the display')).toBeInTheDocument();
    });
  });

  it('shows error message when no displayId parameter', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/No display ID provided/)).toBeInTheDocument();
      expect(screen.getByText(/Please scan the QR code/)).toBeInTheDocument();
    });
  });

  it('renders How to Connect section', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'How to Connect', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/Scan the QR code displayed/)).toBeInTheDocument();
      expect(screen.getByText(/Allow camera and microphone access/)).toBeInTheDocument();
      expect(screen.getByText(/Your video will automatically/)).toBeInTheDocument();
    });
  });

  it('renders Requirements section', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Requirements', level: 2 })).toBeInTheDocument();
      expect(screen.getByText('Browser Support')).toBeInTheDocument();
      expect(screen.getByText('Camera Access')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });
  });

  it('renders Manual Entry section', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Manual Entry', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/If you have a display ID/)).toBeInTheDocument();
    });
  });

  it('renders Connect button in manual entry', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Connect/i })).toBeInTheDocument();
    });
  });

  it('renders Alternative Options section', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alternative Options', level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Launch Your Own Display/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Learn More/i })).toBeInTheDocument();
    });
  });

  it('renders Troubleshooting section', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Troubleshooting', level: 2 })).toBeInTheDocument();
      expect(screen.getByText('Camera not working?')).toBeInTheDocument();
      expect(screen.getByText('Connection failed?')).toBeInTheDocument();
      expect(screen.getByText('Poor video quality?')).toBeInTheDocument();
    });
  });

  it('has correct links in Alternative Options', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      const launchLink = screen.getByRole('link', { name: /Launch Your Own Display/i });
      expect(launchLink).toHaveAttribute('href', '/apps/display/run');

      const learnLink = screen.getByRole('link', { name: /Learn More/i });
      expect(learnLink).toHaveAttribute('href', '/apps/display');
    });
  });

  it('renders input field for display ID', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter display ID');
      expect(input).toBeInTheDocument();
    });
  });

  it('allows typing in display ID input', async () => {
    const user = userEvent.setup();
    render(<DisplayClientPage />);

    await waitFor(async () => {
      const input = screen.getByPlaceholderText('Enter display ID');
      await user.type(input, 'test-id-123');
      expect(input).toHaveValue('test-id-123');
    });
  });

  it('applies correct container styling', async () => {
    const { container } = render(<DisplayClientPage />);

    await waitFor(() => {
      const mainContainer = container.querySelector('.container');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('mx-auto', 'px-4', 'py-8');
    });
  });

  it('renders Card components', async () => {
    const { container } = render(<DisplayClientPage />);

    await waitFor(() => {
      const cards = container.querySelectorAll('[class*="rounded"]');
      expect(cards.length).toBeGreaterThan(3);
    });
  });

  it('renders connection status badge', async () => {
    render(<DisplayClientPage />);

    await waitFor(() => {
      const statusBadge = screen.getByText('Not Connected');
      expect(statusBadge).toBeInTheDocument();
    });
  });
});
