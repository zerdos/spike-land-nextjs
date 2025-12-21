# Merch E2E Test Data-TestID Reference

This document outlines the required `data-testid` attributes for E2E testing of the merch purchase flow.

## Product Browsing

### `/merch` Page (Product Catalog)

| Element                    | data-testid        | Description                         |
| -------------------------- | ------------------ | ----------------------------------- |
| Product grid container     | `product-grid`     | Container for all product cards     |
| Category filters container | `category-filters` | Container for category filter links |
| Individual product card    | `product-card`     | Each product card in the grid       |

### `/merch/[productId]` Page (Product Detail)

| Element                    | data-testid                                      | Description                             |
| -------------------------- | ------------------------------------------------ | --------------------------------------- |
| Product name heading       | `product-name`                                   | H1 or heading with product name         |
| Product price              | `product-price`                                  | Element showing the total price         |
| Product mockup image       | `product-mockup`                                 | Main product image/mockup               |
| Variant selector container | `variant-selector`                               | Container for variant selection options |
| Individual variant option  | `variant-option`                                 | Each selectable variant button/option   |
| Image selector container   | `image-selector`                                 | Container for image selection UI        |
| Test image option          | `test-image`                                     | Selectable image option (for testing)   |
| Add to cart button         | N/A (use role="button" with name /Add to Cart/i) | Main CTA button                         |

## Shopping Cart

### Cart Icon (Header Component)

| Element    | data-testid  | Description              |
| ---------- | ------------ | ------------------------ |
| Cart badge | `cart-badge` | Badge showing item count |

### `/cart` Page

| Element                    | data-testid          | Description                     |
| -------------------------- | -------------------- | ------------------------------- |
| Cart item row              | `cart-item`          | Each item in the cart           |
| Cart item quantity display | `cart-item-quantity` | Shows current quantity          |
| Increase quantity button   | `increase-quantity`  | Button to increase qty          |
| Decrease quantity button   | `decrease-quantity`  | Button to decrease qty          |
| Remove item button         | `remove-cart-item`   | Button to remove item from cart |
| Order summary container    | `order-summary`      | Order summary sidebar/section   |
| Shipping cost display      | `shipping-cost`      | Shows shipping cost or FREE     |
| Cart total                 | `cart-total`         | Final total amount              |

## Checkout

### `/checkout` Page

| Element        | data-testid      | Description                          |
| -------------- | ---------------- | ------------------------------------ |
| Order subtotal | `order-subtotal` | Subtotal in order summary            |
| Shipping cost  | `shipping-cost`  | Calculated shipping cost             |
| Order total    | `order-total`    | Final total with shipping            |
| Lock icon      | `lock-icon`      | Security lock icon on payment button |

### Form Fields

Use standard `id` attributes matching field names:

- `email`
- `name`
- `line1`
- `line2`
- `city`
- `postalCode`
- `country`
- `phone`

## Order History

### `/orders` Page

| Element             | data-testid           | Description                        |
| ------------------- | --------------------- | ---------------------------------- |
| Order card          | `order-card`          | Each order in the list             |
| Order number        | `order-number`        | Unique order number/ID             |
| Order status badge  | `order-status-badge`  | Status badge (PENDING, PAID, etc.) |
| Order date          | `order-date`          | Order creation date                |
| Order total         | `order-total`         | Order total amount                 |
| Order preview image | `order-preview-image` | Thumbnail images of order items    |

### `/orders/[orderId]` Page (Order Detail)

| Element                 | data-testid     | Description                |
| ----------------------- | --------------- | -------------------------- |
| Order details container | `order-details` | Main order details section |

## Implementation Guidelines

### Adding Test IDs to Components

```tsx
// Example: Product Card
export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card data-testid="product-card">
      <h3 data-testid="product-name">{product.name}</h3>
      <span data-testid="product-price">{formatPrice(product.price)}</span>
      {/* ... */}
    </Card>
  );
}

// Example: Cart Icon
export function CartIcon() {
  return (
    <Button>
      <ShoppingCart />
      {itemCount > 0 && (
        <Badge data-testid="cart-badge">{itemCount}</Badge>
      )}
    </Button>
  );
}

// Example: Quantity Controls
<Button data-testid="decrease-quantity">
  <Minus />
</Button>
<span data-testid="cart-item-quantity">{quantity}</span>
<Button data-testid="increase-quantity">
  <Plus />
</Button>
```

### Best Practices

1. **Use semantic HTML first**: Prefer `getByRole`, `getByLabel`, `getByText` when possible
2. **data-testid as fallback**: Use data-testid for complex dynamic elements
3. **Consistent naming**: Use kebab-case for test IDs
4. **Descriptive names**: Make test IDs self-documenting
5. **Avoid dynamic values**: Don't include IDs or changing data in test IDs

### When to Use data-testid

Use data-testid when:

- Multiple similar elements exist (e.g., multiple product cards)
- Element text is dynamic or translated
- No appropriate ARIA role exists
- Element is purely visual (icons, badges)

Don't use data-testid when:

- Native HTML roles exist (`button`, `link`, `heading`)
- Accessible labels are present
- Text content is stable and unique

## Testing Patterns

### Authentication

Tests use mocked NextAuth sessions via `authentication.steps.ts`:

```gherkin
Given I am logged in as "Test User" with email "test@example.com"
```

### Navigation

```gherkin
When I navigate to "/merch"
Then I should be on "/merch"
```

### Waiting for Updates

After cart operations, add small waits for state updates:

```typescript
await this.page.waitForTimeout(500); // After quantity update
await this.page.waitForTimeout(1000); // After add to cart
```

### API Mocking

For tests that don't require full flow, mock API responses:

```typescript
await this.page.route("**/api/merch/cart", async (route) => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ cart: mockCart }),
  });
});
```

## Missing Components

**Note**: As of the creation of these E2E tests, the following components/pages do not exist yet:

- `/src/app/merch/page.tsx`
- `/src/app/merch/[productId]/page.tsx`
- `/src/app/cart/page.tsx`
- `/src/app/checkout/page.tsx`
- `/src/app/orders/page.tsx`
- `/src/components/merch/product-card.tsx`
- `/src/components/merch/cart-icon.tsx`
- `/src/components/merch/image-selector.tsx`
- `/src/components/merch/variant-selector.tsx`

When implementing these components, refer to this document for required test IDs.

## Running Tests

```bash
# Start dev server
yarn dev

# Run E2E tests in another terminal
yarn test:e2e:local

# Run specific feature
yarn test:e2e:local -- features/merch/product-browsing.feature
```

## Test Data Requirements

For tests to pass, seed data is needed:

1. **Products**: At least 3 active products with variants
2. **Categories**: At least 2 active categories
3. **Test Images**: Mock images available for image selector
4. **Orders**: Test orders for order history scenarios (can be mocked)

## Stripe Testing

Use Stripe test mode cards:

- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0027 6000 3184`
- Declined: `4000 0000 0000 0002`

CVV: Any 3 digits
Expiry: Any future date
ZIP: Any valid format
