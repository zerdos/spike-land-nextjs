import {
  WorkflowAction,
  ActionInput,
  ActionOutput,
} from "./action-types";
import { z } from "zod";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { LinkedInClient } from "@/lib/social/clients/linkedin";
import { retry } from "./retry";

// Define the input schema for the post-to-platform action
const PostToPlatformInputSchema = z.object({
  platform: z.enum(["twitter", "linkedin"]),
  content: z.string(),
  accessToken: z.string(),
  organizationId: z.string().optional(),
});

// Define the input and output types for the action
export interface PostToPlatformInput extends ActionInput {
  platform: "twitter" | "linkedin";
  content: string;
  accessToken: string;
  organizationId?: string;
}

export interface PostToPlatformOutput extends ActionOutput {
  postId?: string;
  postUrl?: string;
}

// Implement the post-to-platform action
export const postToPlatformAction: WorkflowAction<
  PostToPlatformInput,
  PostToPlatformOutput
> = {
  type: "post_to_platform",

  validate: (input) => {
    PostToPlatformInputSchema.parse(input);
  },

  execute: async (input) => {
    return retry(async () => {
      let result;
      if (input.platform === "twitter") {
        const twitterClient = new TwitterClient({ accessToken: input.accessToken });
        result = await twitterClient.createPost(input.content);
      } else if (input.platform === "linkedin") {
        if (!input.organizationId) {
          throw new Error("Organization ID is required for LinkedIn posts");
        }
        const linkedinClient = new LinkedInClient({
          accessToken: input.accessToken,
          accountId: input.organizationId,
        });
        result = await linkedinClient.createPost(input.content);
      } else {
        throw new Error(`Unsupported platform: ${input.platform}`);
      }

      return {
        success: true,
        postId: result.platformPostId,
        postUrl: result.url,
      };
    });
  },
};
