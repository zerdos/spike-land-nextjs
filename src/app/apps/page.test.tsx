import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AppsPage from './page';

describe('AppsPage', () => {
  it('renders the apps page with heading', () => {
    render(<AppsPage />);

    expect(screen.getByRole('heading', { name: 'Smart Video Wall', level: 3 })).toBeInTheDocument();
  });

  it('renders the Smart Video Wall app card', () => {
    render(<AppsPage />);

    expect(screen.getByText('Transform any screen into a dynamic multi-stream video display powered by WebRTC')).toBeInTheDocument();
  });

  it('renders app tags', () => {
    render(<AppsPage />);

    expect(screen.getByText('WebRTC')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Real-time')).toBeInTheDocument();
  });

  it('renders Launch App button with correct link', () => {
    render(<AppsPage />);

    const launchButton = screen.getByRole('link', { name: 'Launch App' });
    expect(launchButton).toBeInTheDocument();
    expect(launchButton).toHaveAttribute('href', '/display');
  });

  it('renders View Details button with correct link', () => {
    render(<AppsPage />);

    const viewDetailsButton = screen.getByRole('link', { name: 'View Details' });
    expect(viewDetailsButton).toBeInTheDocument();
    expect(viewDetailsButton).toHaveAttribute('href', '/apps/display');
  });

  it('renders More Apps Coming Soon section', () => {
    render(<AppsPage />);

    expect(screen.getByRole('heading', { name: 'More Apps Coming Soon', level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/We're working on adding more applications/)).toBeInTheDocument();
  });

  it('applies correct grid layout classes', () => {
    const { container } = render(<AppsPage />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
  });

  it('renders app card with correct badge styling', () => {
    const { container } = render(<AppsPage />);

    const badges = container.querySelectorAll('.inline-flex.items-center');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders Card components', () => {
    const { container } = render(<AppsPage />);

    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders correct number of tags', () => {
    render(<AppsPage />);

    const webrtcBadges = screen.getAllByText('WebRTC');
    const videoBadges = screen.getAllByText('Video');
    const realtimeBadges = screen.getAllByText('Real-time');

    expect(webrtcBadges.length).toBeGreaterThan(0);
    expect(videoBadges.length).toBeGreaterThan(0);
    expect(realtimeBadges.length).toBeGreaterThan(0);
  });
});
