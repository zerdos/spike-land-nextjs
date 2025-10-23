import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './switch'

describe('Switch Component', () => {
  describe('Basic Rendering', () => {
    it('should render switch component', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toBeInTheDocument()
    })

    it('should render with aria-checked attribute', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('aria-checked')
    })

    it('should apply custom className', () => {
      const { container } = render(<Switch className="custom-switch" />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveClass('custom-switch')
    })

    it('should have default styling classes', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveClass(
        'peer',
        'inline-flex',
        'h-5',
        'w-9',
        'shrink-0',
        'cursor-pointer',
        'items-center',
        'rounded-full',
        'border-2',
        'border-transparent',
        'shadow-sm'
      )
    })

    it('should forward ref correctly', () => {
      const ref = { current: null }
      render(<Switch ref={ref} />)
      expect(ref.current).not.toBeNull()
    })

    it('should pass through additional props', () => {
      const { container } = render(<Switch data-testid="switch-test" />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('data-testid', 'switch-test')
    })

    it('should merge custom className with default classes', () => {
      const { container } = render(<Switch className="border-red-500" />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveClass('rounded-full', 'border-red-500')
    })
  })

  describe('State Management', () => {
    it('should render unchecked state by default', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('data-state', 'unchecked')
    })

    it('should render checked state when checked prop is true', () => {
      const { container } = render(<Switch checked={true} />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('data-state', 'checked')
    })

    it('should render unchecked state when checked prop is false', () => {
      const { container } = render(<Switch checked={false} />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('data-state', 'unchecked')
    })

    it('should toggle state on click', async () => {
      const user = userEvent.setup()
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')!

      expect(switchElement).toHaveAttribute('data-state', 'unchecked')

      await user.click(switchElement)
      expect(switchElement).toHaveAttribute('data-state', 'checked')

      await user.click(switchElement)
      expect(switchElement).toHaveAttribute('data-state', 'unchecked')
    })

    it('should handle controlled mode with onCheckedChange', async () => {
      const user = userEvent.setup()
      const onCheckedChange = vi.fn()
      const { container } = render(<Switch onCheckedChange={onCheckedChange} />)
      const switchElement = container.querySelector('button[role="switch"]')!

      await user.click(switchElement)
      expect(onCheckedChange).toHaveBeenCalledWith(true)
    })

    it('should call onCheckedChange with false when unchecking', async () => {
      const user = userEvent.setup()
      const onCheckedChange = vi.fn()
      const { container } = render(<Switch checked={true} onCheckedChange={onCheckedChange} />)
      const switchElement = container.querySelector('button[role="switch"]')!

      await user.click(switchElement)
      expect(onCheckedChange).toHaveBeenCalledWith(false)
    })

    it('should handle defaultChecked prop', () => {
      const { container } = render(<Switch defaultChecked={true} />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('data-state', 'checked')
    })
  })

  describe('Disabled State', () => {
    it('should render disabled state', () => {
      const { container } = render(<Switch disabled />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toBeDisabled()
    })

    it('should not toggle when disabled', async () => {
      const user = userEvent.setup()
      const onCheckedChange = vi.fn()
      const { container } = render(<Switch disabled onCheckedChange={onCheckedChange} />)
      const switchElement = container.querySelector('button[role="switch"]')!

      await user.click(switchElement)
      expect(onCheckedChange).not.toHaveBeenCalled()
    })

    it('should have disabled cursor class when disabled', () => {
      const { container } = render(<Switch disabled />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveClass('disabled:cursor-not-allowed')
    })

    it('should have disabled opacity class when disabled', () => {
      const { container } = render(<Switch disabled />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveClass('disabled:opacity-50')
    })
  })

  describe('Accessibility', () => {
    it('should have role="switch"', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toBeInTheDocument()
    })

    it('should have aria-checked="false" when unchecked', () => {
      const { container } = render(<Switch checked={false} />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('aria-checked', 'false')
    })

    it('should have aria-checked="true" when checked', () => {
      const { container } = render(<Switch checked={true} />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('aria-checked', 'true')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')!

      switchElement.focus()
      expect(switchElement).toHaveFocus()

      await user.keyboard(' ')
      expect(switchElement).toHaveAttribute('data-state', 'checked')
    })

    it('should support Enter key', async () => {
      const user = userEvent.setup()
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')!

      switchElement.focus()
      await user.keyboard('{Enter}')
      expect(switchElement).toHaveAttribute('data-state', 'checked')
    })

    it('should have focus-visible outline classes', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2')
    })

    it('should have accessible name when aria-label is provided', () => {
      const { container } = render(<Switch aria-label="Toggle notifications" />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('aria-label', 'Toggle notifications')
    })

    it('should have accessible name when aria-labelledby is provided', () => {
      render(
        <div>
          <label id="switch-label">Enable feature</label>
          <Switch aria-labelledby="switch-label" />
        </div>
      )
      const switchElement = screen.getByRole('switch')
      expect(switchElement).toHaveAttribute('aria-labelledby', 'switch-label')
    })
  })

  describe('Thumb Element', () => {
    it('should render thumb element', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      const thumb = switchElement?.querySelector('span')
      expect(thumb).toBeInTheDocument()
    })

    it('should have correct thumb styling classes', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      const thumb = switchElement?.querySelector('span')
      expect(thumb).toHaveClass(
        'pointer-events-none',
        'block',
        'h-4',
        'w-4',
        'rounded-full',
        'bg-background',
        'shadow-lg',
        'ring-0'
      )
    })

    it('should translate thumb when checked', () => {
      const { container } = render(<Switch checked={true} />)
      const switchElement = container.querySelector('button[role="switch"]')
      const thumb = switchElement?.querySelector('span')
      expect(thumb).toHaveAttribute('data-state', 'checked')
    })

    it('should not translate thumb when unchecked', () => {
      const { container } = render(<Switch checked={false} />)
      const switchElement = container.querySelector('button[role="switch"]')
      const thumb = switchElement?.querySelector('span')
      expect(thumb).toHaveAttribute('data-state', 'unchecked')
    })
  })

  describe('Event Handlers', () => {
    it('should call onClick handler', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      const { container } = render(<Switch onClick={onClick} />)
      const switchElement = container.querySelector('button[role="switch"]')!

      await user.click(switchElement)
      expect(onClick).toHaveBeenCalled()
    })

    it('should call onBlur handler', async () => {
      const user = userEvent.setup()
      const onBlur = vi.fn()
      const { container } = render(<Switch onBlur={onBlur} />)
      const switchElement = container.querySelector('button[role="switch"]')!

      switchElement.focus()
      await user.tab()
      expect(onBlur).toHaveBeenCalled()
    })

    it('should call onFocus handler', async () => {
      const onFocus = vi.fn()
      const { container } = render(<Switch onFocus={onFocus} />)
      const switchElement = container.querySelector('button[role="switch"]')!

      switchElement.focus()
      expect(onFocus).toHaveBeenCalled()
    })
  })

  describe('Visual States', () => {
    it('should have checked state styling', () => {
      const { container } = render(<Switch checked={true} />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('data-state', 'checked')
    })

    it('should have unchecked state styling', () => {
      const { container } = render(<Switch checked={false} />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('data-state', 'unchecked')
    })

    it('should have transition classes', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveClass('transition-colors')
    })

    it('should render with shadow-sm class', () => {
      const { container } = render(<Switch />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveClass('shadow-sm')
    })
  })

  describe('Required Attribute', () => {
    it('should support required attribute', () => {
      const { container } = render(<Switch required />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('required')
    })

    it('should support name attribute', () => {
      const { container } = render(<Switch name="notifications" />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('name', 'notifications')
    })

    it('should support value attribute', () => {
      const { container } = render(<Switch value="on" />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('value', 'on')
    })
  })

  describe('Form Integration', () => {
    it('should work within a form', () => {
      const { container } = render(
        <form data-testid="test-form">
          <Switch name="agree" />
        </form>
      )
      const form = screen.getByTestId('test-form')
      const switchElement = container.querySelector('button[role="switch"]')
      expect(form).toContainElement(switchElement)
    })

    it('should have correct form attributes', () => {
      const { container } = render(<Switch name="notifications" value="enabled" />)
      const switchElement = container.querySelector('button[role="switch"]')
      expect(switchElement).toHaveAttribute('name', 'notifications')
      expect(switchElement).toHaveAttribute('value', 'enabled')
    })
  })
})
