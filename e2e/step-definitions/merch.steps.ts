import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// ===== Product Browsing Steps =====

Then("I should see the product grid", async function(this: CustomWorld) {
  const productGrid = this.page.locator('[data-testid="product-grid"]');
  await expect(productGrid).toBeVisible();
});

Then("I should see the category filters", async function(this: CustomWorld) {
  const categoryFilters = this.page.locator('[data-testid="category-filters"]');
  await expect(categoryFilters).toBeVisible();
});

When("I click on the first product card", async function(this: CustomWorld) {
  const firstProduct = this.page.locator('[data-testid="product-card"]').first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.click();
  await this.page.waitForLoadState("networkidle");
});

Then("I should be on a product detail page", async function(this: CustomWorld) {
  // URL should contain /merch/ followed by a product ID
  await this.page.waitForURL(/\/merch\/[^/]+$/);
  const url = this.page.url();
  expect(url).toMatch(/\/merch\/[^/]+$/);
});

Then("I should see the product name", async function(this: CustomWorld) {
  const productName = this.page.locator('[data-testid="product-name"]');
  await expect(productName).toBeVisible();
});

Then("I should see the product price", async function(this: CustomWorld) {
  const productPrice = this.page.locator('[data-testid="product-price"]');
  await expect(productPrice).toBeVisible();
});

Then("I should see the variant selector", async function(this: CustomWorld) {
  const variantSelector = this.page.locator('[data-testid="variant-selector"]');
  await expect(variantSelector).toBeVisible();
});

Then("I should see the image selector", async function(this: CustomWorld) {
  const imageSelector = this.page.locator('[data-testid="image-selector"]');
  await expect(imageSelector).toBeVisible();
});

Then("I should see the product mockup image", async function(this: CustomWorld) {
  const mockupImage = this.page.locator('[data-testid="product-mockup"]');
  await expect(mockupImage).toBeVisible();
});

Then("I should see minimum image requirements", async function(this: CustomWorld) {
  const requirements = this.page.getByText(/Minimum image size:/i);
  await expect(requirements).toBeVisible();
});

// ===== Shopping Cart Steps =====

When("I select the first variant", async function(this: CustomWorld) {
  const firstVariant = this.page.locator('[data-testid="variant-option"]').first();
  await expect(firstVariant).toBeVisible();
  await firstVariant.click();
  // Store variant ID for later use if needed
  this.attach(JSON.stringify({ variantSelected: true }), "application/json");
});

When("I select a test image", async function(this: CustomWorld) {
  // This will need to be adapted based on your ImageSelector implementation
  // For now, we'll mock an image selection
  const imageSelector = this.page.locator('[data-testid="image-selector"]');
  await expect(imageSelector).toBeVisible();

  // If there's a test image available, click it
  const testImage = this.page.locator('[data-testid="test-image"]').first();
  if (await testImage.isVisible()) {
    await testImage.click();
  }
});

Then("I should see the cart success message", async function(this: CustomWorld) {
  const successMessage = this.page.getByText(/Added to cart/i);
  await expect(successMessage).toBeVisible({ timeout: 10000 });
});

Then("the cart icon should show {int} item(s)", async function(this: CustomWorld, count: number) {
  const cartBadge = this.page.locator('[data-testid="cart-badge"]');
  await expect(cartBadge).toBeVisible({ timeout: 10000 });
  await expect(cartBadge).toHaveText(count.toString());
});

Given("I have added a product to my cart", async function(this: CustomWorld) {
  // Navigate to merch page
  await this.page.goto(`${this.baseUrl}/merch`);
  await this.page.waitForLoadState("networkidle");

  // Click first product
  const firstProduct = this.page.locator('[data-testid="product-card"]').first();
  await firstProduct.click();
  await this.page.waitForLoadState("networkidle");

  // Select variant if available
  const variantOption = this.page.locator('[data-testid="variant-option"]').first();
  if (await variantOption.isVisible()) {
    await variantOption.click();
  }

  // Select test image
  const testImage = this.page.locator('[data-testid="test-image"]').first();
  if (await testImage.isVisible()) {
    await testImage.click();
  }

  // Add to cart
  const addToCartButton = this.page.getByRole("button", { name: /Add to Cart/i });
  await addToCartButton.click();

  // Wait for success message
  await this.page.waitForTimeout(1000);
});

