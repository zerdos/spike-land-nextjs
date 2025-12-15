import { Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function TypographyPage() {
  return (
    <div className="space-y-12">
      <Section title="Typography" description="Font families and text styles">
        {/* Font Families */}
        <Card>
          <CardHeader>
            <CardTitle>Font Families</CardTitle>
            <CardDescription>Montserrat for headers, Geist for body</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Montserrat (Headers) - font-heading
              </Label>
              <p className="font-heading text-3xl font-bold">
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Geist Sans (Body) - font-sans
              </Label>
              <p className="font-sans text-lg">The quick brown fox jumps over the lazy dog</p>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Geist Mono (Code) - font-mono
              </Label>
              <p className="font-mono text-lg">const pixel = &quot;AI Enhancement&quot;;</p>
            </div>
          </CardContent>
        </Card>

        {/* Heading Scale */}
        <Card>
          <CardHeader>
            <CardTitle>Heading Scale</CardTitle>
            <CardDescription>All headings use Montserrat font</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Badge variant="outline" className="mb-1">
                h1
              </Badge>
              <h1 className="text-4xl font-bold">Heading Level 1</h1>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="mb-1">
                h2
              </Badge>
              <h2 className="text-3xl font-bold">Heading Level 2</h2>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="mb-1">
                h3
              </Badge>
              <h3 className="text-2xl font-semibold">Heading Level 3</h3>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="mb-1">
                h4
              </Badge>
              <h4 className="text-xl font-semibold">Heading Level 4</h4>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="mb-1">
                h5
              </Badge>
              <h5 className="text-lg font-medium">Heading Level 5</h5>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="mb-1">
                h6
              </Badge>
              <h6 className="text-base font-medium">Heading Level 6</h6>
            </div>
          </CardContent>
        </Card>

        {/* Text Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Text Colors</CardTitle>
            <CardDescription>Semantic text color classes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-foreground">text-foreground - Primary text</p>
            <p className="text-muted-foreground">text-muted-foreground - Secondary text</p>
            <p className="text-primary">text-primary - Accent/link text</p>
            <p className="text-destructive">text-destructive - Error text</p>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
