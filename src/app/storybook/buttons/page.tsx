import { buttonSizes, buttonVariants, Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ButtonsPage() {
  return (
    <div className="space-y-12">
      <Section title="Buttons" description="Interactive button components with various styles">
        {/* All Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Different button styles for various contexts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {buttonVariants.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Sizes</CardTitle>
            <CardDescription>Button size options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              {buttonSizes.map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <Button size={size}>{size === "icon" ? "+" : size}</Button>
                  <Badge variant="outline">{size}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* States */}
        <Card>
          <CardHeader>
            <CardTitle>States</CardTitle>
            <CardDescription>Button interaction states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button>Default</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
              <Button className="opacity-80">Hover (simulated)</Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>
              Buttons with loading indicator for async operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <Button loading>Default Loading</Button>
              <Button loading variant="secondary">
                Secondary Loading
              </Button>
              <Button loading variant="outline">
                Outline Loading
              </Button>
              <Button loading variant="destructive">
                Destructive Loading
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Loading with different sizes</Label>
              <div className="flex flex-wrap items-center gap-4">
                <Button loading size="sm">
                  Small
                </Button>
                <Button loading size="default">
                  Default
                </Button>
                <Button loading size="lg">
                  Large
                </Button>
                <Button loading size="icon" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complete Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Matrix</CardTitle>
            <CardDescription>All variant and size combinations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                      Variant / Size
                    </th>
                    {buttonSizes
                      .filter((s) => s !== "icon")
                      .map((size) => (
                        <th
                          key={size}
                          className="text-center p-2 text-sm font-medium text-muted-foreground"
                        >
                          {size}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {buttonVariants.map((variant) => (
                    <tr key={variant} className="border-t border-border">
                      <td className="p-2 text-sm font-medium">{variant}</td>
                      {buttonSizes
                        .filter((s) =>
                          s !== "icon"
                        )
                        .map((size) => (
                          <td key={`${variant}-${size}`} className="p-3 text-center">
                            <Button variant={variant} size={size}>
                              Button
                            </Button>
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
