# Merch E2E Tests

Comprehensive end-to-end tests for the Photo-to-Merch platform purchase flow.

## Overview

This test suite validates the complete user journey from browsing products to viewing order history:

1. **Product Browsing** - Catalog viewing, category filtering, product details
2. **Shopping Cart** - Add to cart, quantity management, free shipping logic
3. **Checkout** - Address form, shipping calculation, Stripe payment
4. **Order History** - Order list, order details, status tracking

## Test Statistics

| Feature          | Scenarios | Status                    |
| ---------------- | --------- | ------------------------- |
| Product Browsing | 5         | ⏳ Pending Implementation |
| Shopping Cart    | 9         | ⏳ Pending Implementation |
| Checkout         | 10        | ⏳ Pending Implementation |
| Order History    | 9         | ⏳ Pending Implementation |
| **Total**        | **33**    | ⏳ Pending Implementation |

## File Structure

```
e2e/features/merch/
├── README.md                    # This file
├── product-browsing.feature     # Product catalog and detail tests
├── shopping-cart.feature        # Cart management tests
├── checkout.feature             # Checkout flow tests
└── order-history.feature        # Order viewing tests

e2e/step-definitions/
└── merch.steps.ts              # Step implementations (~60+ steps)

e2e/
└── MERCH_TEST_IDS.md           # Required data-testid attributes
```

## Running Tests

### Prerequisites

1. **Start dev server**:
   ```bash
   yarn dev
   ```

2. **Ensure merch feature is implemented** with required data-testid attributes (see `MERCH_TEST_IDS.md`)

3. **Set up test data**: Products, categories, and test images

### Run All Merch Tests

```bash
yarn test:e2e:local -- features/merch/
```

### Run Specific Feature

```bash
# Product browsing only
yarn test:e2e:local -- features/merch/product-browsing.feature

# Shopping cart only
yarn test:e2e:local -- features/merch/shopping-cart.feature

# Checkout only
yarn test:e2e:local -- features/merch/checkout.feature

# Order history only
yarn test:e2e:local -- features/merch/order-history.feature
```

### Run Specific Scenario

```bash
yarn test:e2e:local -- features/merch/shopping-cart.feature:10
# Runs scenario starting at line 10
```

## Test Patterns

### Authentication

All tests use mocked authentication:

```gherkin
Given I am logged in as "Test User" with email "test@example.com"
```

This uses the existing E2E auth bypass pattern from `authentication.steps.ts`.

### Cart Setup

Tests that require items in cart:

```gherkin
Given I have added a product to my cart
Given I have added 2 products to my cart
Given I have added products to my cart with value over 55 GBP
```

### Order Setup

Tests requiring order history:

```gherkin
Given I have placed an order
Given I have placed an order with 3 items
Given I have multiple orders
```

**Note**: These currently use test data placeholders. Real implementation will need:

- Database seeding, OR
- Full checkout flow execution, OR
- API mocking

## Test Data Requirements

### Products

- Minimum 3 active products
- Each with at least 1 variant
- Price range: £10-£30 recommended
- Valid mockup images

### Categories

- Minimum 2 active categories
- With icon and slug

### Images

- Test images available for ImageSelector
- Minimum dimensions met for products

### Orders (Optional)

- Test orders can be mocked or seeded
- Various statuses: PENDING, PAID, SHIPPED, etc.

## Stripe Testing

Tests use Stripe test mode. Recommended test cards:

| Card Number         | Purpose   | Result                  |
| ------------------- | --------- | ----------------------- |
| 4242 4242 4242 4242 | Success   | Payment succeeds        |
| 4000 0027 6000 3184 | 3D Secure | Requires authentication |
| 4000 0000 0000 0002 | Decline   | Card declined           |

CVV: Any 3 digits
Expiry: Any future date
ZIP: Any 5 digits

## Key Scenarios

### Product Browsing

- ✅ View product catalog
- ✅ Filter by category
- ✅ View product details
- ✅ See variant options
- ✅ Navigate back to catalog

### Shopping Cart

- ✅ Add product to cart
- ✅ Update quantities
- ✅ Remove items
- ✅ See free shipping threshold
- ✅ Calculate shipping cost
- ✅ Proceed to checkout

### Checkout

- ✅ Fill shipping address
- ✅ Validate required fields
- ✅ Calculate final total
- ✅ See Stripe payment form
- ✅ Complete order (mocked)

### Order History

- ✅ View order list
- ✅ See order status
- ✅ Click order for details
- ✅ Authentication required

## Implementation Status

⚠️ **Important**: The merch feature pages and components are not yet implemented.

When implementing the merch feature, refer to:

1. **`/e2e/MERCH_TEST_IDS.md`** - Required data-testid attributes
2. **Feature files** - Expected behavior and user flows
3. **Step definitions** - Element selectors and interactions

## Test Maintenance

### Adding New Scenarios

1. Add scenario to appropriate `.feature` file
2. Implement missing steps in `merch.steps.ts`
3. Update `MERCH_TEST_IDS.md` if new test IDs needed
4. Update this README with scenario count

### Common Issues

**Cart not updating**: Increase wait times after cart operations

```typescript
await this.page.waitForTimeout(1000); // After add to cart
```

**Stripe iframe not loading**: Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set

**Product not found**: Ensure test data is seeded

**Auth redirect**: Verify E2E_BYPASS_SECRET is configured

## Related Documentation

- [E2E Testing Guide](/e2e/README.md)
- [Test ID Reference](/e2e/MERCH_TEST_IDS.md)
- [User Flows](/e2e/features/user-flows.feature)
- [Authentication Steps](/e2e/step-definitions/authentication.steps.ts)

## Contributing

When adding new merch features:

1. Write feature file scenarios first (BDD approach)
2. Implement step definitions
3. Add required data-testid attributes to components
4. Run tests to verify
5. Update this README if needed

## Questions?

See the main [E2E Testing README](/e2e/README.md) for general E2E testing guidance.