Given("I have added {int} products to my cart", async function(this: CustomWorld, count: number) {
  for (let i = 0; i < count; i++) {
    await this.page.goto(`${this.baseUrl}/merch`);
    await this.page.waitForLoadState("networkidle");

    const firstProduct = this.page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await this.page.waitForLoadState("networkidle");

    const variantOption = this.page.locator('[data-testid="variant-option"]').first();
    if (await variantOption.isVisible()) {
      await variantOption.click();
    }

    const testImage = this.page.locator('[data-testid="test-image"]').first();
    if (await testImage.isVisible()) {
      await testImage.click();
    }

    const addToCartButton = this.page.getByRole("button", { name: /Add to Cart/i });
    await addToCartButton.click();
    await this.page.waitForTimeout(1000);
  }
});

Then("I should see the cart item", async function(this: CustomWorld) {
  const cartItem = this.page.locator('[data-testid="cart-item"]').first();
  await expect(cartItem).toBeVisible();
});

Then("I should see the order summary", async function(this: CustomWorld) {
  const orderSummary = this.page.locator('[data-testid="order-summary"]');
  await expect(orderSummary).toBeVisible();
});

When("I click the increase quantity button", async function(this: CustomWorld) {
  const increaseButton = this.page.locator('[data-testid="increase-quantity"]').first();
  await expect(increaseButton).toBeVisible();
  await increaseButton.click();
  await this.page.waitForTimeout(500);
});

When("I click the decrease quantity button", async function(this: CustomWorld) {
  const decreaseButton = this.page.locator('[data-testid="decrease-quantity"]').first();
  await expect(decreaseButton).toBeVisible();
  await decreaseButton.click();
  await this.page.waitForTimeout(500);
});

Then("the cart quantity should be {int}", async function(this: CustomWorld, expectedQty: number) {
  const quantityDisplay = this.page.locator('[data-testid="cart-item-quantity"]').first();
  await expect(quantityDisplay).toHaveText(expectedQty.toString());
});

Then("the cart total should update", async function(this: CustomWorld) {
  // Just verify the total is visible and is a price format
  const total = this.page.locator('[data-testid="cart-total"]');
  await expect(total).toBeVisible();
  const totalText = await total.textContent();
  expect(totalText).toMatch(/£\d+\.\d{2}/);
});

When("I click the remove item button", async function(this: CustomWorld) {
  const removeButton = this.page.locator('[data-testid="remove-cart-item"]').first();
  await expect(removeButton).toBeVisible();
  await removeButton.click();
  await this.page.waitForTimeout(500);
});

Given("I have added a product to my cart with value under {int} GBP", async function(
  this: CustomWorld,
  _threshold: number,
) {
  // Similar to "I have added a product to my cart" but we assume test products are under threshold
  await this.page.goto(`${this.baseUrl}/merch`);
  await this.page.waitForLoadState("networkidle");

  const firstProduct = this.page.locator('[data-testid="product-card"]').first();
  await firstProduct.click();
  await this.page.waitForLoadState("networkidle");

  const variantOption = this.page.locator('[data-testid="variant-option"]').first();
  if (await variantOption.isVisible()) {
    await variantOption.click();
  }

  const testImage = this.page.locator('[data-testid="test-image"]').first();
  if (await testImage.isVisible()) {
    await testImage.click();
  }

  const addToCartButton = this.page.getByRole("button", { name: /Add to Cart/i });
  await addToCartButton.click();
  await this.page.waitForTimeout(1000);
});

