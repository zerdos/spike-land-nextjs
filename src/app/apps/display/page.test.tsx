import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DisplayAppPage from './page';

describe('DisplayAppPage', () => {
  it('renders the page heading', () => {
    render(<DisplayAppPage />);

    expect(screen.getByRole('heading', { name: 'Smart Video Wall Display', level: 1 })).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<DisplayAppPage />);

    expect(screen.getByText('Transform any screen into a dynamic multi-stream display')).toBeInTheDocument();
  });

  it('renders Launch Display button', () => {
    render(<DisplayAppPage />);

    const launchButton = screen.getByRole('link', { name: /Launch Display/i });
    expect(launchButton).toBeInTheDocument();
    expect(launchButton).toHaveAttribute('href', '/apps/display/run');
  });

  it('renders Join as Client button', () => {
    render(<DisplayAppPage />);

    const joinButton = screen.getByRole('link', { name: /Join as Client/i });
    expect(joinButton).toBeInTheDocument();
    expect(joinButton).toHaveAttribute('href', '/apps/display/client');
  });

  it('renders Screenshots section', () => {
    render(<DisplayAppPage />);

    expect(screen.getByRole('heading', { name: 'Screenshots', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('See the Smart Video Wall Display in action')).toBeInTheDocument();
  });

  it('renders Features section with all features', () => {
    render(<DisplayAppPage />);

    expect(screen.getByRole('heading', { name: 'Features', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Dynamic Video Wall')).toBeInTheDocument();
    expect(screen.getByText('WebRTC Technology')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Sync')).toBeInTheDocument();
    expect(screen.getByText('Mobile Support')).toBeInTheDocument();
  });

  it('renders feature descriptions', () => {
    render(<DisplayAppPage />);

    expect(screen.getByText(/Automatically arranges multiple video streams/)).toBeInTheDocument();
    expect(screen.getByText(/Peer-to-peer connections ensure low latency/)).toBeInTheDocument();
    expect(screen.getByText(/All connected clients see the same layout/)).toBeInTheDocument();
    expect(screen.getByText(/Full support for mobile devices/)).toBeInTheDocument();
  });

  it('renders Use Cases section', () => {
    render(<DisplayAppPage />);

    expect(screen.getByRole('heading', { name: 'Use Cases', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Events & Conferences')).toBeInTheDocument();
    expect(screen.getByText('Digital Signage')).toBeInTheDocument();
    expect(screen.getByText('Security & Monitoring')).toBeInTheDocument();
  });

  it('renders Technical Specifications section', () => {
    render(<DisplayAppPage />);

    expect(screen.getByRole('heading', { name: 'Technical Specifications', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('WebRTC')).toBeInTheDocument();
    expect(screen.getByText('Next.js 15 with App Router')).toBeInTheDocument();
    expect(screen.getByText('PeerJS for WebRTC connections')).toBeInTheDocument();
  });

  it('renders Getting Started section', () => {
    render(<DisplayAppPage />);

    expect(screen.getByRole('heading', { name: 'Getting Started', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Launch the display/)).toBeInTheDocument();
    expect(screen.getByText(/Scan the QR code/)).toBeInTheDocument();
    expect(screen.getByText(/Start streaming/)).toBeInTheDocument();
  });

  it('renders Ready to Get Started section', () => {
    render(<DisplayAppPage />);

    expect(screen.getByRole('heading', { name: 'Ready to Get Started?', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Launch your display now and transform any screen/)).toBeInTheDocument();
  });

  it('applies correct container styling', () => {
    const { container } = render(<DisplayAppPage />);

    const mainContainer = container.querySelector('.container');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('mx-auto', 'px-4', 'py-12');
  });

  it('renders multiple Card components', () => {
    const { container } = render(<DisplayAppPage />);

    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThan(5);
  });
});
