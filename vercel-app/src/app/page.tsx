import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Your App</CardTitle>
          <CardDescription>
            Built with Next.js 15, TypeScript, Tailwind CSS 4, and shadcn/ui
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tech Stack:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Next.js 15 with App Router</li>
              <li>✓ Strict TypeScript configuration</li>
              <li>✓ Tailwind CSS 4 (latest)</li>
              <li>✓ shadcn/ui components</li>
              <li>✓ ESLint configured</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1">Get Started</Button>
            <Button variant="outline" className="flex-1">
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
