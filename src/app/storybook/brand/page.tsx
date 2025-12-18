import { PixelLogo, SpikeLandLogo } from "@/components/brand";
import { logoSizes, logoVariants, Section } from "@/components/storybook";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

      <Separator className="my-8" />

      {/* Spike Land Logo Section */}
      <Section
        title="Spike Land Logo"
        description="The parent platform logo featuring a lightning bolt icon representing energy and innovation."
      >
        {/* Spike Land Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Sizes</CardTitle>
            <CardDescription>Available Spike Land logo sizes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-8">
              {logoSizes.map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <SpikeLandLogo size={size} />
                  <Badge variant="outline">{size}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spike Land Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Different layout options for the Spike Land logo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <SpikeLandLogo size="lg" variant="icon" />
                <Badge variant="outline">icon</Badge>
              </div>
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                <SpikeLandLogo size="lg" variant="horizontal" />
                <Badge variant="outline">horizontal</Badge>
              </div>
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-amber-500/20">
                <SpikeLandLogo size="lg" variant="stacked" />
                <Badge variant="outline">stacked</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spike Land Icon Only */}
        <Card>
          <CardHeader>
            <CardTitle>Icon Only (showText=false)</CardTitle>
            <CardDescription>Spike Land logo without wordmark</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              {logoSizes.map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <SpikeLandLogo size={size} showText={false} />
                  <Badge variant="outline">{size}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      <Separator className="my-8" />

      {/* Avatar Section */}
      <Section
        title="Avatar"
        description="User profile images with fallback support for when images fail to load."
      >
        {/* Avatar Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Sizes</CardTitle>
            <CardDescription>Avatar sizes using Tailwind classes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://github.com/zerdos.png" alt="User" />
                  <AvatarFallback>ZE</AvatarFallback>
                </Avatar>
                <Badge variant="outline">h-8</Badge>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="https://github.com/zerdos.png" alt="User" />
                  <AvatarFallback>ZE</AvatarFallback>
                </Avatar>
                <Badge variant="outline">h-10 (default)</Badge>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="https://github.com/zerdos.png" alt="User" />
                  <AvatarFallback>ZE</AvatarFallback>
                </Avatar>
                <Badge variant="outline">h-12</Badge>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="https://github.com/zerdos.png" alt="User" />
                  <AvatarFallback>ZE</AvatarFallback>
                </Avatar>
                <Badge variant="outline">h-16</Badge>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="https://github.com/zerdos.png" alt="User" />
                  <AvatarFallback>ZE</AvatarFallback>
                </Avatar>
                <Badge variant="outline">h-20</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Fallbacks */}
        <Card>
          <CardHeader>
            <CardTitle>Fallbacks</CardTitle>
            <CardDescription>
              When image fails to load, initials or icon is displayed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <Avatar>
                  <AvatarImage src="https://github.com/zerdos.png" alt="Zoltan Erdos" />
                  <AvatarFallback>ZE</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">With image</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar>
                  <AvatarImage src="/invalid-image.jpg" alt="User" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Initials fallback</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar>
                  <AvatarImage src="/invalid-image.jpg" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground">AB</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Styled fallback</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar>
                  <AvatarImage src="/invalid-image.jpg" alt="User" />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white">
                    PX
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Gradient fallback</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Group */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar Group</CardTitle>
            <CardDescription>Stacked avatars for showing multiple users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex -space-x-4">
              <Avatar className="border-2 border-background">
                <AvatarImage src="https://github.com/zerdos.png" alt="User 1" />
                <AvatarFallback>U1</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-background">
                <AvatarImage src="https://github.com/vercel.png" alt="User 2" />
                <AvatarFallback>U2</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-background">
                <AvatarImage src="https://github.com/shadcn.png" alt="User 3" />
                <AvatarFallback>U3</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-background">
                <AvatarFallback className="bg-muted">+3</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
