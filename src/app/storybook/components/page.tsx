"use client";

import { Section } from "@/components/storybook";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ComponentsPage() {
  return (
    <div className="space-y-12">
      <Section title="Components" description="UI component library showcase">
        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Cards</CardTitle>
            <CardDescription>
              Container components with glass-morphism
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>Standard card component</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Card content goes here with proper padding.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Highlighted Card</CardTitle>
                  <CardDescription>With primary border</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Emphasized card for important content.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Dashed Card</CardTitle>
                  <CardDescription>For empty states</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Used for upload areas or placeholders.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Small status indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Input fields and form controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Label htmlFor="input-default">Default Input</Label>
                <Input id="input-default" placeholder="Enter text..." />
              </div>
              <div className="space-y-4">
                <Label htmlFor="input-disabled">Disabled Input</Label>
                <Input id="input-disabled" placeholder="Disabled" disabled />
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <Label className="text-sm font-medium">Checkboxes</Label>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox id="check-1" />
                  <Label htmlFor="check-1">Option 1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="check-2" defaultChecked />
                  <Label htmlFor="check-2">Option 2 (checked)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="check-3" disabled />
                  <Label htmlFor="check-3">Disabled</Label>
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <Label className="text-sm font-medium">Radio Group</Label>
              <RadioGroup defaultValue="option-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="option-1" id="radio-1" />
                  <Label htmlFor="radio-1">Standard Enhancement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="option-2" id="radio-2" />
                  <Label htmlFor="radio-2">Pro Enhancement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="option-3" id="radio-3" />
                  <Label htmlFor="radio-3">Max Enhancement</Label>
                </div>
              </RadioGroup>
            </div>
            <Separator />
            <div className="space-y-4">
              <Label className="text-sm font-medium">Select / Dropdown</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select enhancement tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="max">Max</SelectItem>
                  </SelectContent>
                </Select>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Disabled select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Option 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="flex items-center space-x-2">
              <Switch id="switch-demo" defaultChecked />
              <Label htmlFor="switch-demo">Toggle switch</Label>
            </div>
          </CardContent>
        </Card>

        {/* Separators */}
        <Card>
          <CardHeader>
            <CardTitle>Separators</CardTitle>
            <CardDescription>
              Visual dividers for content sections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Content above separator
            </p>
            <Separator />
            <p className="text-sm text-muted-foreground">
              Content below separator
            </p>
          </CardContent>
        </Card>

        {/* Accordion */}
        <Card>
          <CardHeader>
            <CardTitle>Accordion</CardTitle>
            <CardDescription>Collapsible content sections</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is Pixel?</AccordionTrigger>
                <AccordionContent>
                  Pixel is an AI-powered image enhancement platform that transforms your photos with
                  professional-grade results.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  How do enhancement tiers work?
                </AccordionTrigger>
                <AccordionContent>
                  We offer three enhancement tiers: Standard (1 token), Pro (2 tokens), and Max (3
                  tokens). Each tier provides progressively better results.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Can I get a refund?</AccordionTrigger>
                <AccordionContent>
                  If you&apos;re not satisfied with an enhancement, contact our support team within
                  24 hours for a token refund.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>
              Tabbed content panels for organizing information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-2 pt-4">
                <h4 className="text-sm font-medium">Platform Overview</h4>
                <p className="text-sm text-muted-foreground">
                  Pixel transforms your photos with AI-powered enhancement technology.
                </p>
              </TabsContent>
              <TabsContent value="features" className="space-y-2 pt-4">
                <h4 className="text-sm font-medium">Key Features</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>AI-powered enhancement</li>
                  <li>Multiple enhancement tiers</li>
                  <li>Batch processing</li>
                  <li>Album organization</li>
                </ul>
              </TabsContent>
              <TabsContent value="pricing" className="space-y-2 pt-4">
                <h4 className="text-sm font-medium">Token Packages</h4>
                <p className="text-sm text-muted-foreground">
                  Purchase tokens to enhance your images. Packages start at $4.99 for 5 tokens.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Textarea */}
        <Card>
          <CardHeader>
            <CardTitle>Textarea</CardTitle>
            <CardDescription>
              Multi-line text input for longer content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="textarea-default">Default Textarea</Label>
                <Textarea
                  id="textarea-default"
                  placeholder="Type your message here..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="textarea-disabled">Disabled Textarea</Label>
                <Textarea
                  id="textarea-disabled"
                  placeholder="This textarea is disabled"
                  disabled
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="textarea-with-text">With Default Text</Label>
              <Textarea
                id="textarea-with-text"
                defaultValue="This is some default content that can be edited by the user. Textareas are great for longer form inputs like comments, descriptions, or messages."
              />
            </div>
          </CardContent>
        </Card>

        {/* Tooltip */}
        <Card>
          <CardHeader>
            <CardTitle>Tooltip</CardTitle>
            <CardDescription>Contextual information on hover</CardDescription>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="flex flex-wrap gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover me</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is a helpful tooltip</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary">Enhancement Info</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enhance your images with AI</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="cursor-help">Pro</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Professional tier enhancement</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Slider */}
        <Card>
          <CardHeader>
            <CardTitle>Slider</CardTitle>
            <CardDescription>Range input for selecting values</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Default Slider</Label>
                <span className="text-sm text-muted-foreground">50%</span>
              </div>
              <Slider defaultValue={[50]} max={100} step={1} />
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Quality Setting</Label>
                <span className="text-sm text-muted-foreground">75%</span>
              </div>
              <Slider defaultValue={[75]} max={100} step={5} />
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Disabled Slider</Label>
                <span className="text-sm text-muted-foreground">30%</span>
              </div>
              <Slider defaultValue={[30]} max={100} step={1} disabled />
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
