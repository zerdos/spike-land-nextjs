import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DisplayLayout from './layout';

describe('DisplayLayout', () => {
  it('should render children without wrapper', () => {
    render(
      <DisplayLayout>
        <div>Test Content</div>
      </DisplayLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should not add any additional wrapper elements', () => {
    const { container } = render(
      <DisplayLayout>
        <div data-testid="child">Test</div>
      </DisplayLayout>
    );

    const child = screen.getByTestId('child');
    // The child should be a direct descendant of the container
    expect(container.firstChild).toBe(child);
  });
});
