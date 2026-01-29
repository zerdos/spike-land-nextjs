# Hypothesis AI Agent - Experimentation Framework

Epic #516

## Overview

The Hypothesis AI Agent is a comprehensive A/B testing and experimentation framework for spike.land. It provides a unified interface for running experiments across multiple content types (social posts, emails, landing pages, generic content) with advanced statistical analysis and automated winner selection.

## Key Features

### 1. **Generic Experiment Framework**
- Content-agnostic experiment model
- Pluggable adapters for different content types
- Support for 2+ variants per experiment
- Configurable traffic splitting

### 2. **Advanced Statistical Engine**
- **Wilson Score Confidence Intervals** - More accurate than normal approximation
- **Bayesian Analysis** - Intuitive "probability of being best" metrics
- **Sequential Testing** - Early stopping with SPRT
- **Multi-Variant ANOVA** - Testing 3+ variants simultaneously

### 3. **Winner Selection Strategies**
- **IMMEDIATE** - Select winner as soon as significance reached
- **CONSERVATIVE** - Wait for confirmation period (reduces false positives)
- **ECONOMIC** - Optimize for economic value (revenue/profit)
- **SAFETY_FIRST** - Require 99% confidence for critical decisions

### 4. **Content Type Adapters**
- **Social Post Adapter** - A/B test social media content
- **Generic Content Adapter** - Flexible adapter for any content type
- Extensible architecture for custom adapters

## Architecture

```
hypothesis-agent/
├── core/
│   ├── experiment-manager.ts   # CRUD operations for experiments
│   ├── variant-manager.ts      # Variant assignment and management
│   └── event-tracker.ts        # Event tracking (impressions, conversions)
│
├── statistical-engine/
│   ├── confidence-intervals.ts # Wilson score, lift intervals
│   ├── bayesian.ts            # Bayesian inference with Beta distributions
│   ├── sequential-testing.ts  # SPRT for early stopping
│   └── multi-variant-anova.ts # ANOVA for 3+ variants
│
├── winner-selection/
│   ├── strategies.ts          # Winner selection strategies
│   └── winner-selector.ts     # Strategy orchestration
│
├── adapters/
│   ├── base-adapter.ts        # Abstract base class
│   ├── social-post-adapter.ts # Social media experiments
│   ├── generic-content-adapter.ts
│   └── adapter-registry.ts    # Adapter registration
│
└── hypothesis-agent.ts        # Main API interface
```

## Database Schema

### Experiment
- Core experiment metadata
- Winner strategy configuration
- Statistical parameters (significance level, min sample size)

### ExperimentVariant
- Variant content (JSON)
- Split percentage for traffic allocation
- Performance metrics (impressions, conversions, total value)

### ExperimentEvent
- Event tracking (impression, click, conversion, custom)
- Visitor and user tracking
- Economic value tracking

### ExperimentResult
- Statistical analysis results
- Confidence intervals
- Bayesian probabilities (if enabled)

## API Endpoints

### Create Experiment
```http
POST /api/hypothesis/experiments
Content-Type: application/json

{
  "workspaceId": "workspace_123",
  "name": "Headline Test",
  "description": "Test different headlines for engagement",
  "hypothesis": "Question format will improve CTR",
  "contentType": "social_post",
  "significanceLevel": 0.95,
  "minimumSampleSize": 200,
  "winnerStrategy": "CONSERVATIVE",
  "autoSelectWinner": false,
  "variants": [
    {
      "name": "Control",
      "description": "Original headline",
      "content": {
        "platform": "TWITTER",
        "content": "Check out our new feature!",
        "variationType": "headline"
      },
      "isControl": true,
      "splitPercentage": 50
    },
    {
      "name": "Question",
      "description": "Question format",
      "content": {
        "platform": "TWITTER",
        "content": "Want to boost your productivity?",
        "variationType": "headline"
      },
      "isControl": false,
      "splitPercentage": 50
    }
  ]
}
```

### Get Experiment Results
```http
GET /api/hypothesis/experiments/{id}/results?workspaceId=workspace_123
```

Response includes:
- Experiment metadata
- Variant performance metrics
- Confidence intervals
- Winner recommendation
- Recommended action (continue, select_winner, needs_more_data)

### Track Event
```http
POST /api/hypothesis/experiments/{id}/events
Content-Type: application/json

{
  "workspaceId": "workspace_123",
  "variantId": "variant_123",
  "eventType": "conversion",
  "value": 49.99,
  "visitorId": "visitor_xyz",
  "metadata": {
    "source": "email_campaign"
  }
}
```

### Select Winner
```http
POST /api/hypothesis/experiments/{id}/winner
Content-Type: application/json

{
  "workspaceId": "workspace_123",
  "variantId": "variant_123",  // Optional - auto-select if omitted
  "reason": "Manual override - business decision"
}
```

## Usage Example

