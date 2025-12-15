import { redirect } from "next/navigation";

// Redirect /apps to /apps/pixel for now
export default function AppsPage() {
  redirect("/apps/pixel");
}
