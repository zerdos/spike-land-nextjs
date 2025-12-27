# Implementation Plan for Issue #437: Stabilize 45 Flaky Test Scenarios

## Summary

Stabilize 47 flaky test scenarios (issue says 45) across 5 feature files. Root causes include:

- Missing waits for API responses before assertions
- Fixed `waitForTimeout` instead of condition-based waits
- Modal animations not waited for
- Race conditions with balance updates
- localStorage sync timing after page reloads

## Flaky Scenarios by Feature File

| Feature File                         | Count | Primary Issues                               |
| ------------------------------------ | ----- | -------------------------------------------- |
| image-enhancement.feature            | 7     | networkidle completes before content renders |
| pricing-verification.feature         | 18    | Pricing data loads asynchronously            |
| tokens.feature                       | 15    | Modal animations, API response timing        |
| album-photo-addition.feature         | 6     | Modal/toast timing                           |
| app-wizard-draft-persistence.feature | 4     | localStorage sync timing                     |

## Common Anti-Patterns Found

### 1. Using `waitForTimeout` instead of conditions

```typescript
// BAD
await this.page.waitForTimeout(100);

// GOOD
await this.page.waitForResponse(resp => resp.url().includes("/api/..."));
```

### 2. Missing API response waits after button clicks

```typescript
// BAD
await applyButton.click();
// immediately check for result

// GOOD
const responsePromise = this.page.waitForResponse(...);
await applyButton.click();
await responsePromise;
```

### 3. `.catch(() => {})` swallowing failures

```typescript
// BAD
await expect(element).toBeVisible().catch(() => {});

// GOOD
await expect(element).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
```

## Proposed Helper Functions

Add to `/e2e/support/helpers/retry-helper.ts`:

```typescript
// Wait for API response matching URL pattern
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options?: { timeout?: number; },
): Promise<Response>;

// Wait for modal animation to complete
export async function waitForModalState(
  page: Page,
  state: "visible" | "hidden",
  options?: { timeout?: number; },
): Promise<void>;

// Wait for dynamic content to match value
export async function waitForDynamicContent(
  page: Page,
  selector: string,
  expectedContent: string | RegExp,
): Promise<void>;

// Wait for localStorage to contain key
export async function waitForLocalStorage(
  page: Page,
  key: string,
  options?: { shouldExist?: boolean; minLength?: number; },
): Promise<void>;
```

## Fixes by Feature File

### image-enhancement.steps.ts

- Remove `.catch(() => {})` patterns
- Add explicit waits for `[data-testid="token-balance"]`
- Use `waitForSelector` for error messages

### pricing-verification.steps.ts

- Add `waitForPricingData()` helper
- Wait for cards with prices to render before assertions

### tokens.steps.ts

- Replace `waitForTimeout` with `waitForResponse` for voucher API
- Wait for modal animations with `waitForModalState`
- Use `waitForFunction` for balance updates

### album-photo-addition.steps.ts

- Wait for album dropdown to populate after modal opens
- Wait for API response before expecting modal close
- Improve toast detection timing

### app-creation.steps.ts

- Wait for localStorage sync after reload using `waitForFunction`
- Wait for draft restoration/hydration

## Implementation Steps

1. **Create helper functions** in retry-helper.ts
2. **Fix image-enhancement.steps.ts**: Remove .catch(), add waits
3. **Fix pricing-verification.steps.ts**: Add waitForPricingData helper
4. **Fix tokens.steps.ts**: Replace waitForTimeout, add modal waits
5. **Fix album-photo-addition.steps.ts**: Fix modal and toast timing
6. **Fix app-creation.steps.ts**: Fix localStorage sync
7. **Remove @flaky tags** from all feature files
8. **Verify**: Run each file 5 times in sequence

## Verification Strategy

```bash
# Run each file 5 times
for i in {1..5}; do
  yarn test:e2e --tags @image-enhancement && echo "Run $i passed"
done

# Run all previously-flaky tests 5 times
for i in {1..5}; do
  yarn test:e2e --tags "@pricing or @tokens or @album-photo or @wizard-draft"
done
```

## Questions

1. **localStorage Draft Feature**: `app-wizard-draft-persistence.feature` is `@skip` at feature level. Unblock as part of this issue?
2. **Test Data Dependencies**: Add `data-testid` attributes to key UI elements (album dropdown, toast)?
3. **Timeout Configuration**: Increase `TIMEOUTS.DEFAULT` from 5s/10s to 7s/15s?

## Critical Files

- `/e2e/support/helpers/retry-helper.ts` - Add new helper functions
- `/e2e/step-definitions/pricing-verification.steps.ts` - Add waitForPricingData
- `/e2e/step-definitions/tokens.steps.ts` - Replace waitForTimeout
- `/e2e/step-definitions/album-photo-addition.steps.ts` - Fix modal timing
- `/e2e/step-definitions/app-creation.steps.ts` - Fix localStorage sync
