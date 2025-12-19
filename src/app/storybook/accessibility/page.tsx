import { ContrastCheckerDemo, Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AccessibilityPage() {
  return (
    <div className="space-y-12">
      <Section
        title="Accessibility Tools"
        description="Tools and guidelines for ensuring accessible components"
      >
        {/* Contrast Checker */}
        <Card>
          <CardHeader>
            <CardTitle>Color Contrast Checker</CardTitle>
            <CardDescription>
              Test color combinations against WCAG 2.1 guidelines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContrastCheckerDemo />
          </CardContent>
        </Card>

        {/* Keyboard Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Keyboard Navigation</CardTitle>
            <CardDescription>
              Expected keyboard behavior for interactive components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Badge variant="outline" className="font-mono">
                  Tab
                </Badge>
                <span className="text-sm">
                  Move focus to next interactive element
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Badge variant="outline" className="font-mono">
                  Shift + Tab
                </Badge>
                <span className="text-sm">
                  Move focus to previous interactive element
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Badge variant="outline" className="font-mono">
                  Enter / Space
                </Badge>
                <span className="text-sm">
                  Activate buttons, links, and form controls
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Badge variant="outline" className="font-mono">
                  Escape
                </Badge>
                <span className="text-sm">
                  Close modals, dialogs, and dropdowns
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Badge variant="outline" className="font-mono">
                  Arrow Keys
                </Badge>
                <span className="text-sm">
                  Navigate within tabs, radio groups, and sliders
                </span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Test Area</Label>
              <p className="text-sm text-muted-foreground">
                Try navigating through these elements using only your keyboard:
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                <Button>Button 1</Button>
                <Button variant="outline">Button 2</Button>
                <Button variant="secondary">Button 3</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ARIA Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>ARIA Attributes</CardTitle>
            <CardDescription>
              Key ARIA attributes used in our components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border space-y-2">
                <Badge variant="outline" className="font-mono text-xs">
                  aria-label
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Provides accessible name for elements without visible text
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border space-y-2">
                <Badge variant="outline" className="font-mono text-xs">
                  aria-busy
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Indicates an element is being modified (e.g., loading button)
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border space-y-2">
                <Badge variant="outline" className="font-mono text-xs">
                  aria-expanded
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Indicates whether an accordion or dropdown is open
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border space-y-2">
                <Badge variant="outline" className="font-mono text-xs">
                  aria-hidden
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Hides decorative content from screen readers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Animation Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Animation Tokens</CardTitle>
            <CardDescription>
              CSS custom properties for consistent animation durations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    --animation-fast
                  </Badge>
                  <span className="font-mono text-sm">150ms</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Quick transitions: tooltips, hovers
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    --animation-normal
                  </Badge>
                  <span className="font-mono text-sm">200ms</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Standard: buttons, cards
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    --animation-slow
                  </Badge>
                  <span className="font-mono text-sm">300ms</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Longer: modals, accordions
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm">
                <span className="font-medium">Note:</span> All animations respect{" "}
                <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
                  prefers-reduced-motion
                </code>{" "}
                to ensure accessibility for users who are sensitive to motion.
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
