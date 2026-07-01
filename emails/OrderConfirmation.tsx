import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link
} from "@react-email/components";
import * as React from "react";

interface OrderConfirmationEmailProps {
  customerName?: string;
  orderNumber: string;
  formattedTotal: string;
  paymentMethod: string;
  trackingUrl?: string;
}

export const OrderConfirmationEmail = ({
  customerName = "Valued Customer",
  orderNumber,
  formattedTotal,
  paymentMethod,
  trackingUrl
}: OrderConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Hearts & Beans order #{orderNumber} is confirmed! 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Brand Header */}
          <Section style={headerSection}>
            <Heading style={logo}>HEARTS & BEANS</Heading>
            <Text style={tagline}>Your memories, beautifully printed.</Text>
          </Section>

          <Hr style={divider} />

          {/* Letter Body */}
          <Section style={contentSection}>
            <Heading style={headingStyle}>
              Order Confirmed
            </Heading>
            
            <Text style={paragraph}>Hello {customerName},</Text>
            <Text style={paragraph}>
              Thank you for choosing Hearts & Beans. We have received your order, and our editorial design team is already preparing to craft your custom premium magazine.
            </Text>

            {/* Structured Transaction Box */}
            <Section style={summaryBox}>
              <Text style={summaryTitle}>ORDER DETAILS</Text>
              <Text style={summaryText}><strong>Order Number:</strong> #{orderNumber}</Text>
              <Text style={summaryText}><strong>Amount Paid:</strong> {formattedTotal}</Text>
              <Text style={summaryText}><strong>Payment Mode:</strong> {paymentMethod}</Text>
            </Section>

            {trackingUrl && (
              <Section style={btnContainer}>
                <Link href={trackingUrl} style={button}>
                  TRACK YOUR ORDER
                </Link>
              </Section>
            )}

            <Text style={paragraph}>
              We will keep you updated via WhatsApp notifications as your memories move through designing, printing, and dispatch stages.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Support and Copyright Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Need immediate help or want to make a revision? Drop us an email at support@heartsandbeans.in or message us on WhatsApp.
            </Text>
            <Text style={copyright}>
              © {new Date().getFullYear()} Hearts & Beans. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;

// Design Style Objects (Strict Editorial Brand Specifications)
const main = {
  backgroundColor: "#FAFAF8",
  fontFamily: "Georgia, serif, -apple-system, sans-serif",
  padding: "40px 0"
};

const container = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E8E4DC",
  padding: "40px",
  maxWidth: "580px",
  margin: "0 auto"
};

const headerSection = {
  textAlign: "left" as const,
  marginBottom: "20px"
};

const logo = {
  color: "#0A0A0A",
  fontSize: "24px",
  fontWeight: "900",
  letterSpacing: "2px",
  margin: "0",
  textTransform: "uppercase" as const
};

const tagline = {
  color: "#5C5750",
  fontSize: "12px",
  fontStyle: "italic",
  margin: "4px 0 0 0"
};

const divider = {
  borderColor: "#E8E4DC",
  margin: "30px 0"
};

const contentSection = {
  padding: "10px 0"
};

const headingStyle = {
  color: "#0A0A0A",
  fontSize: "26px",
  fontWeight: "bold",
  margin: "0 0 20px 0"
};

const paragraph = {
  color: "#5C5750",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px 0"
};

const summaryBox = {
  border: "1px solid #E8E4DC",
  backgroundColor: "#FAFAF8",
  padding: "20px",
  margin: "24px 0"
};

const summaryTitle = {
  color: "#C1440E",
  fontSize: "11px",
  fontWeight: "bold",
  letterSpacing: "1px",
  margin: "0 0 12px 0",
  textTransform: "uppercase" as const
};

const summaryText = {
  color: "#0A0A0A",
  fontSize: "13px",
  margin: "0 0 8px 0",
  lineHeight: "18px"
};

const btnContainer = {
  margin: "24px 0 30px 0"
};

const button = {
  backgroundColor: "#C1440E",
  color: "#FFFFFF",
  fontSize: "12px",
  fontWeight: "bold",
  letterSpacing: "1px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  // STRICT SHARP BORDERS (Zero Rounding, Ever)
  borderRadius: "0px"
};

const footerSection = {
  textAlign: "center" as const
};

const footerText = {
  color: "#9C9585",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 12px 0"
};

const copyright = {
  color: "#9C9585",
  fontSize: "10px",
  margin: "0"
};