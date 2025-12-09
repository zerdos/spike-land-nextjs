/**
 * Admin Feedback Page
 *
 * Server component that fetches all feedback for admin review.
 */

import prisma from "@/lib/prisma";
import { FeedbackClient } from "./FeedbackClient";

export default async function AdminFeedbackPage() {
  // Fetch initial feedback data
  const feedbackItems = await prisma.feedback.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const initialFeedback = feedbackItems.map((f) => ({
    id: f.id,
    userId: f.userId,
    email: f.email,
    type: f.type,
    message: f.message,
    page: f.page,
    userAgent: f.userAgent,
    status: f.status,
    adminNote: f.adminNote,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    user: f.user
      ? {
        id: f.user.id,
        name: f.user.name,
        email: f.user.email,
        image: f.user.image,
      }
      : null,
  }));

  return <FeedbackClient initialFeedback={initialFeedback} />;
}
