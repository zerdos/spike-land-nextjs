# Batch Enhancement E2E Tests

## Overview

Comprehensive end-to-end tests for the batch image enhancement feature in albums. These tests verify the complete workflow of enhancing multiple images simultaneously, including token management, job status tracking, error handling, and user experience.

## Test Files

- **Feature File**: `e2e/features/batch-enhancement.feature`
- **Step Definitions**: `e2e/step-definitions/batch-enhancement.steps.ts`

## Test Coverage

### Happy Path Scenarios

1. **Successfully enhance all images in album**
   - Tests the complete batch enhancement workflow
   - Verifies token deduction (6 tokens for 3 images at TIER_1K)
   - Checks progress indicators
   - Validates completion status

2. **View tier selection with cost preview**
   - Shows tier options (TIER_1K, TIER_2K, TIER_4K)
   - Displays accurate cost calculations
   - Shows per-image token breakdown

3. **Skip already enhanced images**
   - Filters out images already enhanced at selected tier
   - Only processes unenhanced images
   - Calculates correct token cost for remaining images

### Error Handling Scenarios

1. **Batch enhancement with insufficient tokens**
   - Shows clear warning message
   - Disables enhance button
   - Provides "Get Tokens" call-to-action

2. **Handle batch enhancement errors gracefully**
   - Distinguishes between successful and failed enhancements
   - Shows error count in summary
   - Provides "Retry Failed" functionality

3. **Batch enhancement permission check**
   - Prevents unauthorized users from enhancing other users' albums
   - Returns 403 Forbidden error
   - Prevents token deduction

### User Experience Scenarios

1. **Batch enhancement progress tracking**
   - Individual status for each image
   - Overall progress percentage
   - Visual indicators (checkmarks, spinners)
   - Progressive status updates

2. **Cancel batch enhancement dialog**
   - Closes dialog without starting jobs
   - No token deduction
   - No side effects

3. **Close dialog during enhancement processing**
   - Allows closing dialog while jobs run
   - Enhancements continue in background
   - Toast notification about background processing

4. **Navigate away during batch processing**
   - Jobs continue in background
   - Can return to album to view results
   - Enhanced images display properly

### Edge Cases

1. **Empty album shows no enhance button**
   - Gracefully handles albums with no images
   - Shows appropriate empty state message

2. **All images already enhanced**
   - Detects when all images are enhanced at selected tier
   - Shows clear message
   - Disables enhance button with 0 token cost

3. **Batch enhancement with maximum batch size**
   - Enforces MAX_BATCH_SIZE limit (20 images)
   - Shows warning about limit
   - Processes only allowed images

### Real-time Updates

1. **Poll job status until completion**
   - Polls every 2 seconds initially
   - Increases interval for long-running jobs
   - Stops when all jobs complete

2. **Real-time status updates via polling**
   - Shows transition: pending → enhancing → completed
   - Updates completion percentage progressively
   - Refreshes token balance automatically

3. **Refresh token balance after enhancement**
   - Automatically updates balance display
   - Shows correct balance after jobs complete

## Test Data & Mocking

### Mock Data Structure

```typescript
interface MockImage {
  id: string;
  originalUrl: string;
  enhancementJobs: Array<{
    id: string;
    tier: string;
    status: string;
    enhancedUrl?: string;
  }>;
}

interface MockAlbum {
  id: string;
  name: string;
  userId: string;
  images: MockImage[];
}

interface MockJob {
  id: string;
  imageId: string;
  tier: string;
  status: string;
  tokensCost: number;
  errorMessage: string | null;
}
```

### Mocked APIs

1. **GET /api/albums/:id** - Returns mock album with images
2. **GET /api/tokens/balance** - Returns user's token balance
3. **POST /api/albums/:id/enhance** - Initiates batch enhancement
4. **GET /api/jobs/status** - Polls job statuses

### Helper Functions

- `mockAlbum()` - Sets up mock album with configurable images
- `mockTokenBalance()` - Mocks user's token balance
- `mockBatchEnhancement()` - Mocks batch enhancement API with options
- `mockJobStatusPolling()` - Simulates progressive job completion

## Token Cost Calculations

### Enhancement Tier Costs

- **TIER_1K** (1024px): 2 tokens per image
- **TIER_2K** (2048px): 5 tokens per image
- **TIER_4K** (4096px): 10 tokens per image

### Example Calculations

- 3 images × TIER_1K = 6 tokens
- 5 images × TIER_2K = 25 tokens
- 4 images × TIER_4K = 40 tokens

## Running the Tests

### Run All Batch Enhancement Tests

```bash
# Run specific feature
yarn test:e2e --grep "Batch Image Enhancement"

# Run all E2E tests (includes batch enhancement)
yarn test:e2e
```

### Run Specific Scenario

```bash
# Run only insufficient tokens scenario
yarn test:e2e --grep "insufficient tokens"

# Run progress tracking scenario
yarn test:e2e --grep "progress tracking"
```

### Debug Mode

```bash
# Run with browser visible (not headless)
CI=false yarn test:e2e --grep "Batch Image Enhancement"
```

## CI/CD Integration

These tests run automatically in the CI/CD pipeline:

1. **Test Job** - Lints and type-checks the step definitions
2. **Deploy Job** - Deploys to Vercel (preview or production)
3. **E2E Job** - Runs batch enhancement tests against deployment

### Required Environment Variables

- `BASE_URL` - Deployment URL (automatically set by CI)
- `E2E_BYPASS_SECRET` - Auth bypass for E2E tests (optional)

## Test Maintenance

### When to Update Tests

1. **API Changes**: Update mock responses in step definitions
2. **UI Changes**: Update element selectors and assertions
3. **Token Cost Changes**: Update cost calculations in assertions
4. **New Features**: Add new scenarios to feature file

### Common Issues

**Issue**: Tests fail with "Element not found"
**Solution**: Check if UI selectors changed, update step definitions

**Issue**: Token balance assertions fail
**Solution**: Verify token cost calculations match implementation

**Issue**: Polling timeouts
**Solution**: Adjust wait times in mockJobStatusPolling()

## Best Practices

1. **Use BDD Language**: Write scenarios in plain English
2. **Test Behavior, Not Implementation**: Focus on user outcomes
3. **Mock External Dependencies**: Use helpers to mock APIs consistently
4. **Keep Scenarios Independent**: Each scenario should run standalone
5. **Verify Side Effects**: Always check token deductions, job creation, etc.

## Related Documentation

- [E2E Testing Guide](../e2e/README.md)
- [Token System Documentation](../TOKENS.md)
- [Album Feature Specification](../features/ALBUMS.md)
- [Image Enhancement API](../api/IMAGE_ENHANCEMENT.md)

## Future Enhancements

- [ ] Test concurrent batch enhancements across multiple albums
- [ ] Test network failure recovery
- [ ] Test browser refresh during enhancement
- [ ] Test WebSocket-based real-time updates (when implemented)
- [ ] Performance tests for large batches (>20 images)
