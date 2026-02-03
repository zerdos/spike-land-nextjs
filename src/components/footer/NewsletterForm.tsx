"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

export function NewsletterFormInner() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(_values: z.infer<typeof formSchema>) {
    // TODO: Wire up to newsletter API endpoint
    toast.success("Thanks for subscribing!");
    form.reset();
  }

  return (
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
        <Button type="submit">Subscribe</Button>
      </form>
    </Form>
  );
}

function NewsletterFormSkeleton() {
  return (
    <div className="flex w-full max-w-sm items-start gap-2">
      <Skeleton className="h-10 flex-1 rounded-md" />
      <Skeleton className="h-10 w-24 rounded-md" />
    </div>
  );
}

// Dynamic import with ssr: false to avoid hydration mismatches from Radix Form IDs
const NewsletterFormDynamic = dynamic(
  () => Promise.resolve(NewsletterFormInner),
  {
    ssr: false,
    loading: () => <NewsletterFormSkeleton />,
  },
);

export function NewsletterForm() {
  return <NewsletterFormDynamic />;
}
