import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ tempId: string; }>;
}

/**
 * Deprecated route - redirects to new /my-apps/[codeSpace] route
 * This maintains backward compatibility for old URLs
 */
export default async function DeprecatedTempAppPage({ params }: PageProps) {
  const { tempId } = await params;
  redirect(`/my-apps/${tempId}`);
}
