# A/B Testing Guide - Orbit Social Media Command Center

> **Last Updated**: January 2026
> **Version**: 1.0
> **Platform**: spike.land/orbit

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is A/B Testing?](#what-is-ab-testing)
3. [Creating Tests](#creating-tests)
4. [Test Configuration](#test-configuration)
5. [Monitoring Tests](#monitoring-tests)
6. [Analyzing Results](#analyzing-results)
7. [Best Practices](#best-practices)
8. [Subscription Tier Limits](#subscription-tier-limits)
9. [API Reference](#api-reference)
10. [FAQ](#faq)

---

## Introduction

### Why A/B Test Social Media Content?

Social media success depends on knowing what resonates with your audience. A/B testing removes guesswork by providing data-driven insights into:

- **Content formats** (video vs. image vs. carousel)
- **Copy variations** (short vs. long, question vs. statement)
- **Posting times** (morning vs. evening, weekday vs. weekend)
- **Call-to-actions** (click link vs. comment vs. share)
- **Visual styles** (bright vs. muted, photo vs. graphic)

**Business Impact:**
- **15-40% higher engagement** on winning variants
- **2-3x better conversion rates** on optimized CTAs
- **20-30% cost savings** by eliminating underperforming content

---

## What is A/B Testing?

### Definition

A/B testing (also called split testing) is the practice of comparing two or more variations of content to determine which performs better against a specific goal.

### How Orbit Implements A/B Testing

Orbit's A/B testing feature allows you to:

1. **Create multiple post variations** (A, B, C, etc.)
2. **Define success metrics** (engagement rate, clicks, conversions)
3. **Set test duration** (12 hours to 7 days)
4. **Auto-select winner** (optional) and promote it
5. **Analyze detailed results** with statistical significance indicators

### Test Types Supported

| Test Type | Description | Example |
|-----------|-------------|---------|
| **Content Variation** | Different post copy | "Check this out!" vs. "You need to see this" |
| **Visual Variation** | Different images/videos | Photo A vs. Photo B |
| **CTA Variation** | Different calls-to-action | "Learn More" vs. "Get Started" |
| **Timing Variation** | Different posting times | 9 AM vs. 3 PM |
| **Audience Variation** | Different targeting segments | Segment A vs. Segment B |

---

## Creating Tests

### Prerequisites

1. **Connected social account** (Instagram, Facebook, Twitter/X, LinkedIn, TikTok)
2. **PRO or BUSINESS tier subscription** (FREE tier allows 1 test, PRO allows 10, BUSINESS unlimited)
3. **Prepared content variations** (at least 2 versions)

### Step-by-Step: Create Your First Test

#### 1. Navigate to A/B Testing

From your Orbit dashboard:
1. Click **"A/B Testing"** in the sidebar
2. Click **"Create New Test"**

#### 2. Basic Test Information

**Test Name**: Descriptive name for internal tracking
- Example: "Jan 2026 Product Launch - Headline Test"

**Description** (optional): Notes on what you're testing
- Example: "Testing feature-focused vs. benefit-focused headlines"

**Goal**: Select primary success metric
- **Engagement Rate** (likes + comments + shares / impressions)
- **Click-Through Rate** (clicks / impressions)
- **Conversion Rate** (conversions / clicks) - requires tracking setup
- **Reach** (unique accounts reached)
- **Saves** (Instagram bookmarks)

#### 3. Create Variations

**Minimum**: 2 variations (A and B)
**Maximum**: 5 variations (A, B, C, D, E)

For each variation:

**Variation Name**: "A", "B", "Control", "Test 1", etc.

**Content**:
- Post copy (text)
- Media (image, video, carousel)
- Link (if applicable)
- Hashtags

**Platform-Specific Settings**:
- Instagram: First comment
- Twitter/X: Thread continuation
- LinkedIn: Article preview
- TikTok: Duet/Stitch enabled

#### 4. Audience Split

Choose how to divide your audience:

**Option 1: Random Split** (Default)
- Orbit randomly divides followers
- Best for most use cases
- Ensures unbiased results

**Option 2: Custom Segments**
- Target different audience segments
- Requires advanced audience targeting
- Example: Segment A (18-25) vs. Segment B (26-35)

**Split Ratio**:
- Equal (50/50 for 2 variations, 33/33/33 for 3, etc.)
- Custom (e.g., 80/20 for safety-first testing)

#### 5. Schedule & Duration

**Start Time**:
- Immediate
- Scheduled (specific date/time)

**Test Duration**:
- Minimum: 12 hours (gather enough data)
- Maximum: 7 days
- Recommended: 24-48 hours for most tests

**Auto-Promote Winner** (optional):
- If enabled, Orbit automatically promotes the winning variation after test ends
- Requires statistical significance threshold (default: 95% confidence)

#### 6. Review & Launch

Review all settings, then click **"Launch Test"**

Orbit will:
1. Publish all variations simultaneously (or at scheduled time)
2. Begin tracking metrics in real-time
3. Notify you when test completes
4. Display results with statistical analysis

---

## Test Configuration

### Statistical Settings

**Confidence Level**:
- **90%**: Faster results, higher risk of false positives
- **95%**: Balanced (default)
- **99%**: Maximum certainty, requires more data

**Minimum Sample Size**:
- Orbit calculates required impressions based on expected effect size
- Default: 1,000 impressions per variation
- You can override this (not recommended unless you understand statistics)

### Advanced Options

**Traffic Throttling**:
- Gradually ramp up traffic to variations
- Example: Start with 10% of audience, increase to 100% over 6 hours
- Useful for high-risk tests (major messaging changes)

**Early Stopping**:
- Orbit can stop tests early if a clear winner emerges
- Saves budget on underperforming variations
- Requires 99% confidence threshold

**Holdout Group** (BUSINESS tier only):
- Reserve 10-20% of audience as control (no post shown)
- Measures organic baseline performance

---

## Monitoring Tests

### Real-Time Dashboard

Access your active tests at **A/B Testing → Active Tests**

**Overview Cards** show:
- Test name and status (Running, Completed, Stopped)
- Time remaining
- Current leader (variation performing best)
- Statistical confidence (% certainty in results)

### Detailed Metrics

Click any test to see:

**Performance by Variation**:
| Variation | Impressions | Engagement Rate | Clicks | Conversions | Statistical Significance |
|-----------|-------------|-----------------|--------|-------------|--------------------------|
| A | 5,243 | 4.2% | 187 | 12 | Baseline |
| B | 5,198 | 5.8% | 289 | 21 | ✓ 97% confident (Winner) |
| C | 5,301 | 3.9% | 145 | 8 | ✗ No significant difference |

**Engagement Timeline**:
- Line chart showing performance over time
- Identify when winner emerged
- Spot anomalies (sudden spikes/drops)

**Audience Breakdown** (if segmented):
- Performance by demographic segment
- Insights on which audiences prefer which variations

### Notifications

Orbit notifies you via:
- **In-app notifications** (bell icon)
- **Email** (if enabled in Settings)
- **Slack** (if integration enabled)

**Notification triggers**:
- Test launched successfully
- Clear winner detected (statistical significance reached)
- Test completed
- Test failed (technical error)

---

## Analyzing Results

### Interpreting Statistical Significance

**What is it?**
Statistical significance indicates whether the difference between variations is real or due to random chance.

**Orbit's Indicators**:
- ✓ **Green checkmark**: ≥95% confident, difference is real
- ⚠️ **Yellow warning**: 80-94% confident, likely real but not certain
- ✗ **Red X**: <80% confident, difference likely due to chance

**Example:**
```
Variation A: 4.2% engagement
Variation B: 4.5% engagement
Significance: ✗ 62% confident

Interpretation: The 0.3% difference could easily be random chance.
Don't declare a winner.
```

**Example 2:**
```
Variation A: 4.2% engagement
Variation B: 6.8% engagement
Significance: ✓ 98% confident

Interpretation: Variation B is genuinely better. Use it going forward.
```

### Winner Declaration

Orbit auto-declares a winner when:
1. Test duration completes OR
2. Statistical significance threshold reached (if early stopping enabled)

**Winner Badge**: Displayed on winning variation card

**Recommended Actions**:
- **Clear winner**: Use this variation for future content
- **No clear winner**: Neither variation significantly better; test something else
- **Multiple winners**: All variations performed well; rotate them

### Exporting Results

**Export Options**:
- CSV (raw data for custom analysis)
- PDF report (presentation-ready)
- PNG charts (for social/blog posts)

**What's Included**:
- Test configuration summary
- Full performance metrics
- Statistical analysis
- Audience insights (if segmented)
- Recommendations

---

## Best Practices

### Test Design

**1. Test One Variable at a Time**
- ❌ **Bad**: Change headline AND image AND CTA
- ✅ **Good**: Change only headline, keep image/CTA constant
- **Why**: If you change multiple things, you won't know what caused the difference

**2. Ensure Sufficient Sample Size**
- ❌ **Bad**: Test with only 100 impressions per variation
- ✅ **Good**: Wait until each variation has 1,000+ impressions
- **Why**: Small samples are unreliable (high noise, low signal)

**3. Run Tests Long Enough**
- ❌ **Bad**: Stop test after 2 hours because one variation is ahead
- ✅ **Good**: Run for at least 24 hours (48-72 preferred)
- **Why**: Performance varies by time of day, day of week

**4. Account for External Factors**
- ❌ **Bad**: Run test during major news event affecting your industry
- ✅ **Good**: Run during typical, uneventful periods
- **Why**: External events can skew results (e.g., holiday shopping, breaking news)

**5. Don't Over-Optimize**
- ❌ **Bad**: Run 50 A/B tests per month on tiny variations
- ✅ **Good**: Run 3-5 high-impact tests per month
- **Why**: Testing fatigue, diminishing returns, audience confusion

### Test Ideas by Industry

**E-Commerce**:
- Product photo style (lifestyle vs. white background)
- Urgency messaging ("Limited time" vs. "While supplies last")
- Price display ($49 vs. $49.00 vs. "under $50")

**SaaS**:
- Benefit-focused vs. feature-focused copy
- Demo video length (30s vs. 60s vs. 90s)
- CTA button text ("Start Free Trial" vs. "Get Started Free")

**Content Creators**:
- Thumbnail styles (face close-up vs. action shot)
- Title format (question vs. listicle vs. how-to)
- Posting time (optimal algorithm timing)

**Agencies**:
- Client testimonial format (quote vs. video vs. case study)
- Portfolio presentation (grid vs. carousel vs. video)
- Lead magnet offer (checklist vs. template vs. webinar)

### Common Mistakes

**Mistake #1: P-Hacking**
- **What**: Running test until you get desired result, then stopping
- **Why it's bad**: Inflates false positives
- **Fix**: Set duration in advance and honor it

**Mistake #2: Not Accounting for Seasonality**
- **What**: Testing during atypical period (Black Friday, summer slump)
- **Why it's bad**: Results won't generalize to normal periods
- **Fix**: Test during representative periods only

**Mistake #3: Ignoring Statistical Significance**
- **What**: Declaring winner based on slight difference without confidence check
- **Why it's bad**: Random noise looks like real difference
- **Fix**: Always check Orbit's significance indicators

**Mistake #4: Testing Irrelevant Variables**
- **What**: Testing font color on Instagram (where you can't control it)
- **Why it's bad**: Wastes time on things that don't matter
- **Fix**: Focus on high-impact variables (headline, image, CTA)

**Mistake #5: Forgetting Mobile vs. Desktop**
- **What**: Designing test only considering desktop experience
- **Why it's bad**: 80%+ of social media traffic is mobile
- **Fix**: Preview all variations on mobile before launching

---

## Subscription Tier Limits

| Feature | FREE | PRO | BUSINESS |
|---------|------|-----|----------|
| **Concurrent Active Tests** | 1 | 10 | Unlimited |
| **Variations per Test** | 2 (A/B only) | 5 | 5 |
| **Historical Tests Saved** | Last 10 | Last 100 | Unlimited |
| **Advanced Segmentation** | ✗ | ✓ | ✓ |
| **Auto-Promote Winner** | ✗ | ✓ | ✓ |
| **Early Stopping** | ✗ | ✓ | ✓ |
| **Custom Confidence Levels** | ✗ | ✓ | ✓ |
| **Holdout Groups** | ✗ | ✗ | ✓ |
| **Priority Support** | ✗ | ✗ | ✓ |

**Upgrade Prompts**:
- FREE users hitting limit see: "Upgrade to PRO to run 10 tests simultaneously"
- PRO users needing holdout groups see: "Upgrade to BUSINESS for advanced testing features"

**Billing**:
- Tests don't consume AI credits
- Included in monthly subscription at each tier

---

## API Reference

### Endpoints

**Create A/B Test**:
```bash
POST /api/ab-tests
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Headline Test - Product Launch",
  "goal": "ENGAGEMENT_RATE",
  "duration_hours": 48,
  "auto_promote": true,
  "confidence_threshold": 0.95,
  "variations": [
    {
      "name": "A",
      "content": {
        "text": "Introducing our revolutionary new product",
        "media_url": "https://example.com/image-a.jpg",
        "link": "https://example.com/product"
      }
    },
    {
      "name": "B",
      "content": {
        "text": "The product you've been waiting for is here",
        "media_url": "https://example.com/image-b.jpg",
        "link": "https://example.com/product"
      }
    }
  ]
}
```

**Response**:
```json
{
  "id": "abtest_1a2b3c4d",
  "status": "scheduled",
  "start_time": "2026-01-29T15:00:00Z",
  "end_time": "2026-01-31T15:00:00Z",
  "variations": [
    { "id": "var_1a2b", "name": "A" },
    { "id": "var_3c4d", "name": "B" }
  ]
}
```

**Get Test Results**:
```bash
GET /api/ab-tests/{id}/results
Authorization: Bearer {token}
```

**Response**:
```json
{
  "id": "abtest_1a2b3c4d",
  "status": "completed",
  "winner": "var_3c4d",
  "results": [
    {
      "variation_id": "var_1a2b",
      "variation_name": "A",
      "impressions": 5243,
      "engagement_rate": 0.042,
      "clicks": 187,
      "conversions": 12,
      "is_baseline": true
    },
    {
      "variation_id": "var_3c4d",
      "variation_name": "B",
      "impressions": 5198,
      "engagement_rate": 0.058,
      "clicks": 289,
      "conversions": 21,
      "statistical_significance": 0.97,
      "is_winner": true
    }
  ]
}
```

**List Active Tests**:
```bash
GET /api/ab-tests?status=active
Authorization: Bearer {token}
```

**Stop Test Early**:
```bash
POST /api/ab-tests/{id}/stop
Authorization: Bearer {token}
```

---

## FAQ

### General

**Q: How many variations can I test at once?**
A: 2-5 variations depending on your tier. More variations require larger sample sizes.

**Q: Can I edit a test after it starts?**
A: No. This would invalidate results. Stop the test and create a new one.

**Q: What happens if I run out of A/B test slots?**
A: You'll need to wait for active tests to complete or upgrade your tier.

### Results & Analysis

**Q: What does "95% confidence" mean?**
A: There's a 95% chance the difference is real, not random. Industry standard for decision-making.

**Q: Can I trust results from small tests (<500 impressions)?**
A: No. Small samples are unreliable. Wait until at least 1,000 impressions per variation.

**Q: What if no variation reaches significance?**
A: The variations performed similarly. Either test a bigger difference or accept they're equivalent.

**Q: Should I always use the winner forever?**
A: No. Re-test periodically (every 3-6 months). Audiences and platforms change.

### Platform-Specific

**Q: Do all platforms support A/B testing?**
A: Yes, but some features vary (e.g., Instagram Stories tests are 24 hours max).

**Q: Can I test Instagram Stories vs. Feed posts?**
A: No. Test like-for-like content (Stories vs. Stories, Feed vs. Feed).

**Q: Does Facebook's built-in A/B testing conflict with Orbit?**
A: No. Orbit uses its own tracking. Disable Facebook's split testing to avoid confusion.

### Technical

**Q: How does Orbit split audiences?**
A: Random assignment at the user ID level. Each user sees one variation consistently.

**Q: What if my test fails to publish?**
A: Orbit retries 3 times, then notifies you. Check platform API status and permissions.

**Q: Can I use A/B testing with scheduled posts?**
A: Yes. Schedule test start time, and Orbit publishes all variations simultaneously.

---

## Additional Resources

- [Orbit User Guide](./ORBIT_USER_GUIDE.md) - Full feature documentation
- [Subscription Tiers](./SUBSCRIPTION_TIERS.md) - Pricing and limits
- [API Reference](./API_REFERENCE.md) - Full API documentation
- [Database Schema](./DATABASE_SCHEMA.md) - Data model for custom integrations

---

**Document Version**: 1.0
**Last Updated**: January 2026
**Feedback**: docs@spike.land
**Next Review**: April 2026
