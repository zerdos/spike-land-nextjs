# Pixel Enhancement Pipelines

Pipelines are reusable AI enhancement configurations that control how images are
processed through the 4-stage enhancement workflow.

## Overview

Each pipeline consists of four configurable stages:

1. **Analysis** - AI analyzes the image to detect defects and issues
2. **Auto-Crop** - Automatically crop detected problem areas (black bars, UI
   elements)
3. **Prompt** - Build dynamic enhancement prompt based on analysis
4. **Generation** - Call Gemini API to generate enhanced image

## Creating a Pipeline

Navigate to `/apps/pixel/pipelines` and click "New Pipeline" to create a custom
configuration.

## Pipeline Settings

### Basic Settings

| Setting          | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| **Name**         | Descriptive name for the pipeline                                        |
| **Description**  | Optional description of what this pipeline is optimized for              |
| **Default Tier** | Output resolution tier (1K=1024px, 2K=2048px, 4K=4096px)                 |
| **Visibility**   | Private (only you), Public (anyone can use/fork), or Unlisted (via link) |

### Stage 1: Analysis Configuration

Controls how the AI vision model analyzes images to detect defects.

| Setting             | Default | Description                                                           |
| ------------------- | ------- | --------------------------------------------------------------------- |
| **Enable Analysis** | On      | Toggle AI image analysis                                              |
| **Temperature**     | 0.1     | Lower values = more consistent, deterministic results. Range: 0.0-1.0 |

**Detected defects include:**

- `isDark` - Image is underexposed
- `isBlurry` - Motion blur or out of focus
- `hasNoise` - Digital noise or grain
- `hasVHSArtifacts` - VHS/tape distortion artifacts
- `isLowResolution` - Source resolution is very low
- `isOverexposed` - Image is blown out/too bright
- `hasColorCast` - Color tint that needs correction

### Stage 2: Auto-Crop Configuration

Automatically removes unwanted elements from image edges.

| Setting                | Default | Description                                          |
| ---------------------- | ------- | ---------------------------------------------------- |
| **Enable Auto-Crop**   | On      | Toggle automatic cropping                            |
| **Remove Black Bars**  | On      | Crop letterbox/pillarbox black bars from edges       |
| **Remove UI Elements** | On      | Crop out overlays, watermarks, HUD elements          |
| **Minimum Crop Ratio** | 5%      | Only apply crop if removing at least this percentage |

### Stage 3: Prompt Configuration

Controls the dynamic prompt generation for image enhancement.

| Setting                 | Description                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Custom Instructions** | Additional instructions appended to the AI prompt. Examples: "Preserve film grain", "Enhance faces", "Maintain vintage look"                                      |
| **Skip Corrections**    | Disable automatic correction for specific defects. Use when you want to preserve certain characteristics (e.g., keep film grain, preserve intentional color cast) |

**Skippable corrections:**

- Dark images
- Blurry images
- Noise/grain
- VHS artifacts
- Low resolution
- Overexposed
- Color cast

### Stage 4: Generation Configuration

Controls the Gemini API image generation.

| Setting            | Default | Description                                                               |
| ------------------ | ------- | ------------------------------------------------------------------------- |
| **Retry Attempts** | 3       | Number of retry attempts if generation fails (1, 2, 3, or 5)              |
| **Temperature**    | 0.7     | Higher = more creative variation, Lower = more consistent. Range: 0.0-1.0 |

## Pipeline Actions

### Fork a Pipeline

Copy any pipeline (including system defaults and public pipelines) to create
your own version. The fork starts with identical settings that you can
customize.

### Edit a Pipeline

Modify settings for pipelines you own. System default pipelines cannot be
edited.

### Delete a Pipeline

Remove a pipeline you own. This action cannot be undone. System default
pipelines cannot be deleted.

## System Default Pipelines

System defaults are pre-configured pipelines maintained by the platform. They
cannot be edited or deleted but can be forked.

## Token Costs

Token costs are determined by the output tier:

| Tier | Resolution | Token Cost |
| ---- | ---------- | ---------- |
| 1K   | 1024px     | 2 tokens   |
| 2K   | 2048px     | 5 tokens   |
| 4K   | 4096px     | 10 tokens  |

## Progress Tracking

During enhancement, you can see real-time progress through the 4 stages:

- **Analyzing...** - AI is analyzing the image
- **Cropping...** - Auto-crop is being applied (if needed)
- **Prompting...** - Enhancement prompt is being generated
- **Generating...** - Gemini API is generating the enhanced image

## API Reference

### Pipeline Model

```typescript
interface Pipeline {
  id: string;
  name: string;
  description?: string;
  userId?: string; // null = system default
  visibility: "PRIVATE" | "PUBLIC" | "LINK";
  tier: "TIER_1K" | "TIER_2K" | "TIER_4K";

  // Stage configurations
  analysisConfig: {
    enabled: boolean;
    temperature?: number;
  };

  autoCropConfig: {
    enabled: boolean;
    allowBlackBarRemoval?: boolean;
    allowUIElementCrop?: boolean;
    minCropRatio?: number;
  };

  promptConfig: {
    customInstructions?: string;
    skipCorrections?: string[];
  };

  generationConfig: {
    retryAttempts?: number;
    temperature?: number;
  };

  usageCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints

| Method | Endpoint                   | Description                   |
| ------ | -------------------------- | ----------------------------- |
| GET    | `/api/pipelines`           | List all accessible pipelines |
| POST   | `/api/pipelines`           | Create a new pipeline         |
| GET    | `/api/pipelines/[id]`      | Get pipeline details          |
| PATCH  | `/api/pipelines/[id]`      | Update a pipeline             |
| DELETE | `/api/pipelines/[id]`      | Delete a pipeline             |
| POST   | `/api/pipelines/[id]/fork` | Fork a pipeline               |