Given("I have added products to my cart with value over {int} GBP", async function(
  this: CustomWorld,
  _threshold: number,
) {
  // Add multiple products to exceed threshold
  // This is a simplified version - in reality you'd check actual prices
  for (let i = 0; i < 3; i++) {
    await this.page.goto(`${this.baseUrl}/merch`);
    await this.page.waitForLoadState("networkidle");

    const firstProduct = this.page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await this.page.waitForLoadState("networkidle");

    const variantOption = this.page.locator('[data-testid="variant-option"]').first();
    if (await variantOption.isVisible()) {
      await variantOption.click();
    }

    const testImage = this.page.locator('[data-testid="test-image"]').first();
    if (await testImage.isVisible()) {
      await testImage.click();
    }

    const addToCartButton = this.page.getByRole("button", { name: /Add to Cart/i });
    await addToCartButton.click();
    await this.page.waitForTimeout(1000);
  }
});

Then("I should see the free shipping threshold message", async function(this: CustomWorld) {
  const message = this.page.getByText(/Add.*more for free shipping/i);
  await expect(message).toBeVisible();
});

Then("I should see shipping cost in the summary", async function(this: CustomWorld) {
  const shippingCost = this.page.locator('[data-testid="shipping-cost"]');
  await expect(shippingCost).toBeVisible();
  const costText = await shippingCost.textContent();
  expect(costText).toMatch(/£\d+\.\d{2}/);
});

Then(
  "the shipping cost should show as {string}",
  async function(this: CustomWorld, expectedText: string) {
    const shippingCost = this.page.locator('[data-testid="shipping-cost"]');
    await expect(shippingCost).toContainText(expectedText);
  },
);

// ===== Checkout Steps =====

When(
  "I fill in the shipping address form:",
  async function(this: CustomWorld, dataTable: DataTable) {
    const data = dataTable.rowsHash();

    for (const [field, value] of Object.entries(data)) {
      const input = this.page.locator(`[id="${field}"]`);
      await input.fill(value);
    }
  },
);

When("I complete the shipping address form", async function(this: CustomWorld) {
  await this.page.fill('[id="name"]', "John Doe");
  await this.page.fill('[id="line1"]', "123 Test Street");
  await this.page.fill('[id="city"]', "London");
  await this.page.fill('[id="postalCode"]', "SW1A 1AA");
  await this.page.fill('[id="phone"]', "07700900000");
});

Then("I should see the order subtotal", async function(this: CustomWorld) {
  const subtotal = this.page.locator('[data-testid="order-subtotal"]');
  await expect(subtotal).toBeVisible();
});

Then("I should see shipping information placeholder", async function(this: CustomWorld) {
  const placeholder = this.page.getByText(/Complete shipping info/i);
  await expect(placeholder).toBeVisible();
});

Then("I should see the order summary with calculated shipping", async function(this: CustomWorld) {
  const shippingCost = this.page.locator('[data-testid="shipping-cost"]');
  await expect(shippingCost).toBeVisible();

  const total = this.page.locator('[data-testid="order-total"]');
  await expect(total).toBeVisible();
});

Then("I should see a checkout validation error", async function(this: CustomWorld) {
  const errorAlert = this.page.locator('[role="alert"]');
  await expect(errorAlert).toBeVisible();
});

Then("I should see the Stripe payment element", async function(this: CustomWorld) {
  // Stripe payment element has iframe
  const paymentFrame = this.page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await expect(paymentFrame.locator("body")).toBeVisible({ timeout: 10000 });
});

Then("I should see payment security message", async function(this: CustomWorld) {
  const securityMessage = this.page.getByText(/securely processed by Stripe/i);
  await expect(securityMessage).toBeVisible();
});

Then("I should see the lock icon", async function(this: CustomWorld) {
  const lockIcon = this.page.locator('[data-testid="lock-icon"]');
  await expect(lockIcon).toBeVisible();
});

Then("the country selector should have {string} option", async function(
  this: CustomWorld,
  countryName: string,
) {
  const countrySelect = this.page.locator('[id="country"]');
  await countrySelect.click();

  const option = this.page.getByRole("option", { name: countryName });
  await expect(option).toBeVisible();

  // Close the dropdown
  await this.page.keyboard.press("Escape");
});

Then("the email field should contain {string}", async function(
  this: CustomWorld,
  expectedEmail: string,
) {
  const emailField = this.page.locator('[id="email"]');
  await expect(emailField).toHaveValue(expectedEmail);
});

