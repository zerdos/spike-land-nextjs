# Image Enhancement E2E Testing

This document describes the E2E test suite for the Image Enhancement feature.

## Overview

The image enhancement E2E tests validate the complete user journey for uploading, enhancing, and managing AI-enhanced images. The tests use Playwright + Cucumber (BDD) to ensure the feature works correctly across different scenarios.

## Test Files

- **Feature File**: `e2e/features/image-enhancement.feature`
- **Step Definitions**: `e2e/step-definitions/image-enhancement.steps.ts`
- **Helpers**: `e2e/support/helpers/image-enhancement-helper.ts`
- **Test Fixtures**: `e2e/fixtures/test-image.jpg`

## Test Coverage

### Authentication & Authorization
- ✅ Authenticated users can access the enhance page
- ✅ Unauthenticated users are redirected to sign-in
- ✅ Users can only view/edit their own images
- ✅ Attempting to access another user's image redirects to the enhance page

### Image Upload
- ✅ Upload section displays correctly with icon, text, and button
- ✅ Successfully upload valid image files
- ✅ Validation error for files larger than 50MB
- ✅ Validation error for non-image files
- ✅ Loading state during upload (spinner, disabled button)
- ✅ Redirect to image enhancement page after successful upload

### Image Enhancement
- ✅ Display all enhancement tier options (TIER_1K, TIER_2K, TIER_4K)
- ✅ Show token cost for each tier
- ✅ Start enhancement with sufficient tokens
- ✅ Prevent enhancement with insufficient tokens
- ✅ Show insufficient tokens warning and purchase prompt
- ✅ Display processing status during enhancement
- ✅ Disable enhance button while processing
- ✅ Handle enhancement errors gracefully

### Token Management
- ✅ Display current token balance
- ✅ Show low balance warning banner when tokens < 5
- ✅ Update token balance after enhancement
- ✅ Refresh balance when returning from Stripe checkout
- ✅ Clean up URL parameters after Stripe redirect
- ✅ Open purchase modal to buy more tokens

### Image Comparison
- ✅ Display original image when no enhancements exist
- ✅ Display comparison slider with original and enhanced versions
- ✅ Interact with slider to compare before/after
- ✅ Slider is responsive (works on mobile, tablet, desktop)

### Version Management
- ✅ Display all enhancement versions in grid
- ✅ Select different versions to compare
- ✅ Highlight selected version
- ✅ Update comparison slider when version changes

### Image Deletion
- ✅ Delete image from list with confirmation
- ✅ Cancel deletion keeps image in list
- ✅ Image removed from list after successful deletion

### UI/UX
- ✅ Navigate back to images list from detail page
- ✅ Display empty state when no images uploaded
- ✅ Show only user's own images in list
- ✅ Proper loading states and error messages

## Running the Tests

### Prerequisites
1. Development server must be running: `npm run dev`
2. Database should be seeded with test data (optional)
3. Environment variables configured (see `.env.local.example`)

### Run All Image Enhancement Tests

```bash
# Run all tests locally
npm run test:e2e:local

# Run only image enhancement tests
BASE_URL=http://localhost:3000 npx cucumber-js e2e/features/image-enhancement.feature

# Run only fast tests
npm run test:e2e:fast -- e2e/features/image-enhancement.feature

# Run in CI
npm run test:e2e:ci
```

### Run Specific Scenarios

```bash
# Run a specific scenario by line number
BASE_URL=http://localhost:3000 npx cucumber-js e2e/features/image-enhancement.feature:10

# Run scenarios with specific tag
BASE_URL=http://localhost:3000 npx cucumber-js --tags "@fast"

# Run without skip or flaky tests (default)
BASE_URL=http://localhost:3000 npx cucumber-js --tags "not @skip and not @flaky"
```

## Test Data & Mocking

### Mock API Endpoints

The tests mock the following API endpoints to avoid dependencies on backend services:

- `POST /api/images/upload` - Image upload
- `POST /api/images/enhance` - Start enhancement job
- `GET /api/jobs/{jobId}` - Poll job status
- `GET /api/tokens/balance` - Get token balance
- `DELETE /api/images/{imageId}` - Delete image
- `GET /api/images` - List user's images

### Mock Data

Test data is defined in the step definitions:

