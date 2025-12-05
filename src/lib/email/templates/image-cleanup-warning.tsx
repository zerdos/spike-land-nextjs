import { Link, Section, Text } from "@react-email/components";
import { BaseEmail, emailStyles } from "./base";

interface ImageCleanupWarningEmailProps {
  userName?: string;
  userEmail: string;
  imageCount: number;
  deletionDate: string;
  unsubscribeUrl?: string;
}

export function ImageCleanupWarningEmail({
  userName,
  userEmail,
  imageCount,
  deletionDate,
  unsubscribeUrl,
}: ImageCleanupWarningEmailProps) {
  const displayName = userName || userEmail.split("@")[0];

  return (
    <BaseEmail
      preview={`Important: ${imageCount} image${
        imageCount !== 1 ? "s" : ""
      } will be deleted on ${deletionDate}`}
      heading="Image Retention Reminder"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={emailStyles.text}>Hi {displayName},</Text>

      <Text style={emailStyles.text}>
        This is an important reminder about our 90-day image retention policy.
      </Text>

      <Section style={emailStyles.alert}>
        <Text style={emailStyles.alertText}>
          <strong>{imageCount} image{imageCount !== 1 ? "s" : ""}</strong> in your account{" "}
          {imageCount !== 1 ? "are" : "is"} scheduled for automatic deletion on{" "}
          <strong>{deletionDate}</strong>.
        </Text>
      </Section>

      <Text style={emailStyles.text}>
        <strong>Why are images deleted?</strong>
      </Text>

      <Text style={emailStyles.text}>
        To manage storage costs and maintain platform performance, we automatically remove images
        that are older than 90 days. This helps us keep the service affordable and fast for all
        users.
      </Text>

      <Text style={emailStyles.text}>
        <strong>What should you do?</strong>
      </Text>

      <Section
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          padding: "24px",
          margin: "24px 0",
        }}
      >
        <Text style={{ ...emailStyles.text, margin: "8px 0" }}>
          📥 <strong>Download your images</strong> - Save them to your device before {deletionDate}
        </Text>
        <Text style={{ ...emailStyles.text, margin: "8px 0" }}>
          ♻️ <strong>Re-enhance if needed</strong> - You can always upload and enhance images again
        </Text>
        <Text style={{ ...emailStyles.text, margin: "8px 0" }}>
          💾 <strong>Use your own storage</strong>{" "}
          - Consider backing up enhanced images to your preferred cloud storage
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, margin: "32px 0" }}>
        <Link href="https://spike.land/images" style={emailStyles.button}>
          View My Images
        </Link>
      </Section>

      <Text style={emailStyles.text}>
        <strong>After deletion:</strong>
      </Text>

      <Text style={emailStyles.text}>
        Once images are deleted, they cannot be recovered. However, you can always upload and
        enhance them again if you have the original files.
      </Text>

      <Text style={emailStyles.text}>
        Need help downloading your images?{" "}
        <Link href="https://spike.land/support" style={emailStyles.link}>
          Contact our support team
        </Link>
        .
      </Text>

      <Text style={emailStyles.text}>
        Best regards,
        <br />
        The Spike Land Team
      </Text>
    </BaseEmail>
  );
}
