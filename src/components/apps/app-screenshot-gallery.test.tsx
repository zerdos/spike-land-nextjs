import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AppScreenshotGallery, Screenshot } from './app-screenshot-gallery';

// Mock Next.js Image component
/* eslint-disable @next/next/no-img-element */
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    return <img src={src} alt={alt} {...props} />;
  },
}));

const mockScreenshots: Screenshot[] = [
  {
    id: '1',
    url: '/screenshot1.png',
    title: 'Screenshot 1',
  },
  {
    id: '2',
    url: '/screenshot2.png',
    title: 'Screenshot 2',
  },
];

describe('AppScreenshotGallery', () => {
  it('renders screenshots', () => {
    render(<AppScreenshotGallery screenshots={mockScreenshots} />);

    expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument();
    expect(screen.getByAltText('Screenshot 2')).toBeInTheDocument();
  });

  it('renders empty state when no screenshots', () => {
    render(<AppScreenshotGallery screenshots={[]} />);

    expect(screen.getByText('No screenshots available')).toBeInTheDocument();
  });

  it('opens dialog when clicking thumbnail', async () => {
    const user = userEvent.setup();
    render(<AppScreenshotGallery screenshots={mockScreenshots} />);

    const firstThumbnail = screen.getAllByRole('button')[0];
    await user.click(firstThumbnail);

    // Dialog should be open (check for enlarged image)
    const images = screen.getAllByAltText('Screenshot 1');
    expect(images.length).toBeGreaterThan(1);
  });

  it('renders screenshot titles', () => {
    render(<AppScreenshotGallery screenshots={mockScreenshots} />);

    expect(screen.getByText('Screenshot 1')).toBeInTheDocument();
    expect(screen.getByText('Screenshot 2')).toBeInTheDocument();
  });

  it('renders with 2 column grid by default', () => {
    const { container } = render(<AppScreenshotGallery screenshots={mockScreenshots} />);

    const gridElement = container.querySelector('.md\\:grid-cols-2');
    expect(gridElement).toBeInTheDocument();
  });

  it('renders with 3 column grid when specified', () => {
    const { container } = render(<AppScreenshotGallery screenshots={mockScreenshots} columns={3} />);

    const gridElement = container.querySelector('.lg\\:grid-cols-3');
    expect(gridElement).toBeInTheDocument();
  });

  it('renders with 4 column grid when specified', () => {
    const { container } = render(<AppScreenshotGallery screenshots={mockScreenshots} columns={4} />);

    const gridElement = container.querySelector('.xl\\:grid-cols-4');
    expect(gridElement).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AppScreenshotGallery screenshots={mockScreenshots} className="custom-class" />
    );

    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('renders screenshots without titles', () => {
    const screenshotsWithoutTitles: Screenshot[] = [
      {
        id: '1',
        url: '/screenshot1.png',
      },
    ];

    render(<AppScreenshotGallery screenshots={screenshotsWithoutTitles} />);

    expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument();
  });

  it('closes dialog when clicking close button', async () => {
    const user = userEvent.setup();
    render(<AppScreenshotGallery screenshots={mockScreenshots} />);

    // Open dialog
    const firstThumbnail = screen.getAllByRole('button')[0];
    await user.click(firstThumbnail);

    // Find and click close button (X button in dialog)
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // Dialog should be closed
    const images = screen.getAllByAltText('Screenshot 1');
    expect(images.length).toBe(1); // Only thumbnail remains
  });
});