```typescript
import { createHypothesisAgent } from "@/lib/hypothesis-agent/hypothesis-agent";

// Create agent for workspace
const agent = createHypothesisAgent("workspace_123");

// Create experiment
const experiment = await agent.createExperiment({
  name: "CTA Button Test",
  contentType: "generic",
  significanceLevel: 0.95,
  minimumSampleSize: 500,
  winnerStrategy: "ECONOMIC",
  variants: [
    {
      name: "Control",
      content: { ctaText: "Buy Now" },
      isControl: true,
    },
    {
      name: "Variant A",
      content: { ctaText: "Get Started Today" },
      isControl: false,
    },
  ],
});

// Start experiment
await agent.startExperiment(experiment.id);

// Assign variant to visitor
const variant = await agent.assignVariant(experiment.id, "visitor_123");

// Track impression
await agent.trackEvent(experiment.id, variant.id, {
  eventType: "impression",
  visitorId: "visitor_123",
});

// Track conversion
await agent.trackEvent(experiment.id, variant.id, {
  eventType: "conversion",
  value: 99.99,
  visitorId: "visitor_123",
});

// Analyze results
const analysis = await agent.analyzeExperiment(experiment.id);

console.log(`Winner: ${analysis.winner?.variantName}`);
console.log(`Confidence: ${(analysis.winner?.confidenceInterval.level * 100).toFixed(0)}%`);
console.log(`Recommendation: ${analysis.recommendedAction}`);

// Select winner (auto or manual)
await agent.selectWinnerAndComplete(experiment.id);
```

## Statistical Methods

### Wilson Score Confidence Interval
More accurate than normal approximation for proportions, especially with:
- Small sample sizes
- Proportions near 0 or 1
- Unequal sample sizes

### Bayesian A/B Testing
- Uses Beta-Binomial conjugate priors
- Provides intuitive "probability of being best" metric
- Expected loss calculation quantifies risk
- 95% credible intervals (Bayesian equivalent of CI)

### Sequential Testing (SPRT)
- Allows continuous monitoring without inflating error rate
- Early stopping when clear winner emerges
- Reduces sample size requirements vs fixed-sample tests

## Winner Selection Strategies

### IMMEDIATE
- **Use case**: Fast iteration, low-risk decisions
- **Criteria**: 95% statistical significance
- **Sample requirement**: Standard minimum

### CONSERVATIVE
- **Use case**: Important business decisions
- **Criteria**: 95% significance + confirmation period
- **Sample requirement**: 1.5x minimum

### ECONOMIC
- **Use case**: Revenue/profit optimization
- **Criteria**: Economic value improvement + significance
- **Sample requirement**: Standard + value threshold

### SAFETY_FIRST
- **Use case**: High-stakes, critical decisions
- **Criteria**: 99% confidence + positive lift at 99% CI
- **Sample requirement**: 2x minimum

## Integration Points

### Current A/B Testing
The Hypothesis Agent extends the existing `SocialPostAbTest` system:
- Maintains backward compatibility
- Adds advanced statistical methods
- Provides unified interface for all content types

### Future Integrations (Epic 3.3 - Orchestration)
- Workflow triggers for experiment lifecycle
- Automated experiment scheduling
- Multi-step experiment workflows

## Testing Strategy

### Unit Tests
- Statistical engine accuracy
- Winner selection logic
- Adapter validation

### Integration Tests
- API endpoint behavior
- Database operations
- Event tracking

### E2E Tests
- Complete experiment lifecycle
- Multi-variant experiments
- Winner selection automation

## Performance Considerations

- Event tracking uses batch operations for high-volume scenarios
- Statistical calculations cached with `ExperimentResult` model
- Confidence intervals computed on-demand for current data
- Bayesian analysis uses Monte Carlo with configurable sample count

## Security & Privacy

- Workspace-scoped access control
- Anonymous visitor tracking (GDPR-compliant)
- Event retention policies
- Opt-out support for tracking

## Future Enhancements

### Phase 1 (Current - Epic #516)
- ✅ Generic experiment framework
- ✅ Advanced statistical engine
- ✅ Winner selection strategies
- ✅ Social post and generic adapters

### Phase 2 (Future)
- Email campaign adapter
- Landing page adapter
- Workflow integration (Epic 3.3)
- Real-time dashboards

### Phase 3 (Future)
- Multi-armed bandit algorithms
- Contextual bandits
- Personalization engine
- A/B/n testing UI

## Known Limitations

1. **Email Integration** - Email adapter requires Resend API enhancement
2. **Landing Page Experiments** - Requires client-side integration
3. **Workflow Integration** - Blocked by Epic 3.3 implementation
4. **Type Errors** - Minor TypeScript strict mode errors to be resolved

## Support & Troubleshooting

### Common Issues

**Issue**: "No clear winner found"
- **Solution**: Check sample size requirements, may need more data

**Issue**: "Experiment not reaching significance"
- **Solution**: Effect size too small or high variance - consider longer duration

**Issue**: "Variants not evenly distributed"
- **Solution**: Check split percentages sum to 100, verify hash function

### Debugging

```typescript
// Enable detailed logging
const analysis = await agent.analyzeExperiment(experimentId);
console.log(JSON.stringify(analysis, null, 2));

// Check event counts
const events = await EventTracker.getEventCounts(experimentId);
console.log(events);

// Verify variant metrics
const variants = await agent.getVariants(experimentId);
variants.forEach(v => {
  console.log(`${v.name}: ${v.impressions} impressions, ${v.conversions} conversions`);
});
```

## Contributing

When adding new adapters:
1. Extend `BaseContentAdapter`
2. Implement required methods
3. Register in `adapter-registry.ts`
4. Add tests
5. Update documentation

## References

- [Wilson Score Interval](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval)
- [Bayesian A/B Testing](https://www.evanmiller.org/bayesian-ab-testing.html)
- [Sequential Probability Ratio Test](https://en.wikipedia.org/wiki/Sequential_probability_ratio_test)
- [ANOVA for Proportions](https://en.wikipedia.org/wiki/Analysis_of_variance)

---

**Epic #516 - Hypothesis AI Agent**
**Status**: Implementation Complete (TypeScript errors to be resolved)
**Last Updated**: 2026-01-29
