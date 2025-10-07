import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AppCard } from './app-card';
import { Home } from 'lucide-react';

describe('AppCard', () => {
  it('renders with required props', () => {
    render(
      <AppCard
        title="Test App"
        description="Test Description"
      />
    );

    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    const { container } = render(
      <AppCard
        title="Test App"
        description="Test Description"
        icon={Home}
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders launch button with appUrl', () => {
    render(
      <AppCard
        title="Test App"
        description="Test Description"
        appUrl="/test-app"
      />
    );

    const launchButton = screen.getByRole('link', { name: /launch app/i });
    expect(launchButton).toHaveAttribute('href', '/test-app');
  });

  it('renders view details button with detailsUrl', () => {
    render(
      <AppCard
        title="Test App"
        description="Test Description"
        detailsUrl="/test-details"
      />
    );

    const viewDetailsButton = screen.getByRole('link', { name: /view details/i });
    expect(viewDetailsButton).toHaveAttribute('href', '/test-details');
  });

  it('calls onLaunch when launch button is clicked', async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();

    render(
      <AppCard
        title="Test App"
        description="Test Description"
        onLaunch={onLaunch}
      />
    );

    const launchButton = screen.getByRole('button', { name: /launch app/i });
    await user.click(launchButton);

    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it('calls onViewDetails when view details button is clicked', async () => {
    const user = userEvent.setup();
    const onViewDetails = vi.fn();

    render(
      <AppCard
        title="Test App"
        description="Test Description"
        onViewDetails={onViewDetails}
      />
    );

    const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
    await user.click(viewDetailsButton);

    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <AppCard
        title="Test App"
        description="Test Description"
        className="custom-class"
      />
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('renders both buttons when both URLs are provided', () => {
    render(
      <AppCard
        title="Test App"
        description="Test Description"
        appUrl="/test-app"
        detailsUrl="/test-details"
      />
    );

    expect(screen.getByRole('link', { name: /launch app/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view details/i })).toBeInTheDocument();
  });

  it('renders button variants correctly', () => {
    render(
      <AppCard
        title="Test App"
        description="Test Description"
        appUrl="/test-app"
        detailsUrl="/test-details"
      />
    );

    const launchButton = screen.getByRole('link', { name: /launch app/i });
    const viewDetailsButton = screen.getByRole('link', { name: /view details/i });

    // Launch button should have default variant (no outline class)
    expect(launchButton).not.toHaveClass('border-input');

    // View Details button should have outline variant
    expect(viewDetailsButton).toHaveClass('border-input');
  });
});
