import { auth } from "@/auth";
import { CreateBoxForm } from "@/components/boxes/create-box-form";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NewBoxPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const tiers = await prisma.boxTier.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Create New Box</h1>
          <p className="mt-2 text-muted-foreground">
            Configure your remote desktop environment
          </p>
        </div>

        <CreateBoxForm tiers={tiers} />
      </div>
    </div>
  );
}