- **Mock User**: `{ name: "Test User", email: "test@example.com" }`
- **Mock Image ID**: `test-image-123`
- **Mock Job ID**: `job-123`
- **Token Balances**: Configurable per scenario (0, 2, 5, 10, 20 tokens)

### Test Fixtures

- `e2e/fixtures/test-image.jpg` - Small JPEG test image (64x64, ~500 bytes)

## Helper Functions

The `image-enhancement-helper.ts` provides reusable functions:

### API Mocking
- `mockTokenBalanceAPI(page, balance)` - Mock token balance endpoint
- `mockImageUploadAPI(page, options)` - Mock image upload with delays/errors
- `mockEnhancementAPI(page, options)` - Mock enhancement endpoint
- `mockJobPollingAPI(page, jobData)` - Mock job status polling
- `mockImagesListAPI(page, images)` - Mock images list
- `mockImageDeletionAPI(page, success)` - Mock image deletion

### Data Factories
- `createMockEnhancedImage(overrides)` - Create mock image object
- `createMockEnhancementJob(overrides)` - Create mock job object

### Utilities
- `simulateFileUpload(page, options)` - Simulate browser file upload
- `waitForEnhancementComplete(page, timeout)` - Wait for job completion
- `autoAcceptDialogs(page)` - Auto-accept confirmation dialogs
- `autoDismissDialogs(page)` - Auto-dismiss confirmation dialogs

## Test Tags

Tests use Cucumber tags for organization:

- `@fast` - Quick tests that run in < 1 second
- `@slow` - Tests that may take longer (API calls, animations)
- `@skip` - Temporarily disabled tests
- `@flaky` - Known flaky tests (excluded from CI by default)

## Debugging Tests

### Visual Debugging

```bash
# Run with headed browser
BASE_URL=http://localhost:3000 HEADED=true npx cucumber-js e2e/features/image-enhancement.feature

# Run with slow-mo for easier observation
BASE_URL=http://localhost:3000 SLOWMO=1000 npx cucumber-js e2e/features/image-enhancement.feature
```

### Screenshots

Failed tests automatically capture screenshots saved to:
- `e2e/reports/screenshots/`

### Logs

Test logs and reports are saved to:
- `e2e/reports/cucumber-report.html` - HTML report
- `e2e/reports/cucumber-report-ci.json` - JSON report (CI only)

## Common Issues

### Test Fails: "Cannot find file input"
**Solution**: Ensure the ImageUpload component renders properly. Check that the file input element exists in the DOM.

### Test Fails: "Timeout waiting for navigation"
**Solution**: Check that mock routes are set up before navigation. Increase timeout if needed.

### Test Fails: "Token balance not updating"
**Solution**: Ensure the `useTokenBalance` hook is properly mocked. Check API route handlers.

### Test Fails: "Image not found in list"
**Solution**: Verify the images list API is mocked correctly with expected data.

## Best Practices

1. **Use Mock Data**: Always mock API endpoints to avoid flaky tests
2. **Wait for Load States**: Use `waitForLoadState('networkidle')` after navigation
3. **Use Data Attributes**: Add `data-testid`, `data-tier`, `data-version-id` to components for reliable selection
4. **Test User Flows**: Focus on complete user journeys, not individual UI elements
5. **Keep Tests Fast**: Use `@fast` tag for quick tests, mock slow operations
6. **Handle Async Operations**: Use proper waits for API responses and UI updates
7. **Clean Up State**: Clear mocks and state between scenarios
8. **Descriptive Scenarios**: Write clear scenario names that explain the expected behavior

## Future Improvements

- [ ] Add visual regression testing for image comparison slider
- [ ] Test actual image processing with mock AI service
- [ ] Add performance tests for large image uploads
- [ ] Test concurrent enhancement jobs
- [ ] Add accessibility tests (ARIA labels, keyboard navigation)
- [ ] Test error recovery (retry failed jobs)
- [ ] Test image export functionality
- [ ] Add tests for different image formats (PNG, WebP, HEIC)

## Related Documentation

- [E2E Testing README](./README.md) - General E2E testing guidelines
- [Cucumber Quick Reference](./QUICK_REFERENCE.md) - Cucumber syntax and patterns
- [Image Enhancement Feature Spec](../docs/IMAGE_ENHANCEMENT.md) - Feature requirements (if exists)
