"use client";

import { Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignCenter, AlignLeft, AlignRight, Grid2X2, LayoutGrid, List } from "lucide-react";

const tokenPackages = [
  { id: 1, name: "Starter", tokens: 5, price: "$4.99", perToken: "$1.00" },
  { id: 2, name: "Basic", tokens: 15, price: "$12.99", perToken: "$0.87" },
  { id: 3, name: "Pro", tokens: 50, price: "$39.99", perToken: "$0.80" },
  {
    id: 4,
    name: "Enterprise",
    tokens: 200,
    price: "$149.99",
    perToken: "$0.75",
  },
];

const enhancementHistory = [
  { id: "ENH-001", date: "2024-01-15", tier: "Pro", status: "completed" },
  { id: "ENH-002", date: "2024-01-14", tier: "Standard", status: "completed" },
  { id: "ENH-003", date: "2024-01-14", tier: "Max", status: "processing" },
  { id: "ENH-004", date: "2024-01-13", tier: "Pro", status: "completed" },
];

export default function DataDisplayPage() {
  return (
    <div className="space-y-12">
      <Section
        title="Data Display"
        description="Components for displaying structured data"
      >
        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Table</CardTitle>
            <CardDescription>
              Display tabular data with headers and rows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Token Packages
              </Label>
              <Table>
                <TableCaption>
                  Available token packages for image enhancement
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Per Token</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokenPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell className="text-right">{pkg.tokens}</TableCell>
                      <TableCell className="text-right">{pkg.price}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {pkg.perToken}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Enhancement History
              </Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enhancementHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.id}
                      </TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={item.status === "completed"
                            ? "default"
                            : "secondary"}
                          className={item.status === "completed"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Toggle Group */}
        <Card>
          <CardHeader>
            <CardTitle>Toggle Group</CardTitle>
            <CardDescription>
              Single or multiple selection toggle buttons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <Label className="text-xs text-muted-foreground">
                Single Selection (View Mode)
              </Label>
              <ToggleGroup type="single" defaultValue="grid">
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid2X2 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="gallery" aria-label="Gallery view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-4">
              <Label className="text-xs text-muted-foreground">
                Single Selection (Text Alignment)
              </Label>
              <ToggleGroup type="single" defaultValue="left">
                <ToggleGroupItem value="left" aria-label="Align left">
                  <AlignLeft className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Align center">
                  <AlignCenter className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Align right">
                  <AlignRight className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-4">
              <Label className="text-xs text-muted-foreground">
                With Text Labels
              </Label>
              <ToggleGroup type="single" defaultValue="standard">
                <ToggleGroupItem value="standard">Standard</ToggleGroupItem>
                <ToggleGroupItem value="pro">Pro</ToggleGroupItem>
                <ToggleGroupItem value="max">Max</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-4">
              <Label className="text-xs text-muted-foreground">
                Multiple Selection
              </Label>
              <ToggleGroup type="multiple" defaultValue={["bold", "underline"]}>
                <ToggleGroupItem value="bold" className="font-bold">
                  B
                </ToggleGroupItem>
                <ToggleGroupItem value="italic" className="italic">
                  I
                </ToggleGroupItem>
                <ToggleGroupItem value="underline" className="underline">
                  U
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        {/* Copy Button */}
        <Card>
          <CardHeader>
            <CardTitle>Copy Button</CardTitle>
            <CardDescription>
              Click-to-copy functionality with visual feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Copy Text</Label>
              <div className="flex items-center gap-2">
                <Input
                  value="https://pixel.spike.land/share/abc123"
                  readOnly
                  className="font-mono text-sm"
                />
                <CopyButton text="https://pixel.spike.land/share/abc123" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Copy Code</Label>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
                  {`npm install @spike-npm-land/pixel-sdk`}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text="npm install @spike-npm-land/pixel-sdk" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Copy API Key
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value="pk_live_51xxx...xxx"
                  readOnly
                  className="font-mono text-sm"
                  type="password"
                />
                <CopyButton text="pk_live_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
