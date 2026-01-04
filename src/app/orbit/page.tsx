import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OrbitPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Orbit</h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Your Social Command Center
        </p>
        <Button asChild size="lg">
          <Link href="/orbit/dashboard">Enter Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
