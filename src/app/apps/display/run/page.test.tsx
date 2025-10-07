import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import DisplayRunPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('DisplayRunPage', () => {
  it('renders the page heading', () => {
    render(<DisplayRunPage />);

    expect(screen.getByRole('heading', { name: 'Smart Video Wall Display', level: 1 })).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<DisplayRunPage />);

    expect(screen.getByText('Launch and control your multi-stream video display')).toBeInTheDocument();
  });

  it('renders Enter Fullscreen button initially', () => {
    render(<DisplayRunPage />);

    expect(screen.getByRole('button', { name: /Enter Fullscreen/i })).toBeInTheDocument();
  });

  it('renders Display Status section', () => {
    render(<DisplayRunPage />);

    expect(screen.getByRole('heading', { name: 'Display Status', level: 2 })).toBeInTheDocument();
  });

  it('renders status indicators', () => {
    render(<DisplayRunPage />);

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('0 connected')).toBeInTheDocument();
  });

  it('renders Quick Start section', () => {
    render(<DisplayRunPage />);

    expect(screen.getByRole('heading', { name: 'Quick Start', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Click the "Launch Display" button/)).toBeInTheDocument();
    expect(screen.getByText(/Share the QR code or URL/)).toBeInTheDocument();
    expect(screen.getByText(/Clients will appear automatically/)).toBeInTheDocument();
  });

  it('renders Display Options section', () => {
    render(<DisplayRunPage />);

    expect(screen.getByRole('heading', { name: 'Display Options', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Layout Mode')).toBeInTheDocument();
    expect(screen.getByText('Connection Type')).toBeInTheDocument();
    expect(screen.getByText('Quality Settings')).toBeInTheDocument();
    expect(screen.getByText('Max Connections')).toBeInTheDocument();
  });

  it('renders Launch Display button', () => {
    render(<DisplayRunPage />);

    const launchButton = screen.getByRole('button', { name: /Launch Display/i });
    expect(launchButton).toBeInTheDocument();
  });

  it('renders Pro Tip section', () => {
    render(<DisplayRunPage />);

    expect(screen.getByRole('heading', { name: 'Pro Tip', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/For the best experience/)).toBeInTheDocument();
  });

  it('toggles fullscreen button text on click', async () => {
    const user = userEvent.setup();
    render(<DisplayRunPage />);

    const fullscreenButton = screen.getByRole('button', { name: /Enter Fullscreen/i });
    expect(fullscreenButton).toBeInTheDocument();

    // Click to enter fullscreen
    await user.click(fullscreenButton);

    // Should toggle to exit fullscreen text
    expect(screen.getByRole('button', { name: /Exit Fullscreen/i })).toBeInTheDocument();
  });

  it('applies correct container styling', () => {
    const { container } = render(<DisplayRunPage />);

    const mainContainer = container.querySelector('.container');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('mx-auto', 'px-4', 'py-8');
  });

  it('renders Card components', () => {
    const { container } = render(<DisplayRunPage />);

    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThan(3);
  });

  it('renders status badge with Ready state', () => {
    render(<DisplayRunPage />);

    const readyBadge = screen.getByText('Ready');
    expect(readyBadge).toHaveClass('bg-green-500/10', 'text-green-500');
  });
});
