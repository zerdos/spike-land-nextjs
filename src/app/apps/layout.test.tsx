import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AppsLayout from './layout';

describe('AppsLayout', () => {
  it('renders the layout with header section', () => {
    render(
      <AppsLayout>
        <div>Test Content</div>
      </AppsLayout>
    );

    expect(screen.getByRole('heading', { name: 'Applications', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Discover and explore our curated collection of interactive apps')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <AppsLayout>
        <div data-testid="child-content">Child Content</div>
      </AppsLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('applies correct container styling', () => {
    const { container } = render(
      <AppsLayout>
        <div>Test</div>
      </AppsLayout>
    );

    const mainContainers = container.querySelectorAll('.container');
    expect(mainContainers.length).toBeGreaterThan(0);

    // Check that header container exists
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('renders header with correct styling', () => {
    const { container } = render(
      <AppsLayout>
        <div>Test</div>
      </AppsLayout>
    );

    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('border-b');
  });

  it('renders description with muted text color', () => {
    render(
      <AppsLayout>
        <div>Test</div>
      </AppsLayout>
    );

    const description = screen.getByText('Discover and explore our curated collection of interactive apps');
    expect(description).toHaveClass('text-muted-foreground');
  });
});
