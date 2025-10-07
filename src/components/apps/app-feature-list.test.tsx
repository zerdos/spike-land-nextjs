import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppFeatureList, Feature } from './app-feature-list';
import { Home } from 'lucide-react';

const mockFeatures: Feature[] = [
  {
    id: '1',
    icon: Home,
    title: 'Feature 1',
    description: 'Description 1'
  },
  {
    id: '2',
    icon: Home,
    title: 'Feature 2',
    description: 'Description 2'
  }
];

describe('AppFeatureList', () => {
  it('renders list of features', () => {
    render(<AppFeatureList features={mockFeatures} />);

    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Feature 2')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
  });

  it('renders empty state when no features', () => {
    render(<AppFeatureList features={[]} />);

    expect(screen.getByText('No features available')).toBeInTheDocument();
  });

  it('renders features without icons', () => {
    const featuresWithoutIcons: Feature[] = [
      {
        id: '1',
        title: 'Feature Without Icon',
        description: 'Description'
      }
    ];

    render(<AppFeatureList features={featuresWithoutIcons} />);

    expect(screen.getByText('Feature Without Icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AppFeatureList features={mockFeatures} className="custom-class" />
    );

    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('renders in grid layout by default', () => {
    const { container } = render(<AppFeatureList features={mockFeatures} />);

    const gridElement = container.querySelector('.grid');
    expect(gridElement).toBeInTheDocument();
  });

  it('renders in list layout when specified', () => {
    const { container } = render(<AppFeatureList features={mockFeatures} layout="list" />);

    const listElement = container.querySelector('.space-y-6');
    expect(listElement).toBeInTheDocument();
  });

  it('renders with 1 column grid', () => {
    const { container } = render(<AppFeatureList features={mockFeatures} columns={1} />);

    const gridElement = container.querySelector('.grid-cols-1');
    expect(gridElement).toBeInTheDocument();
  });

  it('renders with 2 column grid', () => {
    const { container } = render(<AppFeatureList features={mockFeatures} columns={2} />);

    const gridElement = container.querySelector('.md\\:grid-cols-2');
    expect(gridElement).toBeInTheDocument();
  });

  it('renders with 3 column grid', () => {
    const { container } = render(<AppFeatureList features={mockFeatures} columns={3} />);

    const gridElement = container.querySelector('.lg\\:grid-cols-3');
    expect(gridElement).toBeInTheDocument();
  });

  it('renders feature titles', () => {
    render(<AppFeatureList features={mockFeatures} />);

    expect(screen.getByText('Feature 1')).toHaveClass('font-semibold');
    expect(screen.getByText('Feature 2')).toHaveClass('font-semibold');
  });

  it('renders feature descriptions', () => {
    render(<AppFeatureList features={mockFeatures} />);

    expect(screen.getByText('Description 1')).toHaveClass('text-muted-foreground');
    expect(screen.getByText('Description 2')).toHaveClass('text-muted-foreground');
  });
});