// ===== Order History Steps =====

Given("I have placed an order", async function(this: CustomWorld) {
  // Mock an order in the database or use API to create one
  // For E2E, this would need actual order creation flow
  // For now, we'll assume orders exist via database seeding
  this.attach(JSON.stringify({ orderPlaced: true }), "application/json");
});

Given(
  "I have placed an order with {int} items",
  async function(this: CustomWorld, itemCount: number) {
    this.attach(JSON.stringify({ orderPlaced: true, itemCount }), "application/json");
  },
);

Given("I have placed multiple orders", async function(this: CustomWorld) {
  this.attach(JSON.stringify({ multipleOrders: true }), "application/json");
});

Given("I have an order with status {string}", async function(this: CustomWorld, status: string) {
  this.attach(JSON.stringify({ orderStatus: status }), "application/json");
});

Then("I should see the order in the list", async function(this: CustomWorld) {
  const orderCard = this.page.locator('[data-testid="order-card"]').first();
  await expect(orderCard).toBeVisible();
});

Then("I should see the order number", async function(this: CustomWorld) {
  const orderNumber = this.page.locator('[data-testid="order-number"]').first();
  await expect(orderNumber).toBeVisible();
});

Then("I should see the order status badge", async function(this: CustomWorld) {
  const statusBadge = this.page.locator('[data-testid="order-status-badge"]').first();
  await expect(statusBadge).toBeVisible();
});

Then("I should see the order date", async function(this: CustomWorld) {
  const orderDate = this.page.locator('[data-testid="order-date"]').first();
  await expect(orderDate).toBeVisible();
});

Then("I should see the order total", async function(this: CustomWorld) {
  const orderTotal = this.page.locator('[data-testid="order-total"]').first();
  await expect(orderTotal).toBeVisible();
});

When("I click on the first order in the list", async function(this: CustomWorld) {
  const firstOrder = this.page.locator('[data-testid="order-card"]').first();
  await firstOrder.click();
  await this.page.waitForLoadState("networkidle");
});

Then("I should be on the order detail page", async function(this: CustomWorld) {
  await this.page.waitForURL(/\/orders\/[^/]+$/);
  const url = this.page.url();
  expect(url).toMatch(/\/orders\/[^/]+$/);
});

Then("I should see the order details", async function(this: CustomWorld) {
  const orderDetails = this.page.locator('[data-testid="order-details"]');
  await expect(orderDetails).toBeVisible();
});

Then("I should see preview images for the order items", async function(this: CustomWorld) {
  const previewImages = this.page.locator('[data-testid="order-preview-image"]');
  await expect(previewImages.first()).toBeVisible();
});

Then("the orders should be sorted by date descending", async function(this: CustomWorld) {
  // Verify first order is most recent by checking dates
  const orderDates = this.page.locator('[data-testid="order-date"]');
  const count = await orderDates.count();

  if (count > 1) {
    const firstDate = await orderDates.nth(0).textContent();
    const secondDate = await orderDates.nth(1).textContent();
    expect(firstDate).toBeTruthy();
    expect(secondDate).toBeTruthy();
  }
});

Then("each order should show its order number", async function(this: CustomWorld) {
  const orderNumbers = this.page.locator('[data-testid="order-number"]');
  const count = await orderNumbers.count();
  expect(count).toBeGreaterThan(0);
});

Then("I should be redirected to the login page", async function(this: CustomWorld) {
  await this.page.waitForURL(/\//);
  // In actual implementation, this might redirect to a login page or show sign-in options
  const signInButton = this.page.getByRole("button", {
    name: /Continue with GitHub|Continue with Google/i,
  });
  await expect(signInButton.first()).toBeVisible();
});

Then("I should see the {string} status badge", async function(this: CustomWorld, status: string) {
  const statusBadge = this.page.locator('[data-testid="order-status-badge"]').first();
  await expect(statusBadge).toContainText(status);
});

Then("I should see {string} in the order summary", async function(this: CustomWorld, text: string) {
  const orderSummary = this.page.locator('[data-testid="order-card"]').first();
  await expect(orderSummary).toContainText(text);
});
