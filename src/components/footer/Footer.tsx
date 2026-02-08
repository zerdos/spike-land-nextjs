"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

export function Footer() {
  const pathname = usePathname();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  // Hide footer on my-apps, live, create, orbit, and audio-mixer routes
  if (
    pathname?.startsWith("/my-apps") || pathname?.startsWith("/live") ||
    pathname?.startsWith("/orbit") || pathname?.startsWith("/create") ||
    pathname?.startsWith("/apps/audio-mixer")
  ) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to subscribe");
        return;
      }

      toast.success("Thanks for subscribing!");
      form.reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight text-white font-heading">Spike Land</h3>
            <p className="text-sm text-muted-foreground">
              AI-Powered Software & Social Media Solutions.
            </p>
            <p className="text-xs text-muted-foreground/70">
              📍 Based in Brighton, working with businesses across the UK
            </p>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <h4 className="text-sm font-semibold text-white font-heading">
              Subscribe to our newsletter
            </h4>
            <p className="text-sm text-muted-foreground">
              Get the latest updates on new features and AI advancements.
            </p>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex w-full max-w-sm items-start gap-2"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white font-heading">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Spike Land. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
