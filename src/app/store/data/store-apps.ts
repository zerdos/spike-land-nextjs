export interface McpTool {
  name: string;
  category: string;
  description: string;
}

export interface AppFeature {
  title: string;
  description: string;
  icon: string;
}

export type AppCategory = "creative" | "marketing" | "devops";

export type CardVariant = "blue" | "fuchsia" | "green" | "purple";

export interface StoreApp {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: AppCategory;
  cardVariant: CardVariant;
  icon: string;
  price: number;
  mcpTools: McpTool[];
  features: AppFeature[];
  rating: number;
  reviewCount: number;
  installCount: number;
}

export const STORE_CATEGORIES = [
  { id: "all", label: "All Apps" },
  { id: "creative", label: "Creative" },
  { id: "marketing", label: "Marketing" },
  { id: "devops", label: "DevOps" },
] as const;

export const STORE_APPS: StoreApp[] = [
  {
    id: "pixel-studio",
    slug: "pixel-studio",
    name: "Pixel Studio",
    tagline: "AI-powered image creation & batch processing",
    description:
      "Generate, edit, and enhance images at scale with AI-driven tools and automated pipelines.",
    longDescription:
      "Pixel Studio brings professional-grade image processing to your workflow. Generate original images from text prompts, apply style transfers, and run batch operations across thousands of assets. Build reusable enhancement pipelines that automate color correction, noise reduction, and format conversion. Whether you need a single hero image or a full product catalog, Pixel Studio handles it with consistent quality.",
    category: "creative",
    cardVariant: "blue",
    icon: "Paintbrush",
    price: 10,
    mcpTools: [
      {
        name: "generate_image",
        category: "image",
        description: "Create images from text prompts with configurable style and resolution",
      },
      {
        name: "edit_image",
        category: "image",
        description: "Apply targeted edits to existing images using natural language instructions",
      },
      {
        name: "upscale_image",
        category: "image",
        description: "Increase image resolution while preserving detail and sharpness",
      },
      {
        name: "remove_background",
        category: "image",
        description: "Isolate subjects by removing or replacing image backgrounds",
      },
      {
        name: "style_transfer",
        category: "image",
        description: "Apply artistic styles from reference images to target content",
      },
      {
        name: "batch_resize",
        category: "batch-enhance",
        description: "Resize multiple images to specified dimensions in a single operation",
      },
      {
        name: "batch_watermark",
        category: "batch-enhance",
        description: "Apply watermarks to a collection of images with configurable placement",
      },
      {
        name: "batch_convert_format",
        category: "batch-enhance",
        description: "Convert images between formats like PNG, JPEG, WebP, and AVIF",
      },
      {
        name: "auto_enhance",
        category: "enhancement-jobs",
        description: "Automatically adjust brightness, contrast, and saturation for optimal quality",
      },
      {
        name: "color_correction",
        category: "enhancement-jobs",
        description: "Fix color balance and white point across images",
      },
      {
        name: "noise_reduction",
        category: "enhancement-jobs",
        description: "Remove grain and noise artifacts while preserving image detail",
      },
      {
        name: "sharpen_image",
        category: "enhancement-jobs",
        description: "Enhance edge definition and clarity in images",
      },
      {
        name: "create_pipeline",
        category: "pipelines",
        description: "Define a reusable sequence of image processing steps",
      },
      {
        name: "run_pipeline",
        category: "pipelines",
        description: "Execute a saved pipeline against a set of input images",
      },
      {
        name: "schedule_pipeline",
        category: "pipelines",
        description: "Set up recurring pipeline runs on a cron schedule",
      },
    ],
    features: [
      {
        title: "Image Generation",
        description: "Create original images from text descriptions with fine-tuned style control",
        icon: "Sparkles",
      },
      {
        title: "Batch Processing",
        description: "Resize, watermark, and convert thousands of images in one operation",
        icon: "Layers",
      },
      {
        title: "Enhancement Pipelines",
        description:
          "Chain processing steps into reusable pipelines with scheduled execution",
        icon: "Workflow",
      },
      {
        title: "Style Transfer",
        description: "Apply artistic styles from any reference image to your content",
        icon: "Palette",
      },
    ],
    rating: 4.8,
    reviewCount: 124,
    installCount: 1847,
  },
  {
    id: "brand-command",
    slug: "brand-command",
    name: "Brand Command",
    tagline: "Unified brand identity & creative asset management",
    description:
      "Analyze brand voice, generate on-brand copy, and track competitors from a single control center.",
    longDescription:
      "Brand Command centralizes your brand strategy into actionable tools. Analyze your existing content to extract brand voice guidelines, then use those guidelines to generate consistent ad copy, email templates, and taglines. Run A/B copy tests to optimize messaging. On the intelligence side, monitor competitors, detect market trends, and get audience insights that inform your positioning. Every output stays on-brand, every decision is data-backed.",
    category: "marketing",
    cardVariant: "fuchsia",
    icon: "Megaphone",
    price: 10,
    mcpTools: [
      {
        name: "analyze_brand_voice",
        category: "brand-brain",
        description: "Extract tone, style, and vocabulary patterns from existing brand content",
      },
      {
        name: "generate_brand_guidelines",
        category: "brand-brain",
        description: "Produce comprehensive brand guidelines from analyzed content",
      },
      {
        name: "brand_consistency_check",
        category: "brand-brain",
        description: "Score new content against established brand voice guidelines",
      },
      {
        name: "extract_brand_colors",
        category: "brand-brain",
        description: "Identify and codify the color palette from brand assets",
      },
      {
        name: "brand_sentiment_analysis",
        category: "brand-brain",
        description: "Measure public sentiment and perception of your brand online",
      },
      {
        name: "generate_ad_copy",
        category: "creative",
        description: "Create platform-specific ad copy aligned with brand guidelines",
      },
      {
        name: "create_email_template",
        category: "creative",
        description: "Generate responsive email templates with on-brand messaging",
      },
      {
        name: "generate_taglines",
        category: "creative",
        description: "Produce catchy taglines and slogans for campaigns",
      },
      {
        name: "a_b_copy_test",
        category: "creative",
        description: "Create variant copies and track performance for A/B testing",
      },
      {
        name: "competitor_analysis",
        category: "scout",
        description: "Analyze competitor positioning, messaging, and market share",
      },
      {
        name: "trend_detection",
        category: "scout",
        description: "Identify emerging trends relevant to your industry and audience",
      },
      {
        name: "market_positioning",
        category: "scout",
        description: "Map your brand position relative to competitors",
      },
      {
        name: "audience_insights",
        category: "scout",
        description: "Generate demographic and behavioral profiles of your target audience",
      },
      {
        name: "keyword_research",
        category: "scout",
        description: "Discover high-value keywords and search intent for content strategy",
      },
      {
        name: "seo_audit",
        category: "scout",
        description: "Evaluate site content for search engine optimization opportunities",
      },
    ],
    features: [
      {
        title: "Brand Voice AI",
        description:
          "Automatically analyze and enforce brand voice consistency across all content",
        icon: "AudioLines",
      },
      {
        title: "Creative Generation",
        description: "Generate ad copy, email templates, and taglines that stay on-brand",
        icon: "PenTool",
      },
      {
        title: "Market Intelligence",
        description: "Track trends, keywords, and audience behavior to inform strategy",
        icon: "TrendingUp",
      },
      {
        title: "Competitor Tracking",
        description: "Monitor competitor activity and positioning in real time",
        icon: "Eye",
      },
    ],
    rating: 4.7,
    reviewCount: 89,
    installCount: 1203,
  },
  {
    id: "social-autopilot",
    slug: "social-autopilot",
    name: "Social Autopilot",
    tagline: "Automated social media scheduling & analytics",
    description:
      "Schedule posts across platforms, analyze engagement, and auto-boost top performers.",
    longDescription:
      "Social Autopilot manages your entire social media presence from one place. Connect accounts across platforms, schedule posts individually or in bulk, and visualize everything on a shared content calendar. The analytics suite tracks engagement metrics, audience growth, and content performance in real time. Identify peak posting times automatically and use auto-boost rules to amplify your best content with smart budget allocation.",
    category: "marketing",
    cardVariant: "green",
    icon: "Share2",
    price: 10,
    mcpTools: [
      {
        name: "connect_account",
        category: "social-accounts",
        description: "Link a social media account for scheduling and analytics",
      },
      {
        name: "disconnect_account",
        category: "social-accounts",
        description: "Remove a connected social media account",
      },
      {
        name: "list_accounts",
        category: "social-accounts",
        description: "List all connected social media accounts and their status",
      },
      {
        name: "account_health_check",
        category: "social-accounts",
        description: "Verify account connectivity and API access status",
      },
      {
        name: "schedule_post",
        category: "calendar",
        description: "Schedule a single post to one or more platforms at a specific time",
      },
      {
        name: "bulk_schedule",
        category: "calendar",
        description: "Upload and schedule multiple posts from a CSV or JSON source",
      },
      {
        name: "get_calendar",
        category: "calendar",
        description: "Retrieve the content calendar for a specified date range",
      },
      {
        name: "reschedule_post",
        category: "calendar",
        description: "Move a scheduled post to a different date and time",
      },
      {
        name: "cancel_post",
        category: "calendar",
        description: "Cancel a scheduled post before it publishes",
      },
      {
        name: "engagement_metrics",
        category: "pulse",
        description: "Get likes, shares, comments, and reach for published content",
      },
      {
        name: "audience_growth",
        category: "pulse",
        description: "Track follower count changes and growth rate over time",
      },
      {
        name: "content_performance",
        category: "pulse",
        description: "Rank published content by engagement and conversion metrics",
      },
      {
        name: "peak_time_analysis",
        category: "pulse",
        description: "Identify optimal posting times based on historical engagement data",
      },
      {
        name: "sentiment_tracker",
        category: "pulse",
        description: "Monitor audience sentiment in comments and mentions",
      },
      {
        name: "boost_post",
        category: "boost",
        description: "Promote a published post with paid amplification",
      },
      {
        name: "auto_boost_rules",
        category: "boost",
        description: "Set rules to automatically boost posts that exceed engagement thresholds",
      },
      {
        name: "budget_allocation",
        category: "boost",
        description: "Distribute boost budget across platforms and campaigns",
      },
      {
        name: "performance_targeting",
        category: "boost",
        description: "Refine audience targeting based on post performance data",
      },
    ],
    features: [
      {
        title: "Multi-Platform Scheduling",
        description:
          "Schedule and publish content across all major social platforms from one place",
        icon: "CalendarClock",
      },
      {
        title: "Analytics Dashboard",
        description: "Track engagement, growth, and content performance with real-time metrics",
        icon: "BarChart3",
      },
      {
        title: "Auto-Boost",
        description:
          "Automatically amplify top-performing posts with smart budget allocation",
        icon: "Rocket",
      },
      {
        title: "Content Calendar",
        description: "Visualize and manage your publishing schedule across all platforms",
        icon: "Calendar",
      },
    ],
    rating: 4.9,
    reviewCount: 215,
    installCount: 3421,
  },
  {
    id: "ops-dashboard",
    slug: "ops-dashboard",
    name: "Ops Dashboard",
    tagline: "Production monitoring, deployments & incident management",
    description:
      "Monitor deployments, track errors, and manage infrastructure from a unified operations hub.",
    longDescription:
      "Ops Dashboard gives your team a single pane of glass for production operations. Deploy and rollback Vercel projects with full log visibility. Track and resolve Sentry issues without leaving the dashboard. Manage GitHub repositories, branch protection rules, and releases. Control environment variables and rotate secrets across environments. Everything your ops team needs, connected and actionable.",
    category: "devops",
    cardVariant: "purple",
    icon: "Activity",
    price: 10,
    mcpTools: [
      {
        name: "list_deployments",
        category: "vercel",
        description: "List recent deployments with status, URL, and commit info",
      },
      {
        name: "deploy_project",
        category: "vercel",
        description: "Trigger a new deployment for a project from a specified branch",
      },
      {
        name: "rollback_deployment",
        category: "vercel",
        description: "Revert to a previous deployment instantly",
      },
      {
        name: "get_deployment_logs",
        category: "vercel",
        description: "Stream build and runtime logs for a specific deployment",
      },
      {
        name: "list_issues",
        category: "sentry",
        description: "Retrieve unresolved issues sorted by frequency or impact",
      },
      {
        name: "resolve_issue",
        category: "sentry",
        description: "Mark a Sentry issue as resolved with an optional resolution note",
      },
      {
        name: "get_error_details",
        category: "sentry",
        description: "Get full stack traces, breadcrumbs, and context for an error",
      },
      {
        name: "create_alert_rule",
        category: "sentry",
        description: "Set up alerting rules for error thresholds and new issue types",
      },
      {
        name: "repo_stats",
        category: "github-admin",
        description: "Get repository statistics including commit activity and contributors",
      },
      {
        name: "branch_protection",
        category: "github-admin",
        description: "View and configure branch protection rules for repositories",
      },
      {
        name: "merge_queue_status",
        category: "github-admin",
        description: "Check the current merge queue and pending pull requests",
      },
      {
        name: "release_create",
        category: "github-admin",
        description: "Create a new GitHub release with auto-generated changelog",
      },
      {
        name: "list_env_vars",
        category: "env",
        description: "List environment variables across deployment environments",
      },
      {
        name: "set_env_var",
        category: "env",
        description: "Create or update an environment variable for a specific environment",
      },
      {
        name: "rotate_secret",
        category: "env",
        description: "Generate and apply a new value for a secret environment variable",
      },
      {
        name: "env_diff",
        category: "env",
        description: "Compare environment variable values between two environments",
      },
    ],
    features: [
      {
        title: "Deployment Control",
        description: "Deploy, rollback, and monitor Vercel deployments with full log access",
        icon: "Upload",
      },
      {
        title: "Error Tracking",
        description: "Track and resolve production errors with Sentry integration",
        icon: "Bug",
      },
      {
        title: "GitHub Automation",
        description: "Manage repositories, releases, and branch protection from one place",
        icon: "GitBranch",
      },
      {
        title: "Environment Management",
        description: "Control environment variables and rotate secrets across environments",
        icon: "Lock",
      },
    ],
    rating: 4.6,
    reviewCount: 67,
    installCount: 892,
  },
];

export function getAppBySlug(slug: string): StoreApp | undefined {
  return STORE_APPS.find((app) => app.slug === slug);
}

export function getAppsByCategory(category: string): StoreApp[] {
  if (category === "all") return STORE_APPS;
  return STORE_APPS.filter((app) => app.category === category);
}
