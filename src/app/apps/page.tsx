import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface App {
  id: string;
  title: string;
  description: string;
  href: string;
  tags: string[];
}

const apps: App[] = [
  {
    id: "display",
    title: "Smart Video Wall",
    description:
      "A real-time video conferencing wall with WebRTC support. Display multiple video streams simultaneously with automatic layout optimization.",
    href: "/apps/display",
    tags: ["WebRTC", "Video", "Real-time"],
  },
  {
    id: "images",
    title: "AI Image Enhancement",
    description:
      "Upload and enhance your images using AI-powered technology. Choose from 1K, 2K, or 4K enhancement tiers and compare results with an interactive slider.",
    href: "/apps/images",
    tags: ["AI", "Images", "Enhancement"],
  },
];

export default function AppsPage() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold mb-4">Featured Apps</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Card key={app.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{app.title}</CardTitle>
                <CardDescription>{app.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {app.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={app.href}>Launch App</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">More Apps Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          We are continuously building new interactive experiences. Check back soon for more
          applications.
        </p>
      </section>
    </div>
  );
}
