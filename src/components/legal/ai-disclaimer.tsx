'use client'

/**
 * AI Disclaimer Component
 *
 * Displays important information about AI-powered image processing.
 *
 * @example
 * // Compact variant (collapsible banner)
 * <AIDisclaimer variant="compact" />
 *
 * @example
 * // Full variant (complete information)
 * <AIDisclaimer variant="full" />
 *
 * @example
 * // Without external links
 * <AIDisclaimer showLearnMore={false} />
 */

import * as React from 'react'
import { Info, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface AIDisclaimerProps {
  variant?: 'compact' | 'full'
  showLearnMore?: boolean
  className?: string
}

export function AIDisclaimer({
  variant = 'compact',
  showLearnMore = true,
  className,
}: AIDisclaimerProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  if (variant === 'compact') {
    return (
      <Alert className={cn('border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30', className)}>
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          AI-Powered Enhancement
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <div className="space-y-2">
            <p>
              Images are processed by Google Gemini AI on Google&apos;s servers (US).
              {!isExpanded && ' EXIF metadata is stripped, and images are not used for training.'}
            </p>

            {isExpanded && (
              <div className="space-y-3 mt-3">
                <div>
                  <h4 className="font-semibold mb-1">AI Processing Notice</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Images are processed by Google Gemini AI</li>
                    <li>Processing happens on Google&apos;s servers (US)</li>
                    <li>Images are sent to Google for enhancement</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Quality Disclaimer</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>AI enhancement results vary</li>
                    <li>No guarantee of specific outcomes</li>
                    <li>Results depend on input image quality</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Data Handling</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Images are NOT used for AI training</li>
                    <li>EXIF metadata is stripped before processing</li>
                    <li>Images are stored temporarily for processing</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Consent</h4>
                  <p className="text-sm">
                    By using enhancement, you consent to AI processing as described above.
                  </p>
                </div>

                {showLearnMore && (
                  <div className="flex gap-3 text-sm">
                    <a
                      href="/privacy"
                      className="text-blue-700 dark:text-blue-300 underline hover:no-underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>
                    <a
                      href="https://ai.google/responsibility/principles/"
                      className="text-blue-700 dark:text-blue-300 underline hover:no-underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google AI Principles
                    </a>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0 h-auto text-blue-700 dark:text-blue-300 hover:bg-transparent hover:underline"
            >
              {isExpanded ? (
                <>
                  Show less <ChevronUp className="ml-1 h-3 w-3" />
                </>
              ) : (
                <>
                  Learn more <ChevronDown className="ml-1 h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={cn('border-blue-200 dark:border-blue-900', className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-blue-900 dark:text-blue-100">
              AI Enhancement Disclaimer
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300 mt-1">
              Important information about AI-powered image processing
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            AI Processing Notice
          </h4>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
            <li>Images are processed by Google Gemini AI</li>
            <li>Processing happens on Google&apos;s servers (United States)</li>
            <li>Images are sent to Google for enhancement analysis and processing</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Quality Disclaimer
          </h4>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
            <li>AI enhancement results vary based on image content</li>
            <li>No guarantee of specific outcomes or quality improvements</li>
            <li>Results depend on input image quality and characteristics</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Data Handling
          </h4>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
            <li>Images are NOT used for AI training purposes</li>
            <li>EXIF metadata is stripped before processing for privacy</li>
            <li>Images are stored temporarily for processing and then deleted</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Consent
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            By using the AI enhancement feature, you consent to the processing of your
            images as described above. You acknowledge that image processing involves
            sending your images to Google&apos;s AI services.
          </p>
        </div>

        {showLearnMore && (
          <div className="pt-2 border-t border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              For more information:
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="/privacy"
                className="text-blue-700 dark:text-blue-300 underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
              <a
                href="https://ai.google/responsibility/principles/"
                className="text-blue-700 dark:text-blue-300 underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google AI Principles
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

AIDisclaimer.displayName = 'AIDisclaimer'
