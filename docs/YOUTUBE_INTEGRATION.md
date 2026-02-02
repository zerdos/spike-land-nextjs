# YouTube Integration Guide

This guide details the architecture, capabilities, and usage of the YouTube integration in Orbit.

## Features

The YouTube integration supports the following features:

1.  **Channel Management**: View channel statistics (subscribers, views, videos).
2.  **Video Listing**: List channel videos with engagement metrics.
3.  **Resumable Video Upload**: Upload large videos (>100MB) using the resumable upload protocol.
4.  **Scheduled Publishing**: Schedule videos for future release with timezone support.
5.  **Comment Management**: View, reply to, and moderate comments.
6.  **Analytics**: View comprehensive analytics including watch time, retention, traffic sources, and demographics.
7.  **Playlist Management**: Create, update, delete playlists and manage video assignments.

## Architecture

The integration is built on top of the `YouTubeClient` class which handles OAuth 2.0 authentication and API requests to:
- YouTube Data API v3 (`https://www.googleapis.com/youtube/v3`)
- YouTube Analytics API v2 (`https://youtubeanalytics.googleapis.com/v2`)
- Google Resumable Upload API (`https://www.googleapis.com/upload/youtube/v3/videos`)

## API Endpoints

### Video Upload

**Endpoint**: `POST /api/social/youtube/upload`

Initiates a resumable upload session.

**Request**:
```json
{
  "workspaceId": "ws_123",
  "accountId": "acc_123",
  "fileSize": 10485760,
  "metadata": {
    "title": "My Video",
    "description": "Description here",
    "tags": ["tag1", "tag2"],
    "categoryId": "22",
    "privacyStatus": "private",
    "scheduledPublishTime": "2026-01-01T10:00:00Z"
  }
}
```

**Response**:
```json
{
  "uploadUrl": "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=...",
  "sessionId": "session_123",
  "expiresAt": "2026-01-02T10:00:00Z"
}
```

The client should then upload the file chunks directly to `uploadUrl`.

### Comments

**Endpoint**: `GET /api/social/youtube/comments`

**Query Params**:
- `accountId`: Social Account ID
- `videoId`: Video ID
- `pageToken`: (Optional) Pagination token
- `maxResults`: (Optional) Default 20

**Endpoint**: `POST /api/social/youtube/comments`

Reply to a comment.

**Request**:
```json
{
  "accountId": "acc_123",
  "commentId": "comment_123",
  "text": "Thanks for watching!"
}
```

**Endpoint**: `DELETE /api/social/youtube/comments`

Delete a comment.

**Query Params**:
- `accountId`: Social Account ID
- `commentId`: Comment ID

### Analytics

**Endpoint**: `GET /api/social/youtube/analytics`

**Query Params**:
- `accountId`: Social Account ID
- `type`: `watch-time` | `retention` | `traffic-sources` | `demographics` | `geography` | `engagement`
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `videoId`: (Optional) Required for retention

### Playlists

**Endpoint**: `GET /api/social/youtube/playlists`

**Query Params**:
- `accountId`: Social Account ID

**Endpoint**: `POST /api/social/youtube/playlists`

Create a playlist.

**Request**:
```json
{
  "accountId": "acc_123",
  "title": "My Playlist",
  "description": "Awesome videos",
  "privacyStatus": "public"
}
```

**Endpoint**: `PUT /api/social/youtube/playlists`

Update a playlist.

**Request**:
```json
{
  "accountId": "acc_123",
  "playlistId": "pl_123",
  "updates": { "title": "New Title" }
}
```

**Endpoint**: `DELETE /api/social/youtube/playlists`

Delete a playlist.

**Query Params**:
- `accountId`: Social Account ID
- `playlistId`: Playlist ID

## Client-Side Upload Flow

1.  Client calls `POST /api/social/youtube/upload` to get `uploadUrl`.
2.  Client uploads file in chunks (recommended 256KB multiples) using `PUT` to `uploadUrl`.
3.  Client polls `uploadUrl` with `Content-Range: bytes */*` to recover from interruptions.
4.  Upon completion (200/201 status), the video ID is returned by YouTube.
5.  Client can poll `getVideoDetails` to check processing status.

## Quotas

- **Uploads**: 1,600 units per video.
- **Read Operations**: 1 unit.
- **Write Operations**: 50 units (comments, playlists).
- **Analytics**: Low cost.

Default quota is 10,000 units/day.

## Authentication & Permissions

- **OAuth Scopes**:
    - `youtube.readonly`
    - `youtube.force-ssl`
    - `youtube.upload`
- **Workspace Roles**:
    - Upload/Create: `MEMBER` or above (requires `content:create`).
    - View Analytics: `MEMBER` or above (requires `analytics:view`).
    - Manage/Delete: `ADMIN` or owner (requires `content:delete:own` or `inbox:manage`).
