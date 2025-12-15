import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { TokenPurchaseEmail } from "./token-purchase";

describe("TokenPurchaseEmail", () => {
  const defaultProps = {
    userName: "John Doe",
    userEmail: "john@example.com",
    tokensAmount: 50,
    packageName: "Basic Pack",
    amountPaid: "£9.99",
    transactionId: "txn_1234567890",
    newBalance: 75,
  };

  it("render purchase confirmation with user name", async () => {
    const html = await render(<TokenPurchaseEmail {...defaultProps} />);

    expect(html).toContain("Hi");
    expect(html).toContain("John Doe");
    expect(html).toContain("Purchase Successful!");
  });

  it("use email username when name is not provided", async () => {
    const html = await render(
      <TokenPurchaseEmail
        {...defaultProps}
        userName={undefined}
        userEmail="jane.smith@example.com"
      />,
    );

    expect(html).toContain("Hi");
    expect(html).toContain("jane.smith");
  });

  it("display tokens added message", async () => {
    const html = await render(<TokenPurchaseEmail {...defaultProps} />);

    expect(html).toContain("+");
    expect(html).toContain("50");
    expect(html).toContain("tokens");
    expect(html).toContain("added to your account");
  });

  it("display purchase details", async () => {
    const html = await render(<TokenPurchaseEmail {...defaultProps} />);

    expect(html).toContain("Basic Pack");
    expect(html).toContain("50");
    expect(html).toContain("£9.99");
    expect(html).toContain("txn_1234567890");
  });

  it("display new token balance", async () => {
    const html = await render(<TokenPurchaseEmail {...defaultProps} />);

    expect(html).toContain("New Balance");
    expect(html).toContain("75");
    expect(html).toContain("tokens");
  });

  it("include call-to-action button", async () => {
    const html = await render(<TokenPurchaseEmail {...defaultProps} />);

    expect(html).toContain("Start Enhancing");
    expect(html).toContain("https://spike.land/dashboard");
  });

  it("include billing history link", async () => {
    const html = await render(<TokenPurchaseEmail {...defaultProps} />);

    expect(html).toContain("billing history");
    expect(html).toContain("https://spike.land/account/billing");
  });

  it("include token usage information", async () => {
    const html = await render(<TokenPurchaseEmail {...defaultProps} />);

    expect(html).toContain("Each enhancement uses 1-5 tokens");
  });

  it("include thank you message", async () => {
    const html = await render(<TokenPurchaseEmail {...defaultProps} />);

    expect(html).toContain("Thank you for supporting Spike Land!");
    expect(html).toContain("The Spike Land Team");
  });

  it("handle large token amounts", async () => {
    const html = await render(
      <TokenPurchaseEmail
        {...defaultProps}
        tokensAmount={500}
        newBalance={650}
      />,
    );

    expect(html).toContain("+");
    expect(html).toContain("500");
    expect(html).toContain("650");
    expect(html).toContain("tokens");
  });

  it("handle different currency formats", async () => {
    const html = await render(
      <TokenPurchaseEmail {...defaultProps} amountPaid="$12.99" />,
    );

    expect(html).toContain("$12.99");
  });
});
