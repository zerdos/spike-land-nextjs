import { render, screen, fireEvent } from '@testing-library/react'
import { ImageComparisonSlider } from './ImageComparisonSlider'
import { vi, describe, it, expect } from 'vitest'

// Mock next/image
vi.mock('next/image', () => ({
    default: ({ src, alt, className, onError, style, ...props }: any) => (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={onError}
            style={style}
            {...props}
        />
    ),
}))

// Mock fetch for error logging
global.fetch = vi.fn()

describe('ImageComparisonSlider', () => {
    const defaultProps = {
        originalUrl: '/original.jpg',
        enhancedUrl: '/enhanced.jpg',
        width: 100,
        height: 100,
    }

    it('renders both images with object-cover class', () => {
        render(<ImageComparisonSlider {...defaultProps} />)

        const originalImage = screen.getByAltText('Original')
        const enhancedImage = screen.getByAltText('Enhanced')

        expect(originalImage).toBeDefined()
        expect(enhancedImage).toBeDefined()
        expect(originalImage.className).toContain('object-cover')
        expect(enhancedImage.className).toContain('object-cover')
    })

    it('applies correct aspect ratio from width/height props', () => {
        const { container } = render(
            <ImageComparisonSlider {...defaultProps} width={1600} height={900} />
        )

        // Find the container div with the style
        // The structure is: div > div(style) > images
        const wrapper = container.firstChild?.firstChild as HTMLElement
        expect(wrapper).toBeDefined()
        expect(wrapper.style.aspectRatio).toBe('1600 / 900')
    })

    it('uses default aspect ratio if width/height missing', () => {
        const { container } = render(
            <ImageComparisonSlider
                originalUrl="/original.jpg"
                enhancedUrl="/enhanced.jpg"
            />
        )

        const wrapper = container.firstChild?.firstChild as HTMLElement
        expect(wrapper.style.aspectRatio).toBe('16 / 9')
    })

    it('handles image load errors gracefully', () => {
        render(<ImageComparisonSlider {...defaultProps} />)

        const enhancedImage = screen.getByAltText('Enhanced')
        fireEvent.error(enhancedImage)

        expect(screen.getByText('Enhanced image failed to load')).toBeDefined()
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/logs/image-error',
            expect.any(Object)
        )
    })
})
