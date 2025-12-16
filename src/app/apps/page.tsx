import { redirect } from "next/navigation";

// Redirect /apps to /pixel landing page
export default function AppsPage() {
  redirect("/pixel");
}
