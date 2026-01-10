import { TwitterClient } from "@/lib/social/clients/twitter";
import { TwitterTweet, TwitterUser } from "@/lib/social/types";
import { ScoutResult, SocialPlatform } from "@prisma/client";
import { z } from "zod";
import { topicKeywordsSchema } from "../topic-config";

// The search result from the client will have the author expanded.
type TweetWithAuthor = TwitterTweet & { author?: TwitterUser; };

export function buildTwitterQuery(keywords: z.infer<typeof topicKeywordsSchema>): string {
  const parts: string[] = [];

  // AND keywords are basic terms
  if (keywords.and?.length) {
    parts.push(...keywords.and);
  }

  // OR keywords require grouping
  if (keywords.or?.length) {
    parts.push(`(${keywords.or.join(" OR ")})`);
  }

  // NOT keywords are prefixed with a hyphen
  if (keywords.not?.length) {
    parts.push(...keywords.not.map(kw => `-${kw}`));
  }

  return parts.join(" ");
}

function formatTweetAsScoutResult(tweet: TweetWithAuthor): Omit<ScoutResult, "id" | "topicId"> {
  const authorUsername = tweet.author?.username ?? "unknown";
  return {
    platform: SocialPlatform.TWITTER,
    platformId: tweet.id,
    content: tweet.text,
    author: authorUsername,
    authorUrl: `https://twitter.com/${authorUsername}`,
    postUrl: `https://twitter.com/${authorUsername}/status/${tweet.id}`,
    engagement: {
      likes: tweet.public_metrics?.like_count ?? 0,
      comments: tweet.public_metrics?.reply_count ?? 0,
      shares: (tweet.public_metrics?.retweet_count ?? 0) + (tweet.public_metrics?.quote_count ?? 0),
    },
    foundAt: new Date(),
  };
}

export async function searchTwitter(
  keywords: z.infer<typeof topicKeywordsSchema>,
  accessToken: string,
): Promise<Omit<ScoutResult, "id" | "topicId">[]> {
  const client = new TwitterClient({ accessToken });
  const query = buildTwitterQuery(keywords);

  if (!query.trim()) {
    console.warn("Scout: Twitter search skipped due to empty query.");
    return [];
  }

  // This `search` method needs to be added to TwitterClient
  const tweets = await client.search(query, 20);

  if (!tweets || tweets.length === 0) {
    return [];
  }

  return tweets.map(formatTweetAsScoutResult);
}
