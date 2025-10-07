import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AppsPage from './page';

describe('AppsPage', () => {
  it('renders the apps page with Featured Apps heading', () => {
    render(<AppsPage />);

    expect(screen.getByRole('heading', { name: 'Featured Apps', level: 2 })).toBeInTheDocument();
  });

  it('renders the Smart Video Wall app card', () => {
    render(<AppsPage />);

    expect(screen.getByText('Smart Video Wall')).toBeInTheDocument();
    expect(screen.getByText(/A real-time video conferencing wall/)).toBeInTheDocument();
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

  it('renders More Apps Coming Soon section', () => {
    render(<AppsPage />);

    expect(screen.getByRole('heading', { name: 'More Apps Coming Soon', level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/We are continuously building new interactive experiences/)).toBeInTheDocument();
  });

  it('applies correct grid layout classes', () => {
    const { container } = render(<AppsPage />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('gap-6', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('renders Card components', () => {
    const { container } = render(<AppsPage />);

    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders tags with correct styling', () => {
    const { container} = render(<AppsPage />);

    const tags = container.querySelectorAll('.bg-primary\\/10');
    expect(tags.length).toBe(3); // WebRTC, Video, Real-time
  });
});
