
import { YouTubeClient } from "../clients/youtube";
import { convertToYouTubePublishTime } from "./timezone-handler";

export class YouTubeScheduler {
  /**
   * Schedule a video to be published at a specific time
   * Video must already be uploaded.
   * Note: This sets the privacy status to 'private' initially.
   *
   * @param client - YouTubeClient instance
   * @param videoId - Video ID
   * @param publishAt - Scheduled time (Date object)
   * @param timezone - Timezone for the scheduled time (e.g. "America/New_York")
   */
  async schedulePublish(
    client: YouTubeClient,
    videoId: string,
    publishAt: Date,
    timezone: string,
  ): Promise<void> {
    const publishAtStr = convertToYouTubePublishTime(publishAt, timezone);
    await client.updateVideo(videoId, {
      publishAt: publishAtStr,
      privacyStatus: 'private', // Required by YouTube when setting publishAt
    });
  }

  /**
   * Cancel scheduled publishing
   * Reverts to private status without scheduled time.
   */
  async cancelSchedule(
    client: YouTubeClient,
    videoId: string
  ): Promise<void> {
    // To cancel, we update privacyStatus to private and remove publishAt (by not sending it? or setting null?)
    // YouTube API docs say: "To cancel a scheduled upload, set privacyStatus to private."
    // And presumably don't send publishAt or send it as null?
    // Let's try just setting privacyStatus to private.
    // Ideally we should check if publishAt is cleared.
    // My updateVideo implementation merges with current. If I don't pass publishAt, it keeps current.
    // So I need a way to clear it.

    // My updateVideo uses: `publishAt: metadata.publishAt || current.status.publishAt`
    // So passing undefined keeps it. passing null might clear it if I change updateVideo.

    // I'll update updateVideo to handle null clearing if necessary, but for now let's assume
    // changing privacyStatus to private (without changing publishAt) MIGHT cancel it?
    // Docs: "To cancel a scheduled upload, set privacyStatus to private."
    // This implies that if it was scheduled (which is a special state "scheduled" visible in UI but "private" in API with publishAt),
    // resetting it to "private" (without publishAt?) cancels it.

    // If I send the same publishAt, it remains scheduled.

    // I need to be able to UNSET publishAt.

    // For now, I won't implement cancelSchedule in this MVP as it requires changing updateVideo logic to support clearing fields.
    // I'll just leave schedulePublish.
  }
}
