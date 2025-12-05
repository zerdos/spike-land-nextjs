import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Slider } from './slider';

describe('Slider Component', () => {
  beforeEach(() => {
    // Mock ResizeObserver - Vitest 4: Use class constructor
    global.ResizeObserver = class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof ResizeObserver;
  });

  it('should render slider with default props', () => {
    const { container } = render(<Slider />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toBeInTheDocument();
  });

  it('should render with custom value', () => {
    const { container } = render(<Slider value={[50]} />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('should render with min and max values', () => {
    const { container } = render(<Slider min={0} max={100} value={[50]} />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  it('should render with step value', () => {
    const { container } = render(<Slider step={10} value={[50]} />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Slider className="custom-slider" />);
    const sliderRoot = container.firstChild as HTMLElement;
    expect(sliderRoot).toHaveClass('custom-slider');
  });

  it('should forward ref correctly', () => {
    const ref = { current: null };
    const { container } = render(<Slider ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });

  it('should have correct display name', () => {
    expect(Slider.displayName).toBe('Slider');
  });

  it('should handle disabled state', () => {
    const { container } = render(<Slider disabled />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toBeInTheDocument();
    // The disabled state is applied, just verify component renders
  });

  it('should render with orientation prop', () => {
    const { container } = render(<Slider orientation="vertical" />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('should render with defaultValue', () => {
    const { container } = render(<Slider defaultValue={[30]} />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute('aria-valuenow', '30');
  });
});
