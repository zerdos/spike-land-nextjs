import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, emailStyles } from "./base";

interface TokenPurchaseEmailProps {
  userName?: string;
  userEmail: string;
  tokensAmount: number;
  packageName: string;
  amountPaid: string;
  transactionId: string;
  newBalance: number;
}

export function TokenPurchaseEmail({
  userName,
  userEmail,
  tokensAmount,
  packageName,
  amountPaid,
  transactionId,
  newBalance,
}: TokenPurchaseEmailProps) {
  const displayName = userName || userEmail.split("@")[0];

  return (
    <BaseEmail
      preview={`Token purchase confirmed - ${tokensAmount} tokens added to your account`}
      heading="Purchase Successful!"
    >
      <Text style={emailStyles.text}>Hi {displayName},</Text>

      <Text style={emailStyles.text}>
        Thank you for your purchase! Your tokens have been added to your account.
      </Text>

      <Section style={emailStyles.success}>
        <Text style={emailStyles.successText}>
          <strong>+{tokensAmount} tokens</strong> added to your account
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          padding: "24px",
          margin: "24px 0",
        }}
      >
        <Text style={{ ...emailStyles.text, margin: "8px 0" }}>
          <strong>Package:</strong> {packageName}
        </Text>
        <Text style={{ ...emailStyles.text, margin: "8px 0" }}>
          <strong>Tokens:</strong> {tokensAmount}
        </Text>
        <Text style={{ ...emailStyles.text, margin: "8px 0" }}>
          <strong>Amount Paid:</strong> {amountPaid}
        </Text>
        <Text style={{ ...emailStyles.text, margin: "8px 0" }}>
          <strong>Transaction ID:</strong> <code style={emailStyles.code}>{transactionId}</code>
        </Text>
        <div style={emailStyles.divider} />
        <Text style={{ ...emailStyles.text, margin: "8px 0" }}>
          <strong>New Balance:</strong> {newBalance} tokens
        </Text>
      </Section>

      <Text style={emailStyles.text}>
        You can now use your tokens to enhance more images. Each enhancement uses 1-5 tokens
        depending on the output quality you choose.
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "32px 0" }}>
        <Link href="https://spike.land/dashboard" style={emailStyles.button}>
          Start Enhancing
        </Link>
      </Section>

      <Text style={emailStyles.text}>
        Need a receipt? You can download it from your{" "}
        <Link href="https://spike.land/account/billing" style={emailStyles.link}>
          billing history
        </Link>
        .
      </Text>

      <Text style={emailStyles.text}>
        Thank you for supporting Spike Land!
        <br />
        The Spike Land Team
      </Text>
    </BaseEmail>
  );
}
