# Orbit User Guide

> **Last Updated**: January 22, 2026
> **Version**: 1.0
> **Platform**: spike.land/orbit

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard (Pulse)](#dashboard-pulse)
4. [Inbox](#inbox)
5. [Allocator](#allocator)
6. [Scout](#scout)
7. [Brand Brain](#brand-brain)
8. [Relay](#relay)
9. [Settings](#settings)
10. [FAQ](#faq)

---

## Introduction

### What is Orbit?

**Orbit** is your comprehensive social media command center that brings AI-powered automation to your social media management workflow. It helps you monitor, analyze, respond to, and optimize your social media presence across multiple platforms—all from a single, unified interface.

### Key Features at a Glance

| Feature         | Description                                        | Primary Benefit                        |
| --------------- | -------------------------------------------------- | -------------------------------------- |
| **Pulse**       | Real-time health monitoring with anomaly detection | Catch issues before they become crises |
| **Inbox**       | Unified social mentions with AI-powered triage     | Never miss important messages          |
| **Allocator**   | AI budget recommendations with autopilot mode      | Optimize ad spend automatically        |
| **Scout**       | Competitive intelligence and benchmarking          | Stay ahead of competitors              |
| **Brand Brain** | Centralized brand voice and guardrails             | Ensure consistent, on-brand content    |
| **Relay**       | AI draft generation with approval workflows        | Speed up content creation              |

### Who is Orbit For?

- **Social Media Managers** managing multiple accounts and platforms
- **Marketing Teams** coordinating campaigns across channels
- **Small Business Owners** without dedicated social media staff
- **Agencies** managing clients' social presence
- **Content Creators** maintaining consistent brand voice

---

## Getting Started

### Creating Your First Workspace

When you first access Orbit at `spike.land/orbit`, you'll be prompted to create a workspace.

**What is a Workspace?**
A workspace is your isolated environment for managing social media accounts, team members, and content. You can create multiple workspaces for different brands or clients.

**To Create a Workspace:**

1. Navigate to `spike.land/orbit`
2. Click **"Create Workspace"**
3. Enter your workspace details:
   - **Workspace Name** (required): e.g., "Acme Corporation"
   - **Description** (optional): e.g., "Social media management for Acme Corp"
4. Click **"Create Workspace"**

You'll be automatically redirected to your new workspace dashboard.

### Connecting Social Accounts

Before you can use most Orbit features, you need to connect your social media accounts.

**Supported Platforms:**

- Instagram
- Facebook
- Twitter/X
- LinkedIn
- TikTok

**To Connect an Account:**

1. Navigate to **Settings** → **Social Accounts**
2. Click **"Connect Account"** for your desired platform
3. Follow the OAuth authentication flow
4. Grant Orbit the necessary permissions:
   - Read messages and mentions
   - Post content (for Relay)
   - Access analytics (for Pulse and Allocator)
5. Verify the connection is successful

> **Note**: Each platform requires specific permissions. Orbit uses read-only access where possible to minimize security concerns.

### Workspace Navigation

The Orbit sidebar provides quick access to all features:

```
📊 Dashboard (Pulse)    - Health monitoring
📥 Inbox                - Social mentions
💰 Allocator            - Budget optimization
🔍 Scout                - Competitor intelligence
🧠 Brand Brain          - Brand voice & guardrails
✉️ Relay                - Draft generation
📅 Calendar             - Content scheduling
⚙️ Settings             - Configuration
```

### User Roles and Permissions

Orbit workspaces support three user roles:

| Role       | Permissions                        | Typical Use Case          |
| ---------- | ---------------------------------- | ------------------------- |
| **OWNER**  | Full access, can delete workspace  | Workspace creator         |
| **ADMIN**  | Full access except deletion        | Team leads, managers      |
| **MEMBER** | View and respond, limited settings | Team members, contractors |

---

## Dashboard (Pulse)

**Location**: `/orbit/[workspace]/dashboard`

Pulse is your real-time health monitoring system that uses AI to detect anomalies in your social media performance.

### Overview

The Pulse dashboard provides:

- **Health Status Widget**: Overall account health at a glance
- **Anomaly Alerts**: Critical and warning notifications
- **Platform Status Grid**: Per-platform health indicators
- **Trend Charts**: Historical performance visualization

### Health Status Indicators

Pulse continuously monitors your accounts and assigns a health status:

| Status       | Indicator | Meaning                                             |
| ------------ | --------- | --------------------------------------------------- |
| **Healthy**  | 🟢 Green  | All metrics within normal ranges                    |
| **Warning**  | 🟡 Yellow | Minor anomalies detected, monitor closely           |
| **Critical** | 🔴 Red    | Significant anomalies requiring immediate attention |

### Understanding Anomaly Detection

Pulse uses statistical analysis to detect unusual patterns in your metrics:

**Monitored Metrics:**

- Follower count changes
- Engagement rates (likes, comments, shares)
- Impression counts
- Reach metrics
- Post frequency

**Anomaly Types:**

- **Spike**: Unexpected increase (e.g., viral post, bot attack)
- **Drop**: Unexpected decrease (e.g., unfollows, reduced reach)

**Severity Levels:**

- **Warning**: 2-3 standard deviations from normal
- **Critical**: 3+ standard deviations from normal

### Reading Anomaly Alerts

Each anomaly alert displays:

```
Platform: Instagram
Account: @yourbrand
Metric: Follower Count
Current: 15,234 (↓ -12.5%)
Expected: 17,400
Severity: Critical
Detected: 2 minutes ago
```

**Action Buttons:**

- **Investigate**: Deep dive into the metric
- **Acknowledge**: Mark as reviewed
- **Dismiss**: Remove from alerts (if false positive)

### Platform Status Grid

The platform grid shows health per connected account:

```
┌─────────────────────────────────────┐
│ Instagram @yourbrand                │
│ Status: Healthy 🟢                  │
│ Followers: 15.2K (↑ 123 today)     │
│ Last Updated: 2 minutes ago         │
└─────────────────────────────────────┘
```

**Status Details:**

- Click any platform card to view detailed metrics
- See follower growth over time
- View engagement trends

### Trend Charts

The metrics trend chart visualizes performance over time:

**Available Metrics:**

- Followers
- Impressions
- Reach
- Engagement

**Time Periods:**

- Last 7 days
- Last 30 days
- Last 90 days

**Chart Features:**

- Hover over data points for exact values
- Toggle metrics on/off
- Compare multiple platforms

### Auto-Refresh and Polling

Pulse automatically refreshes data every **30 seconds** when the dashboard is visible. When you switch tabs, polling pauses to save resources and resume when you return.

### Best Practices

✅ **Do:**

- Check Pulse daily for anomaly alerts
- Investigate critical alerts immediately
- Set up mobile notifications (coming soon)
- Review trend charts weekly for patterns

❌ **Don't:**

- Ignore critical alerts—they indicate real issues
- Dismiss anomalies without investigation
- Rely solely on Pulse—combine with platform analytics

---

## Inbox

**Location**: `/orbit/[workspace]/inbox`

The Inbox centralizes all social mentions, messages, and comments across platforms into a single, AI-powered triage system.

### Inbox Layout

The Inbox uses a two-panel layout:

```
┌─────────────────┬──────────────────────────┐
│   Item List     │   Detail View            │
│   (Left 1/3)    │   (Right 2/3)            │
│                 │                          │
│ 🔴 Urgent       │ [Selected Item Details]  │
│ 🟡 Important    │ [Reply Panel]            │
│ 🔵 Normal       │ [Action Buttons]         │
│ ⚪ Low          │                          │
│                 │                          │
└─────────────────┴──────────────────────────┘
```

### Inbox Item Types

| Type               | Icon | Description      | Example                          |
| ------------------ | ---- | ---------------- | -------------------------------- |
| **DIRECT_MESSAGE** | 💬   | Private messages | Instagram DMs, Facebook messages |
| **COMMENT**        | 💭   | Public comments  | Post comments, replies           |
| **MENTION**        | @️⃣    | Brand mentions   | Tagged posts, @mentions          |
| **REVIEW**         | ⭐   | Customer reviews | Facebook reviews, Google reviews |

### AI-Powered Priority Scoring

Every inbox item is automatically analyzed and assigned a priority score based on:

**Priority Factors:**

1. **Sentiment Analysis**: Negative sentiment = higher priority
2. **Urgency Detection**: Time-sensitive language (e.g., "urgent", "ASAP")
3. **Question Detection**: Questions require responses
4. **Complaint Detection**: Customer service issues
5. **VIP Status**: High-value customers or influencers
6. **Response Time**: Older messages get higher priority

**Priority Levels:**

| Priority   | Score  | Color     | Auto-Actions             |
| ---------- | ------ | --------- | ------------------------ |
| **Urgent** | 90-100 | 🔴 Red    | Immediate notification   |
| **High**   | 70-89  | 🟡 Yellow | Same-day response target |
| **Medium** | 40-69  | 🔵 Blue   | 24-hour response target  |
| **Low**    | 0-39   | ⚪ White  | Weekly batch processing  |

### Filtering and Sorting

**Available Filters:**

1. **Status**
   - Unread
   - Read
   - Replied
   - Resolved

2. **Priority**
   - Urgent only
   - High and above
   - All priorities

3. **Platform**
   - Instagram
   - Facebook
   - Twitter/X
   - LinkedIn
   - TikTok

4. **Assigned To**
   - Me
   - Unassigned
   - Team member

5. **Sentiment**
   - Positive
   - Neutral
   - Negative

**Sort Options:**

- Priority (high to low)
- Received date (newest first)
- Platform

### Responding to Messages

**To Reply to an Inbox Item:**

1. Click the item in the left panel
2. Review the message details and context
3. Use the Reply Panel:
   - **Manual Reply**: Type your response directly
   - **AI Draft**: Generate AI suggestions (see [Relay](#relay))
   - **Template**: Use saved response templates
4. Preview your reply
5. Click **"Send Reply"**

**Reply Features:**

- **Tone Matching**: AI suggests tone based on brand voice
- **Character Limits**: Platform-specific limits enforced
- **Media Attachments**: Add images, videos, links
- **Emojis**: Platform-appropriate emoji suggestions

### Assignment Workflow

Assign inbox items to team members for accountability:

**To Assign an Item:**

1. Select the inbox item
2. Click **"Assign"** button
3. Choose a team member from the dropdown
4. Add optional note: "Follow up about refund request"
5. Click **"Assign"**

**Assignment Notifications:**

- Assigned team member receives notification
- Item appears in their "Assigned to Me" filter
- Assignee can reassign if needed

### Escalation Status

Some inbox items are automatically flagged for escalation:

**Escalation Triggers:**

- Very negative sentiment (complaints)
- Legal or compliance keywords
- Threats or hostile language
- Requests for refunds or cancellations

**Escalation Indicator:**

```
⚠️ ESCALATION REQUIRED
Reason: Potential legal issue detected
Recommended Action: Forward to legal team
```

### Sentiment Badges

Each inbox item displays a sentiment badge:

| Sentiment    | Badge    | AI Confidence  |
| ------------ | -------- | -------------- |
| **Positive** | 😊 Green | 80%+ confident |
| **Neutral**  | 😐 Gray  | -              |
| **Negative** | 😞 Red   | 80%+ confident |

### AI Suggestions Panel

The AI Suggestions Panel provides context-aware recommendations:

**Suggestion Types:**

1. **Quick Replies**: Pre-written responses for common scenarios
2. **Information Needed**: Data the customer likely wants
3. **Related Articles**: Help center links
4. **Similar Past Conversations**: How you handled similar issues

**Example Suggestions:**

```
💡 Suggested Actions:
• Apologize for the delay
• Offer 20% discount code
• Provide tracking number
• Escalate to support team
```

### Bulk Actions

Process multiple items at once:

**Available Bulk Actions:**

1. **Mark as Read**: Clear multiple notifications
2. **Archive**: Hide resolved conversations
3. **Assign**: Assign multiple items to one person
4. **Tag**: Add tags for organization

**To Use Bulk Actions:**

1. Select multiple items (checkboxes)
2. Click **"Bulk Actions"** dropdown
3. Choose action
4. Confirm

### Smart Routing Rules

Configure automatic routing based on conditions:

**Example Rules:**

```
IF inbox_item.sentiment == "NEGATIVE" AND inbox_item.platform == "TWITTER"
THEN assign_to("customer_support_lead") AND set_priority("URGENT")
```

**Common Routing Scenarios:**

- Negative feedback → Senior team member
- Product questions → Product specialist
- Billing inquiries → Finance team
- Complaints → Customer service lead

**Configure at**: Settings → Inbox Smart Routing

### Best Practices

✅ **Do:**

- Respond to urgent items within 1 hour
- Use AI drafts as starting points, personalize
- Assign items to appropriate team members
- Mark items as resolved when complete
- Review sentiment trends weekly

❌ **Don't:**

- Leave urgent items unread
- Copy-paste AI responses without review
- Ignore escalation flags
- Respond when angry—let AI help with tone

---

## Allocator

**Location**: `/orbit/[workspace]/allocator`

Allocator is your AI-powered budget optimization assistant that analyzes campaign performance and provides actionable recommendations for ad spend allocation.

### Overview

Allocator helps you:

- **Analyze** campaign performance across platforms
- **Recommend** budget reallocations for better ROI
- **Automate** budget changes with Autopilot mode
- **Track** historical performance and decisions

### Supported Ad Platforms

| Platform         | Integration     | Features                               |
| ---------------- | --------------- | -------------------------------------- |
| **Google Ads**   | Full API access | Campaign sync, budget management       |
| **Facebook Ads** | Full API access | Ad set optimization, audience insights |
| **LinkedIn Ads** | Coming soon     | -                                      |
| **TikTok Ads**   | Coming soon     | -                                      |

### Dashboard Components

#### 1. Spend Overview Cards

Four key metrics displayed at the top:

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Spend  │ Active       │ Avg. CPA     │ Total        │
│ $12,450      │ Campaigns    │ $8.32        │ Conversions  │
│ ↑ +5.2%      │ 12           │ ↓ -12.1%     │ 1,498        │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Metrics Explained:**

- **Total Spend**: Sum of all campaign budgets in the period
- **Active Campaigns**: Currently running campaigns
- **Average CPA**: Cost per acquisition/conversion
- **Total Conversions**: Successful outcomes (sales, signups, etc.)

**Trend Indicators:**

- ↑ Green arrow: Improvement (higher conversions, lower CPA)
- ↓ Red arrow: Decline
- Percentage shows change vs. previous period

#### 2. Performance Chart

Interactive chart showing campaign performance over time:

**Available Views:**

- Spend vs. Conversions
- CPA over time
- ROAS (Return on Ad Spend) trends
- Platform comparison

**Chart Controls:**

- Date range selector (7, 14, 30, 60, 90 days)
- Toggle campaigns on/off
- Export data to CSV

#### 3. Recommendation Cards

AI-generated budget optimization suggestions:

**Example Recommendation:**

```
┌─────────────────────────────────────────────────┐
│ 💡 Increase Budget - "Summer Sale Campaign"     │
│                                                 │
│ Current Budget: $500/day                       │
│ Recommended: $750/day (+50%)                   │
│                                                 │
│ Confidence: High (87%)                         │
│ Expected Impact: +45 conversions/day           │
│ Estimated ROI Increase: +32%                   │
│                                                 │
│ Reasoning:                                     │
│ • CPA ($6.20) is 40% below target              │
│ • Click-through rate improving                 │
│ • Still has room to scale                      │
│                                                 │
│ [Apply] [Dismiss] [Modify]                     │
└─────────────────────────────────────────────────┘
```

**Recommendation Types:**

| Type                 | Action           | When Suggested                       |
| -------------------- | ---------------- | ------------------------------------ |
| **INCREASE_BUDGET**  | Add more funding | High performance, room to scale      |
| **DECREASE_BUDGET**  | Reduce funding   | Poor performance, high CPA           |
| **PAUSE_CAMPAIGN**   | Stop spending    | Very poor performance, wasted budget |
| **REALLOCATE**       | Move budget      | Better opportunities elsewhere       |
| **ADJUST_TARGETING** | Refine audience  | Improving performance possible       |

**Confidence Levels:**

- **High (80-100%)**: Strong data, clear signal
- **Medium (60-79%)**: Reasonable data, likely beneficial
- **Low (40-59%)**: Limited data, proceed with caution

### Analysis Parameters

Customize the analysis to your needs:

#### Lookback Period

How far back to analyze performance:

| Period      | Use Case                          | Data Points        |
| ----------- | --------------------------------- | ------------------ |
| **7 days**  | Rapid optimization, new campaigns | 7-14 data points   |
| **14 days** | Weekly optimization cycle         | 14-28 data points  |
| **30 days** | Monthly planning (recommended)    | 30-60 data points  |
| **60 days** | Seasonal trends                   | 60-120 data points |
| **90 days** | Long-term strategy                | 90-180 data points |

> **Recommendation**: Use **30 days** for most decisions. Shorter periods react faster but may be volatile; longer periods are more stable but slower to adapt.

#### Risk Tolerance

How aggressive should recommendations be:

| Setting          | Description                | Typical Changes         |
| ---------------- | -------------------------- | ----------------------- |
| **Conservative** | Small, safe adjustments    | ±10-20% budget changes  |
| **Moderate**     | Balanced risk/reward       | ±20-40% budget changes  |
| **Aggressive**   | Bold moves for fast growth | ±40-100% budget changes |

**Choosing Risk Tolerance:**

- **Conservative**: Limited budget, can't afford mistakes
- **Moderate**: Standard business operations (recommended)
- **Aggressive**: Growth phase, plenty of budget, data-driven

### Applying Recommendations

**Manual Application:**

1. Review the recommendation card
2. Verify the reasoning and confidence level
3. Click **"Apply"** to accept as-is
4. OR click **"Modify"** to adjust:
   - Change the recommended amount
   - Set a different timeline
   - Add notes
5. Confirm application
6. Changes sync to ad platform within 5 minutes

**Application Tracking:**

- All applied recommendations are logged
- View audit trail in Settings → Audit Log
- Compare before/after performance

### Autopilot Mode

**⚠️ Advanced Feature**: Autopilot automatically applies recommendations without manual approval.

#### Enabling Autopilot

1. Click **Autopilot Settings** button
2. Configure safety guardrails:
   - Maximum daily spend limit
   - Maximum single change amount
   - Required confidence threshold
   - Excluded campaigns (always manual)
3. Review emergency stop conditions
4. Enable Autopilot toggle

#### Autopilot Configuration

**Safety Guardrails:**

```
Max Daily Spend: $5,000
Max Single Change: $500 (+/- 50% of current)
Min Confidence: 75% (High only)
Excluded Campaigns:
  • Brand Protection Campaign
  • Holiday Special (manual only)
```

**Emergency Stop Triggers:**

- Total spend exceeds daily limit
- CPA increases by >50% in 24 hours
- Conversion rate drops below threshold
- Manual emergency stop button

#### Autopilot Execution History

View all automated changes:

```
┌─────────────────────────────────────────────────┐
│ Autopilot Execution Log                         │
├─────────────────────────────────────────────────┤
│ 2026-01-22 10:30 AM                             │
│ Campaign: Summer Sale                           │
│ Action: Increased budget $500 → $650            │
│ Reason: CPA below target, room to scale         │
│ Status: Applied ✅                               │
├─────────────────────────────────────────────────┤
│ 2026-01-22 09:15 AM                             │
│ Campaign: Winter Clearance                      │
│ Action: Decreased budget $300 → $200            │
│ Reason: Poor performance, high CPA              │
│ Status: Applied ✅                               │
└─────────────────────────────────────────────────┘
```

**Execution Log Details:**

- Timestamp of decision
- Campaign affected
- Action taken
- AI reasoning
- Application status
- Performance impact (updated after 24-48 hours)

### Platform-Specific Features

#### Google Ads

**Available Actions:**

- Campaign budget adjustments
- Ad group budget allocation
- Keyword bid optimization
- Automated rules sync

**Sync Frequency:**

- Campaign data: Every 6 hours
- Performance metrics: Every 1 hour
- Budget changes: Real-time (5 min)

**To Sync Manually:**
Click **"Sync Google Ads"** button in dashboard header.

#### Facebook Ads

**Available Actions:**

- Campaign budget optimization (CBO)
- Ad set budget adjustments
- Audience recommendations
- Creative rotation suggestions

**Sync Frequency:**

- Campaign data: Every 6 hours
- Performance metrics: Every 1 hour
- Budget changes: Real-time (5 min)

**To Sync Manually:**
Click **"Sync Facebook Ads"** button in dashboard header.

### Audit Log

**Location**: `/orbit/[workspace]/allocator/audit`

The Audit Log records all budget changes for accountability and analysis:

**Log Entry Example:**

```
Timestamp: 2026-01-22 10:30:15
User: ai-autopilot
Action: BUDGET_INCREASE
Campaign: Summer Sale (Google Ads)
Old Value: $500/day
New Value: $650/day
Change: +$150 (+30%)
Reason: CPA below target ($6.20 vs $10.00), conversion volume increasing, ad fatigue low
Confidence: 87% (High)
Expected Impact: +23 conversions/day
Actual Impact: +19 conversions/day (82% of prediction) ✅
ROI: +$1,140 revenue vs +$150 cost = +$990 net (+660% ROI)
Status: SUCCESS
```

**Audit Filters:**

- Date range
- Campaign
- Action type (increase, decrease, pause, resume)
- User (human vs. autopilot)
- Success vs. failure

### Best Practices

✅ **Do:**

- Review recommendations daily
- Start with **Moderate** risk tolerance
- Enable Autopilot only after 2-4 weeks of manual review
- Check audit log weekly for unexpected changes
- Set conservative guardrails when enabling Autopilot
- Sync platforms before major campaign changes

❌ **Don't:**

- Apply all recommendations without review
- Use **Aggressive** risk on limited budgets
- Enable Autopilot without proper guardrails
- Ignore emergency stop alerts
- Make manual changes without syncing first
- Expect instant results (wait 48-72 hours)

---

## Scout

**Location**: `/orbit/[workspace]/scout` (Coming Soon)

Scout provides competitive intelligence and benchmarking to help you understand your market position and identify opportunities.

### Overview

Scout helps you:

- **Monitor** competitor social media activity
- **Benchmark** your performance against competitors
- **Identify** trending topics and content strategies
- **Discover** gaps and opportunities in your market

### Adding Competitors

**To Add a Competitor:**

1. Navigate to Scout dashboard
2. Click **"Add Competitor"**
3. Enter competitor information:
   - Company name
   - Social media handles (Instagram, Facebook, Twitter, etc.)
   - Website URL
4. Click **"Start Monitoring"**

Scout will begin collecting data within 24 hours.

**Monitored Data Points:**

- Posting frequency
- Engagement rates
- Follower growth
- Content types (video, image, text)
- Hashtag strategy
- Response times

### Competitor Benchmark Report

The benchmark report compares your performance to competitor averages:

```
┌─────────────────────────────────────────────────┐
│ Performance Benchmark (Last 30 Days)            │
├─────────────────────────────────────────────────┤
│ Metric            │ You      │ Competitor Avg   │
├──────────────────────────────────────────────────┤
│ Posts per Week    │ 7        │ 12 (-42%) 📉     │
│ Avg. Likes        │ 234      │ 189 (+24%) 📈    │
│ Avg. Comments     │ 45       │ 38 (+18%) 📈     │
│ Engagement Rate   │ 4.2%     │ 3.8% (+11%) 📈   │
│ Follower Growth   │ +2.3%    │ +1.8% (+28%) 📈  │
└─────────────────────────────────────────────────┘
```

**Benchmark Insights:**

- 📈 **Green**: You're outperforming competitors
- 📉 **Red**: Competitors are ahead
- Percentage shows relative difference

### Topic Feed Configuration

Monitor specific topics and keywords:

**To Configure Topics:**

1. Go to Scout → Topic Monitoring
2. Click **"Add Topic"**
3. Enter topic details:
   - Topic name (e.g., "AI Marketing")
   - Keywords (e.g., "artificial intelligence", "machine learning", "AI tools")
   - Platforms to monitor
4. Set alert frequency:
   - Real-time
   - Daily digest
   - Weekly summary

**Topic Feed Example:**

```
🔥 Trending in "AI Marketing"
├─ 156 mentions in last 24 hours (+45%)
├─ Top post: "5 AI tools every marketer needs"
│  By: @marketingpro (15.2K likes)
├─ Sentiment: 78% Positive
└─ Your opportunity: Create AI tools guide
```

### Competitor Content Analysis

Analyze what content performs best for competitors:

**Content Type Breakdown:**

```
Competitor: @brandxyz
Top Performing Content Types (Last 30 Days):

1. Video (Reels)        - Avg. 5.2K likes
2. Carousel Posts       - Avg. 3.8K likes
3. Single Image         - Avg. 2.1K likes
4. Text-only           - Avg. 890 likes
```

**Hashtag Strategy:**

```
Most Effective Hashtags:
1. #marketing (in 45% of posts) - Avg. 3.2K engagement
2. #digitalmarketing (in 38% of posts) - Avg. 2.9K engagement
3. #socialmediatips (in 29% of posts) - Avg. 2.1K engagement
```

### Opportunity Identification

Scout identifies gaps where competitors are succeeding and you're not:

**Gap Analysis:**

```
💡 Opportunity: Video Content
Your video posts: 1/week
Competitor average: 5/week
Engagement potential: +420% based on competitor performance

Recommended Action:
• Increase video content to 3-4/week
• Focus on Reels/short-form
• Topic ideas: [AI-generated suggestions]
```

### Best Practices

✅ **Do:**

- Add 3-5 direct competitors for accurate benchmarking
- Review benchmark report monthly
- Act on gap analysis insights
- Monitor trending topics in your industry
- Track competitor launches and campaigns

❌ **Don't:**

- Copy competitor content directly
- Add too many competitors (dilutes insights)
- Ignore your own strengths shown in benchmarks
- React to every competitor move (stay strategic)

> **Note**: Scout is currently in development. Contact support for early access.

---

## Brand Brain

**Location**: `/orbit/[workspace]/brand-brain`

Brand Brain is your centralized system for maintaining consistent brand voice, visual identity, and content guardrails across all AI-generated content.

### What is Brand Brain?

Brand Brain acts as your "AI content guardian," ensuring that all AI-generated drafts, responses, and content align with your brand's identity, values, and guidelines.

### Initial Setup Wizard

When you first access Brand Brain, you'll complete a setup wizard:

#### Step 1: Brand Basics

Define your core brand identity:

**Required Fields:**

- **Brand Name**: Your company/product name
- **Mission Statement**: Why you exist (1-2 sentences)
- **Core Values**: 3-5 values that guide your actions

**Example:**

```
Brand Name: Acme Corp
Mission: We empower small businesses with simple, powerful tools
Values:
• Simplicity
• Empowerment
• Reliability
• Innovation
• Customer-First
```

#### Step 2: Voice & Tone

Configure your brand voice using dimensional sliders:

**Voice Dimensions:**

Each slider ranges from 0-100:

| Dimension      | Left (0)     | Right (100)  | Your Setting  |
| -------------- | ------------ | ------------ | ------------- |
| **Formality**  | Casual       | Formal       | ████░░░░░░ 40 |
| **Enthusiasm** | Serious      | Enthusiastic | ██████░░░░ 60 |
| **Humor**      | Professional | Humorous     | ███░░░░░░░ 30 |
| **Empathy**    | Direct       | Empathetic   | ████████░░ 80 |
| **Technical**  | Simple       | Technical    | ████░░░░░░ 40 |

**Tone Descriptors:**

Based on your sliders, Brand Brain generates a tone summary:

```
Your Brand Voice:
"Friendly and approachable, with professional authority.
We speak clearly without jargon, showing genuine care for
customer success while maintaining credibility."
```

**Example Sentences:**

The wizard provides sample sentences in your brand voice:

```
✅ "We're here to help you succeed. Let's solve this together."
❌ "Per your inquiry, we shall endeavor to provide resolution."
```

#### Step 3: Visual Identity

Upload and configure visual brand elements:

**Logo Upload:**

- Upload your logo (PNG, SVG, JPG)
- Used in content previews and approvals
- Stored securely in R2 storage

**Color Palette:**

Define your brand colors:

```
┌────────────────────────────────────┐
│ Primary:   #007AFF  [■■■■■■]      │
│ Secondary: #5AC8FA  [■■■■■■]      │
│ Accent:    #FF9500  [■■■■■■]      │
│ Dark:      #1C1C1E  [■■■■■■]      │
│ Light:     #F2F2F7  [■■■■■■]      │
└────────────────────────────────────┘
```

For each color:

- **Name**: Primary, Secondary, etc.
- **Hex Code**: #007AFF
- **Usage**: "Use for CTAs and links"

**Typography (Coming Soon):**

- Primary font
- Secondary font
- Font usage guidelines

#### Step 4: Content Guardrails

Set rules and restrictions for AI-generated content:

**Guardrail Types:**

1. **Prohibited Topics**
   - Topics that should never be mentioned
   - Example: "Competitors by name", "Political opinions"

2. **Required Disclosures**
   - Legal or compliance statements
   - Example: "All claims backed by studies", "#Ad for sponsored content"

3. **Content Warnings**
   - Sensitive topics that need careful handling
   - Example: "Health advice requires disclaimer", "Financial guidance"

**Adding a Guardrail:**

```
Type: Prohibited Topic
Rule: "Never mention competitor brands by name"
Severity: High
Action: Block content generation
Applies to: All platforms, all content types
```

**Guardrail Example:**

```
✅ Approved:
"Our tool helps you save time compared to manual processes."

❌ Blocked:
"Our tool is better than [Competitor Name]."
Reason: Prohibited topic - competitor mention
```

#### Step 5: Vocabulary

Define preferred and prohibited terminology:

**Vocabulary Entry Types:**

| Type           | Purpose                            | Example                                       |
| -------------- | ---------------------------------- | --------------------------------------------- |
| **Preferred**  | Words/phrases to use               | "customer" instead of "client"                |
| **Prohibited** | Words to avoid                     | Never say "cheap" (use "affordable")          |
| **Acronym**    | Abbreviations to expand            | "AI" → "Artificial Intelligence" on first use |
| **Jargon**     | Industry terms to avoid or explain | Avoid "B2B SaaS" unless explained             |

**Adding Vocabulary:**

```
Term: "client"
Preferred Alternative: "customer"
Reason: "We use 'customer' to emphasize B2C focus"
Severity: Medium
Auto-Replace: Yes
```

**Example Corrections:**

```
Original: "Our platform helps clients scale quickly."
Corrected: "Our platform helps customers scale quickly."
```

#### Step 6: Review and Activate

Review your complete brand profile:

```
✅ Brand Basics: Complete
✅ Voice & Tone: Configured (Friendly, Professional)
✅ Visual Identity: Logo uploaded, 5 colors defined
✅ Guardrails: 8 rules active
✅ Vocabulary: 12 terms configured

[Save and Activate Brand Brain]
```

Once activated, all AI features (Relay, content suggestions) will use your brand profile.

### Brand Brain Dashboard

After setup, the Brand Brain dashboard displays your active configuration:

**Dashboard Sections:**

1. **Brand Identity Card**
   - Logo
   - Brand name
   - Mission statement
   - Core values

2. **Voice & Tone Visualization**
   - Slider visualizations
   - Tone summary
   - Example phrases

3. **Color Palette Display**
   - Color swatches with names and hex codes

4. **Guardrails Summary**
   - Number of active guardrails by type
   - Most recent additions

5. **Vocabulary Count**
   - Total terms configured
   - Recent updates

### Content Rewriter Tool

**Location**: `/orbit/[workspace]/brand-brain/rewriter`

Test and refine content using your brand voice:

**To Rewrite Content:**

1. Navigate to Brand Brain → Content Rewriter
2. Select platform: Instagram, Facebook, Twitter, LinkedIn
3. Enter your content:
   ```
   Original:
   "Hey guys! Check out our new product. It's super cheap
   and way better than [Competitor]. Buy now!"
   ```
4. Click **"Rewrite with Brand Voice"**
5. View AI rewrite:
   ```
   Rewritten:
   "We're excited to introduce our newest solution! Designed
   to be affordable and effective, it helps you [specific benefit].
   Learn more and get started today."

   ✅ Aligned with Friendly tone
   ✅ Replaced "cheap" with "affordable"
   ✅ Removed competitor mention (guardrail)
   ✅ Changed "guys" to inclusive language
   ```

**Rewrite Features:**

- **Platform-Specific**: Optimized for character limits
- **Tone Alignment Score**: How well it matches your voice
- **Guardrail Checks**: Highlights violations fixed
- **Diff View**: See what changed (side-by-side comparison)

### Editing Your Brand Profile

**To Update Brand Brain:**

1. Navigate to Brand Brain dashboard
2. Click **"Edit Profile"** (Admins/Owners only)
3. Make changes in the wizard
4. Click **"Save Changes"**

**Version Control:**

- Each save creates a new version
- Previous versions are preserved
- Compare versions side-by-side
- Revert to previous version if needed

**Version History:**

```
Version 3 (Current) - Jan 22, 2026
• Updated color palette
• Added 3 new guardrails
• Adjusted formality slider (+10)

Version 2 - Jan 15, 2026
• Added vocabulary terms
• Updated mission statement

Version 1 - Jan 10, 2026
• Initial setup
```

### Brand Compliance Reports

View how well content adheres to brand guidelines:

**Compliance Score:**

```
Overall Compliance: 94% ✅

Last 30 Days:
• 234 drafts generated
• 220 passed all guardrails (94%)
• 14 required manual review (6%)
• 0 violations published

Top Issues:
1. Tone misalignment (8 instances)
2. Vocabulary preference ignored (4 instances)
3. Color usage incorrect (2 instances)
```

**Detailed Reports:**

- Guardrail violation trends
- Most common tone deviations
- Vocabulary compliance rate
- Platform-specific compliance

### Best Practices

✅ **Do:**

- Complete full setup wizard for best results
- Review and update quarterly as brand evolves
- Add new vocabulary as it emerges
- Test content rewriter with real examples
- Train team on brand voice using examples

❌ **Don't:**

- Skip voice & tone configuration (critical!)
- Create too many guardrails (focus on key rules)
- Set conflicting rules (test edge cases)
- Ignore compliance reports
- Let Brand Brain get outdated

### Permissions

| Action                  | Owner | Admin | Member |
| ----------------------- | ----- | ----- | ------ |
| View brand profile      | ✅    | ✅    | ✅     |
| Use content rewriter    | ✅    | ✅    | ✅     |
| Edit brand profile      | ✅    | ✅    | ❌     |
| Delete guardrails       | ✅    | ✅    | ❌     |
| View compliance reports | ✅    | ✅    | ❌     |

---

## Relay

**Location**: `/orbit/[workspace]/relay` (Coming Soon via Inbox)

Relay is your AI-powered content draft generator with built-in approval workflows, ensuring brand-aligned responses while speeding up content creation.

### What is Relay?

Relay generates AI drafts for:

- Social media responses (Inbox integration)
- Post content (scheduled posts)
- Ad copy (campaign creation)
- Email templates (customer communications)

All drafts are filtered through Brand Brain for compliance before human review.

### Using Relay from Inbox

Relay is tightly integrated with the Inbox for response generation:

**To Generate a Reply Draft:**

1. Select an inbox item
2. In the Reply Panel, click **"Generate AI Draft"**
3. (Optional) Add custom instructions:
   ```
   Custom Instructions:
   "Include a 10% discount code. Keep response under 100 characters."
   ```
4. Click **"Generate"**
5. Relay creates **3 draft variations**:

**Draft Variations:**

```
┌─────────────────────────────────────────────────┐
│ Draft 1 (Recommended) ⭐                         │
│ Tone Match: 95% | Character Count: 87           │
│                                                 │
│ "Thanks for reaching out! We'd love to help.   │
│ Use code SAVE10 for 10% off. Let us know if    │
│ you have questions!"                            │
│                                                 │
│ ✅ Brand voice aligned                          │
│ ✅ Within character limit                       │
│ ✅ Includes discount code                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Draft 2 (More Formal)                           │
│ Tone Match: 88% | Character Count: 104          │
│                                                 │
│ "Thank you for contacting us. We're here to    │
│ assist. Please use discount code SAVE10 for    │
│ 10% off your purchase. Feel free to reach out  │
│ with any questions."                            │
│                                                 │
│ ⚠️ Slightly over character limit                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Draft 3 (More Casual)                           │
│ Tone Match: 91% | Character Count: 79           │
│                                                 │
│ "Hey! Thanks for the message. Grab 10% off     │
│ with SAVE10. Happy to help anytime! 😊"         │
│                                                 │
│ ✅ Most concise                                 │
│ ✅ Includes emoji                               │
└─────────────────────────────────────────────────┘
```

### Draft Metadata

Each draft includes analysis and scoring:

**Tone Match Score:**

- Compares draft to your Brand Brain voice settings
- 90-100%: Excellent match
- 75-89%: Good match
- Below 75%: Needs manual review

**Character Count:**

- Enforces platform limits automatically:
  - Twitter/X: 280 characters
  - Instagram caption: 2,200 characters
  - Facebook: No strict limit but shorter is better
  - LinkedIn: 3,000 characters

**Brand Compliance Checks:**

- ✅ No guardrail violations
- ✅ Vocabulary preferences followed
- ✅ Tone within acceptable range
- ⚠️ Minor deviations flagged
- ❌ Major violations blocked

### Selecting and Editing Drafts

**To Use a Draft:**

1. Review the three variations
2. Select your preferred draft (click the card)
3. Edit if needed:
   - Modify text directly in the editor
   - Add emojis or formatting
   - Attach media (images, videos)
4. Preview the final result
5. Choose action:
   - **Send Now**: Immediate posting
   - **Schedule**: Set time for later
   - **Request Approval**: Send to manager (see Approval Workflow)

### Regenerating Drafts

If none of the drafts fit, provide feedback for regeneration:

**To Regenerate:**

1. Click **"Regenerate with Feedback"**
2. Enter specific feedback:
   ```
   Feedback:
   "Make it more enthusiastic. Add a question at the end
   to encourage engagement."
   ```
3. Click **"Regenerate"**
4. New drafts generated with feedback applied

**Regeneration Tips:**

- Be specific: "More casual" vs. "Use shorter sentences"
- Reference tone: "Like Draft 3 but more professional"
- Add constraints: "Keep under 50 characters"

### Draft Editor

The draft editor provides rich text editing:

**Editor Features:**

- **Text Formatting**: Bold, italic, links
- **Emoji Picker**: Platform-appropriate emojis
- **Hashtag Suggestions**: Based on content
- **Mention Lookup**: @ mention autocompletion
- **Media Attachments**: Images, videos, GIFs
- **Link Preview**: URL unfurling
- **Character Counter**: Real-time count with limit

**Keyboard Shortcuts:**

- `Cmd/Ctrl + B`: Bold
- `Cmd/Ctrl + I`: Italic
- `Cmd/Ctrl + K`: Insert link
- `Cmd/Ctrl + Enter`: Submit draft

### Approval Workflow

For teams requiring oversight:

#### Request Approval

**To Request Approval:**

1. Select a draft
2. Make any edits
3. Click **"Request Approval"**
4. Add note to approver (optional):
   ```
   Note to Approver:
   "Customer was frustrated about shipping delay.
   This response offers compensation per our policy."
   ```
5. Assign to approver (manager, team lead)
6. Draft status changes to **"PENDING_APPROVAL"**

#### Approval Actions

Approvers see pending drafts in their queue:

**Approver Options:**

1. **Approve**
   - Draft is sent/scheduled immediately
   - Status: APPROVED
   - Submitter is notified

2. **Approve with Changes**
   - Make edits to the draft
   - Approve modified version
   - Status: APPROVED
   - Submitter sees changes made

3. **Request Changes**
   - Add specific feedback
   - Return to submitter
   - Status: CHANGES_REQUESTED
   - Submitter must resubmit after edits

4. **Reject**
   - Decline the draft entirely
   - Provide reason
   - Status: REJECTED
   - Submitter must create new draft

**Approval Example:**

```
┌─────────────────────────────────────────────────┐
│ Draft Approval Request                          │
│                                                 │
│ From: Sarah Johnson                             │
│ Platform: Instagram                             │
│ Type: Customer Response                         │
│                                                 │
│ Draft:                                          │
│ "We sincerely apologize for the shipping delay.│
│ As a gesture of goodwill, here's 20% off your  │
│ next order with code SORRY20. Thanks for your  │
│ patience! 🙏"                                    │
│                                                 │
│ Note: Customer was upset about 2-week delay.    │
│                                                 │
│ [Approve] [Edit & Approve] [Request Changes]   │
│ [Reject]                                        │
└─────────────────────────────────────────────────┘
```

### Draft Status Badge

Track draft lifecycle:

| Status                | Badge     | Meaning           |
| --------------------- | --------- | ----------------- |
| **DRAFT**             | 📝 Gray   | Work in progress  |
| **PENDING_APPROVAL**  | ⏳ Yellow | Awaiting review   |
| **APPROVED**          | ✅ Green  | Approved and sent |
| **CHANGES_REQUESTED** | 🔄 Orange | Needs revisions   |
| **REJECTED**          | ❌ Red    | Not approved      |
| **PUBLISHED**         | 🚀 Blue   | Live on platform  |

### Edit History Viewer

See how drafts evolved:

**Edit History:**

```
Version 3 (Current) - Jan 22, 10:35 AM - Sarah J.
└─ "Changed 'apologize' to 'sincerely apologize'"

Version 2 - Jan 22, 10:30 AM - Mike Smith (Approver)
└─ "Added discount code per policy"

Version 1 - Jan 22, 10:25 AM - Sarah J. (AI Generated)
└─ "Initial AI draft"
```

**View Changes:**

- Side-by-side diff view
- Highlighted additions (green)
- Highlighted deletions (red)
- Author and timestamp

### Audit Log

All Relay actions are logged:

**Logged Events:**

- Draft generation requests
- Draft edits
- Approval requests
- Approval decisions (approve, reject, changes)
- Publications
- Scheduled posts

**Audit Entry Example:**

```
2026-01-22 10:35:15 - Sarah Johnson
Action: REQUEST_APPROVAL
Draft ID: draft_abc123
Platform: Instagram
Approver: Mike Smith
Status: PENDING_APPROVAL
AI Reasoning: "Tone aligned with brand voice (95%).
Includes required discount code. Within character limit."
```

**Audit Filters:**

- Date range
- User
- Status
- Platform
- Approval decision

### Best Practices

✅ **Do:**

- Generate multiple drafts and compare
- Use custom instructions for context
- Edit AI drafts to add personal touch
- Request approval for sensitive topics
- Review edit history before approving
- Use scheduled publishing for consistency

❌ **Don't:**

- Send AI drafts without review
- Skip approval for high-stakes content
- Ignore tone match scores below 75%
- Over-rely on AI for nuanced situations
- Forget to add context in approval requests

> **Note**: Relay is currently integrated with Inbox. Standalone Relay features (scheduled posts, campaigns) are coming soon.

---

## Settings

**Location**: `/orbit/[workspace]/settings`

Configure your Orbit workspace, team, and integrations.

### General Settings

**Workspace Information:**

- **Name**: Display name for the workspace
- **Description**: Optional description
- **Avatar**: Workspace profile image

**To Update:**

1. Navigate to Settings → General
2. Edit fields
3. Click **"Save Changes"**

### Social Accounts

**Location**: `/orbit/[workspace]/settings/accounts`

Manage connected social media accounts:

**Connected Accounts List:**

```
┌─────────────────────────────────────────────────┐
│ Instagram                                       │
│ @yourbrand                                      │
│ Connected: Jan 10, 2026                         │
│ Permissions: Read, Write                        │
│ [Reconnect] [Disconnect]                        │
├─────────────────────────────────────────────────┤
│ Facebook Page                                   │
│ Your Brand Page                                 │
│ Connected: Jan 10, 2026                         │
│ Permissions: Read, Write, Ads                   │
│ [Reconnect] [Disconnect]                        │
└─────────────────────────────────────────────────┘
```

**Connection Status:**

- 🟢 **Active**: Working correctly
- 🟡 **Expiring Soon**: Reauthorization needed within 7 days
- 🔴 **Disconnected**: Requires reconnection

**To Reconnect:**

1. Click **"Reconnect"** button
2. Complete OAuth flow again
3. Verify permissions

**To Disconnect:**

1. Click **"Disconnect"**
2. Confirm removal
3. Account removed from Orbit (does not delete the social account itself)

> **Warning**: Disconnecting an account removes access to Inbox items, analytics, and posting capabilities for that platform.

### Inbox Smart Routing

**Location**: `/orbit/[workspace]/settings/inbox/routing`

Configure automatic assignment and prioritization rules:

**Priority Scoring Configuration:**

```
Sentiment Weight: ████████░░ 80%
├─ Negative sentiment increases priority
└─ Impact: High

Urgency Weight: ██████░░░░ 60%
├─ Keywords like "urgent", "ASAP" boost priority
└─ Impact: Medium

Question Detection: ███████░░░ 70%
├─ Messages with questions get higher priority
└─ Impact: Medium-High

Response Time Weight: █████░░░░░ 50%
├─ Older messages increase in priority
└─ Impact: Medium

VIP Weight: ██████████ 100%
├─ Flagged VIP senders get maximum priority
└─ Impact: Very High
```

**Routing Rules:**

Create if-then rules for automatic assignment:

**Rule Example:**

```
Rule: "Urgent Customer Issues"
IF:
  • Priority >= 90 (Urgent)
  AND Sentiment = Negative
  AND Platform = Twitter
THEN:
  • Assign to: Customer Support Lead
  • Add tag: "escalated"
  • Send notification: Immediate
```

**Rule Builder:**

1. Click **"Add Routing Rule"**
2. Set conditions:
   - Priority range
   - Sentiment
   - Platform
   - Keywords
   - Time of day
   - Current assignee
3. Set actions:
   - Assign to user/team
   - Add tags
   - Set notification preference
   - Change priority
4. Test rule with sample data
5. Save and activate

**Active Rules List:**

```
✅ Urgent Customer Issues (Active)
   • Last triggered: 2 hours ago
   • Success rate: 95%

✅ Billing Inquiries (Active)
   • Last triggered: 1 day ago
   • Success rate: 98%

⏸️ Holiday Hours (Paused)
   • Scheduled: Dec 24-26
   • Auto-resume: Dec 27
```

### Team Members (Coming Soon)

**Location**: `/orbit/[workspace]/settings/members`

Manage workspace members and permissions:

**Team List:**

```
┌─────────────────────────────────────────────────┐
│ Sarah Johnson                                   │
│ sarah@company.com                               │
│ Role: Owner                                     │
│ Joined: Jan 10, 2026                            │
│ Last Active: 5 minutes ago                      │
│ [Change Role] [Remove]                          │
├─────────────────────────────────────────────────┤
│ Mike Smith                                      │
│ mike@company.com                                │
│ Role: Admin                                     │
│ Joined: Jan 12, 2026                            │
│ Last Active: 2 hours ago                        │
│ [Change Role] [Remove]                          │
└─────────────────────────────────────────────────┘
```

**To Invite Team Member:**

1. Click **"Invite Member"**
2. Enter email address
3. Select role: Member, Admin, Owner
4. (Optional) Add personal message
5. Click **"Send Invitation"**

**Role Comparison:**

| Permission          | Owner | Admin | Member |
| ------------------- | ----- | ----- | ------ |
| View dashboard      | ✅    | ✅    | ✅     |
| Respond to inbox    | ✅    | ✅    | ✅     |
| Generate drafts     | ✅    | ✅    | ✅     |
| View analytics      | ✅    | ✅    | ✅     |
| Edit Brand Brain    | ✅    | ✅    | ❌     |
| Manage integrations | ✅    | ✅    | ❌     |
| Invite members      | ✅    | ✅    | ❌     |
| Manage billing      | ✅    | ❌    | ❌     |
| Delete workspace    | ✅    | ❌    | ❌     |

### Content Policies (Coming Soon)

**Location**: `/orbit/[workspace]/settings/policies`

Set approval requirements and review policies:

**Approval Policies:**

```
Policy: "High-Risk Content"
Requires approval when:
  • Platform: Twitter/X (public, high visibility)
  • Sentiment detection: Negative mentions
  • Contains: Pricing, refunds, legal terms
  • Tone confidence: < 80%

Approval chain:
  1. Team Lead (required)
  2. Department Manager (if > $100 offer)
  3. Legal (if contains specific keywords)

Auto-approve after: 24 hours (if no response)
```

**Review Queue:**

- View all pending approvals
- Filter by policy trigger
- Bulk approve similar items
- Set out-of-office delegates

### Notifications (Coming Soon)

Configure how and when you receive alerts:

**Notification Channels:**

- In-app notifications
- Email
- Mobile push (mobile app required)
- Slack integration

**Notification Types:**

```
Inbox:
  • New urgent items: Immediate
  • Assigned to me: Every 15 minutes
  • Unread messages: Daily digest

Pulse:
  • Critical anomalies: Immediate
  • Warning anomalies: Every hour
  • Health reports: Weekly

Allocator:
  • Autopilot actions: Daily summary
  • Budget exceeded: Immediate
  • Recommendations ready: Daily

Relay:
  • Approval requests: Immediate
  • Draft comments: Every hour
  • Published drafts: Daily summary
```

### Integrations (Coming Soon)

Connect third-party tools:

**Available Integrations:**

- **Slack**: Team notifications and approvals
- **Zapier**: Custom workflow automation
- **Google Analytics**: Track conversions from social
- **CRM Systems**: Salesforce, HubSpot
- **Email Marketing**: Mailchimp, SendGrid

**To Connect Integration:**

1. Navigate to Settings → Integrations
2. Click integration card
3. Follow authentication flow
4. Configure sync settings
5. Test connection

### Billing and Subscription (Coming Soon)

Manage your Orbit subscription:

**Current Plan:**

```
Plan: Professional
Price: $99/month
Users: 3 / 5
Social Accounts: 8 / 15
Billing Cycle: Monthly
Next Renewal: Feb 22, 2026
```

**Usage Metrics:**

- Inbox items processed this month: 1,234 / ∞
- AI drafts generated: 567 / 2,000
- Allocator recommendations: 45 / unlimited
- Scout competitor tracking: 5 / 10

**To Change Plan:**

1. Click **"Change Plan"**
2. Compare plan features
3. Select new plan
4. Confirm changes
5. Prorated charges applied immediately

---

## FAQ

### General Questions

**Q: What platforms does Orbit support?**

A: Orbit currently supports:

- Instagram (Business accounts)
- Facebook (Pages)
- Twitter/X
- LinkedIn (Company pages)
- TikTok (Business accounts)

**Q: How much does Orbit cost?**

A: Pricing tiers:

- **Starter**: $29/month (1 user, 5 accounts)
- **Professional**: $99/month (5 users, 15 accounts)
- **Business**: $249/month (15 users, unlimited accounts)
- **Enterprise**: Custom pricing

All plans include:

- Unlimited inbox items
- AI draft generation
- Brand Brain
- Pulse monitoring
- Basic Allocator

**Q: Is there a free trial?**

A: Yes! 14-day free trial with no credit card required. Full access to Professional plan features.

**Q: Can I use Orbit for multiple brands/clients?**

A: Yes! Create separate workspaces for each brand or client. Switch between workspaces using the workspace switcher in the sidebar.

### Setup and Configuration

**Q: How long does setup take?**

A: Basic setup (connecting accounts, Brand Brain): 15-30 minutes
Full configuration (routing rules, integrations): 1-2 hours

**Q: Do I need technical knowledge to set up Orbit?**

A: No! Orbit is designed for non-technical users. Setup wizards guide you through each step.

**Q: What permissions does Orbit need from social platforms?**

A: Required permissions:

- Read messages, comments, mentions
- Post content on your behalf
- Access basic analytics
- Read profile information

Orbit never:

- Posts without your approval
- Accesses private data
- Shares your credentials
- Stores passwords

**Q: Can I revoke Orbit's access anytime?**

A: Yes! Disconnect accounts in Settings → Social Accounts. You can also revoke access directly on each social platform.

### Inbox

**Q: How does AI priority scoring work?**

A: Orbit analyzes messages using natural language processing to detect:

- Sentiment (positive, negative, neutral)
- Urgency indicators
- Questions requiring responses
- Complaints or issues
- VIP senders

Priority scores (0-100) combine these factors with configurable weights.

**Q: What happens if I miss an urgent message?**

A: Urgent items (priority 90+) trigger:

- Push notifications (if enabled)
- Email alerts
- In-app red badge indicators
- Escalation after 1 hour if unread

**Q: Can I customize what's considered urgent?**

A: Yes! In Settings → Inbox Routing, adjust weights for each priority factor. For example, increase sentiment weight if negative feedback is most critical for your brand.

**Q: Does Orbit read private messages?**

A: Orbit only accesses messages sent to your connected accounts. All data is encrypted in transit and at rest. See our privacy policy for details.

### Brand Brain

**Q: How accurate is Brand Brain's tone matching?**

A: Brand Brain achieves 85-95% tone alignment for most brands. Accuracy improves as you:

- Use more detailed voice descriptions
- Add vocabulary preferences
- Provide feedback on AI drafts

**Q: Can I have different brand voices for different platforms?**

A: Currently, Brand Brain applies one voice across all platforms. Platform-specific voices are planned for a future release.

**Q: What if my brand voice changes?**

A: Update Brand Brain anytime in Settings. Changes apply immediately to new AI drafts. Existing drafts remain unchanged.

**Q: Do guardrails work for manual posts?**

A: Guardrails currently apply to AI-generated content only. Manual content review is on the roadmap.

### Allocator

**Q: How often should I review Allocator recommendations?**

A: We recommend:

- **Daily**: If running active campaigns
- **Weekly**: For steady-state operations
- **Monthly**: For strategic review

**Q: Is Autopilot mode safe?**

A: Autopilot includes multiple safety mechanisms:

- Maximum spend limits
- Confidence thresholds
- Emergency stop button
- Audit logging
- Excluded campaigns list

Start with conservative guardrails and adjust as you gain confidence.

**Q: What if Autopilot makes a bad decision?**

A: You can:

1. View the decision in execution history
2. Manually revert the change in your ad platform
3. Adjust Autopilot guardrails to prevent recurrence
4. Pause Autopilot while investigating

All Autopilot decisions include the AI's reasoning for transparency.

**Q: Does Allocator work with manual campaign management?**

A: Yes! Allocator provides recommendations even if you apply them manually. Autopilot is optional.

### Relay

**Q: Can I trust AI-generated drafts?**

A: AI drafts should always be reviewed before sending. Relay drafts:

- Pass through Brand Brain guardrails
- Include tone alignment scores
- Show compliance checks
- Require manual approval (unless Autopilot enabled)

Think of AI as a first draft writer, not a replacement for human judgment.

**Q: What if the AI generates inappropriate content?**

A: Brand Brain guardrails prevent most issues. If a draft passes but seems inappropriate:

1. Don't send it
2. Provide feedback for regeneration
3. Report the issue to support
4. Update your guardrails to prevent recurrence

**Q: How does Relay learn my preferences?**

A: Relay improves through:

- Your Brand Brain configuration
- Edits you make to drafts (tracked)
- Approval/rejection patterns
- Regeneration feedback

Over time, first-draft quality improves.

**Q: Can I generate drafts in bulk?**

A: Currently, drafts are generated per inbox item. Bulk generation for scheduled posts is coming soon.

### Pulse

**Q: How often does Pulse check for anomalies?**

A: Pulse runs anomaly detection:

- Every 15 minutes (real-time monitoring)
- On-demand when you open the dashboard
- Nightly for comprehensive analysis

**Q: What causes anomaly false positives?**

A: Common causes:

- Viral posts (legitimate spikes)
- New campaigns launching
- Seasonal patterns
- Platform API delays

You can dismiss false positives and train Pulse to recognize them.

**Q: Can I set custom thresholds for anomalies?**

A: Custom thresholds are planned for a future release. Currently, Pulse uses statistical analysis (z-scores) to detect anomalies automatically.

**Q: Does Pulse replace platform analytics?**

A: No. Pulse complements platform analytics by:

- Aggregating across platforms
- Detecting anomalies automatically
- Providing real-time alerts

For deep dives, use native platform analytics.

### Scout

**Q: Is competitor monitoring legal?**

A: Yes! Scout only analyzes publicly available data from social media platforms. No hacking, scraping violations, or private data access.

**Q: How often is competitor data updated?**

A: Competitor data syncs:

- Every 6 hours for engagement metrics
- Daily for follower counts
- Weekly for content analysis

**Q: Can competitors see that I'm monitoring them?**

A: No. Scout monitoring is completely anonymous. Competitors have no visibility into who is tracking them.

**Q: How many competitors should I track?**

A: We recommend 3-5 direct competitors for accurate benchmarking. Too many dilutes insights; too few may not be representative.

### Data and Privacy

**Q: Where is my data stored?**

A: Orbit data is stored in:

- Primary database: US (AWS)
- Media files: Cloudflare R2 (distributed CDN)
- Analytics: Anonymized, aggregated data only

All data is encrypted at rest and in transit.

**Q: Who can see my workspace data?**

A: Only invited workspace members. Orbit employees cannot access your data without explicit permission for support purposes.

**Q: Can I export my data?**

A: Yes! Export options:

- Inbox items: CSV, JSON
- Analytics: CSV
- Audit logs: CSV
- Brand Brain: JSON

Go to Settings → Data Export.

**Q: What happens if I cancel my subscription?**

A: After cancellation:

- 30-day grace period to export data
- Workspace becomes read-only
- After 90 days: Data permanently deleted

### Troubleshooting

**Q: Why aren't new messages appearing in Inbox?**

A: Check:

1. Social account connection status (Settings → Accounts)
2. Platform API rate limits (check status page)
3. Permissions haven't been revoked
4. Filters aren't hiding messages

**Q: Why is AI draft generation slow?**

A: Draft generation takes 5-15 seconds normally. If slower:

1. Check your Brand Brain is configured (speeds up processing)
2. Complex custom instructions add processing time
3. Platform rate limits may apply

**Q: Why was my Autopilot action reversed?**

A: Autopilot may auto-reverse actions if:

- Emergency stop triggered
- Spend limit exceeded
- Performance deteriorated rapidly
- Platform API returned error

Check execution history for details.

**Q: How do I contact support?**

A: Support channels:

- In-app chat (bottom-right icon)
- Email: support@spike.land
- Help center: spike.land/help
- Status page: status.spike.land (for outages)

---

## Getting Help

### Support Resources

**Documentation:**

- This User Guide (comprehensive reference)
- API Documentation (for developers)
- Video Tutorials (YouTube channel)
- Blog (tips, best practices, updates)

**Community:**

- Discord Server (chat with other users)
- User Forum (discussions, questions)
- Feature Requests (vote on upcoming features)

**Direct Support:**

- **Email**: support@spike.land
  - Response time: 24 hours (Business), 8 hours (Professional)
- **Live Chat**: In-app chat button
  - Available: Mon-Fri 9am-5pm EST
- **Phone**: Enterprise customers only
  - Dedicated account manager

**Emergency Support:**

- Critical issues: support@spike.land with "[URGENT]" in subject
- Platform outages: Check status.spike.land first

### Training and Onboarding

**Free Onboarding:**

- Professional plan: 30-minute onboarding call
- Business plan: 1-hour guided setup
- Enterprise plan: Full white-glove onboarding

**Team Training:**

- Group training sessions available (request via support)
- Custom training materials for your brand
- Ongoing best practices webinars (monthly)

---

## Appendix

### Keyboard Shortcuts

**Global:**

- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + S`: Save current form
- `Esc`: Close dialog/modal

**Inbox:**

- `J` / `K`: Next/previous item
- `E`: Archive item
- `R`: Start reply
- `A`: Assign item
- `1-4`: Set priority (Urgent, High, Medium, Low)

**Relay:**

- `Cmd/Ctrl + Enter`: Submit draft
- `Cmd/Ctrl + Shift + G`: Generate new drafts
- `Cmd/Ctrl + E`: Edit selected draft

**Dashboard:**

- `Cmd/Ctrl + R`: Refresh data
- `D`: Open dashboard
- `I`: Open inbox
- `B`: Open Brand Brain

### Glossary

**Terms:**

- **Anomaly**: Unusual pattern in metrics detected by statistical analysis
- **Autopilot**: Automated execution of Allocator recommendations
- **Brand Voice**: Consistent personality and tone in communications
- **CPA**: Cost Per Acquisition (advertising metric)
- **Guardrail**: Brand Brain rule preventing certain content
- **Priority Score**: 0-100 rating of inbox item urgency
- **ROAS**: Return on Ad Spend (revenue divided by ad cost)
- **Sentiment**: Emotional tone (positive, negative, neutral)
- **Tone Alignment**: How well content matches brand voice
- **Workspace**: Isolated environment for managing one brand/client
- **Z-Score**: Statistical measure of how far a value is from average

---

**Document Version**: 1.0
**Last Updated**: January 22, 2026
**Feedback**: docs@spike.land
**Next Review**: April 2026
