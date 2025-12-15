import { PixelLogo } from "@/components/brand";
import { logoSizes, logoVariants, Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BrandPage() {
  return (
    <div className="space-y-12">
      <Section
        title="Logo - The AI Spark"
        description="The Pixel logo represents transformation and digital magic. The 3x3 grid symbolizes a pixel array, with the glowing center representing AI enhancement."
      >
        {/* All Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Sizes</CardTitle>
            <CardDescription>Available logo sizes for different contexts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-8">
              {logoSizes.map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <PixelLogo size={size} />
                  <Badge variant="outline">{size}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Different layout options for the logo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-[#112244] border border-[#221144]">
                <PixelLogo size="lg" variant="icon" />
                <Badge variant="outline">icon</Badge>
              </div>
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-[#112244] to-[#221144] border border-[#2a2a4a]">
                <PixelLogo size="lg" variant="horizontal" />
                <Badge variant="outline">horizontal</Badge>
              </div>
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-[#112244] border border-[#FF00FF]/20">
                <PixelLogo size="lg" variant="stacked" />
                <Badge variant="outline">stacked</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complete Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Matrix</CardTitle>
            <CardDescription>All size and variant combinations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                      Size / Variant
                    </th>
                    {logoVariants.map((variant) => (
                      <th
                        key={variant}
                        className="text-center p-2 text-sm font-medium text-muted-foreground"
                      >
                        {variant}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logoSizes.map((size, sizeIndex) => (
                    <tr key={size} className="border-t border-border">
                      <td className="p-2 text-sm font-medium">{size}</td>
                      {logoVariants.map((variant) => (
                        <td key={`${size}-${variant}`} className="p-4 text-center">
                          <div
                            className="inline-flex justify-center p-4 rounded-xl"
                            style={{
                              background: `linear-gradient(180deg, rgba(0, 229, 255, ${
                                0.03 + sizeIndex * 0.04
                              }) 0%, rgba(255, 0, 255, ${0.03 + sizeIndex * 0.04}) 100%)`,
                            }}
                          >
                            <PixelLogo size={size} variant={variant} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Icon Only */}
        <Card>
          <CardHeader>
            <CardTitle>Icon Only (showText=false)</CardTitle>
            <CardDescription>Logo without wordmark for compact spaces</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              {logoSizes.map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <PixelLogo size={size} showText={false} />
                  <Badge variant="outline">{size}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
