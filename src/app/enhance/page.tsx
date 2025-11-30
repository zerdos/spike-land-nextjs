import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function EnhancePage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // For now, redirect to the test enhancement page which has upload functionality
  redirect("/test-enhancement")
}
