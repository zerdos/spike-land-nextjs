import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Smart Video Wall Display - Multi-Stream WebRTC Application",
  description: "Transform multiple mobile devices into a synchronized video wall display using WebRTC technology. Perfect for events, digital signage, and interactive installations.",
};

export default function DisplayAppPage() {
  redirect("/apps/display/run");
}
