import "server-only";

import { db } from "@/server/db/client";

export type LegalDocumentSlug = "privacy-policy" | "terms" | "shipping" | "refunds";

export type LegalDocumentDefinition = {
  slug: LegalDocumentSlug;
  route: string;
  title: string;
  headingLead: string;
  headingAccent: string;
  description: string;
  fallbackBody: string;
};

export const LEGAL_DOCUMENTS: LegalDocumentDefinition[] = [
  {
    slug: "privacy-policy",
    route: "/privacy",
    title: "Privacy Policy",
    headingLead: "Privacy",
    headingAccent: "Policy",
    description: "Review our data protection guidelines and secure file storage guarantees.",
    fallbackBody: `
      <h2>1. Information We Collect</h2>
      <p>We collect the details needed to design, print, ship, and support your custom magazine order. This can include your name, email, phone number, shipping address, order notes, uploaded photographs, and payment confirmation metadata.</p>
      <h2>2. Photograph Storage</h2>
      <p>Your uploaded photographs are used only to create your magazine. Files are stored in private media storage and are removed according to the completed-order retention window configured by the store team.</p>
      <h2>3. Payment Safety</h2>
      <p>Online payments are processed through our payment gateway. Hearts &amp; Beans does not store card, UPI, netbanking, or wallet credentials on its servers.</p>
      <h2>4. Communication</h2>
      <p>We use your email and phone number for order confirmations, verification codes, design updates, payment alerts, and delivery communication.</p>
      <h2>5. Contact</h2>
      <p>For privacy questions or deletion requests, contact the Hearts &amp; Beans support team through the contact details listed on the storefront.</p>
    `
  },
  {
    slug: "terms",
    route: "/terms",
    title: "Terms & Conditions",
    headingLead: "Terms of",
    headingAccent: "Service",
    description: "Review our terms of service, custom print copy boundaries, and service governance guidelines.",
    fallbackBody: `
      <h2>1. Acceptance of Terms</h2>
      <p>By using Hearts &amp; Beans, uploading photographs, or placing an order, you agree to these terms and to the policies linked from the storefront.</p>
      <h2>2. Customer Content</h2>
      <p>You confirm that you own or have permission to print every image and piece of text submitted for your magazine. You remain responsible for the legality and quality of submitted content.</p>
      <h2>3. Print Quality</h2>
      <p>Our team prepares each layout with care, but low-resolution, blurry, cropped, or compressed source photos may affect the final printed result.</p>
      <h2>4. Payments</h2>
      <p>Order totals, shipping fees, online payments, cash on delivery, and partial payment options are calculated at checkout according to active store settings.</p>
      <h2>5. Governing Law</h2>
      <p>These terms are governed by the laws of India unless a mandatory local law says otherwise.</p>
    `
  },
  {
    slug: "shipping",
    route: "/shipping",
    title: "Shipping & Delivery Policy",
    headingLead: "Shipping &",
    headingAccent: "Logistics",
    description: "Review our shipping rates, delivery timelines, and logistics carrier partnerships across India.",
    fallbackBody: `
      <h2>1. Shipping Coverage</h2>
      <p>Hearts &amp; Beans ships custom magazines across serviceable Indian pincodes through trusted courier partners.</p>
      <h2>2. Production Timeline</h2>
      <p>Each order requires design, review, printing, binding, and packing time before dispatch. Estimated delivery dates are shown during checkout and order tracking.</p>
      <h2>3. Transit Timeline</h2>
      <p>Transit timelines vary by destination, courier capacity, weather, holidays, and local delivery conditions.</p>
      <h2>4. Shipping Fees</h2>
      <p>Shipping fees and free-shipping thresholds are managed by the admin team and applied automatically during checkout.</p>
    `
  },
  {
    slug: "refunds",
    route: "/refunds",
    title: "Refund & Cancellation Policy",
    headingLead: "Refunds &",
    headingAccent: "Cancellations",
    description: "Review our custom magazine printing refund, replacement, and cancellation guidelines.",
    fallbackBody: `
      <h2>1. Custom Product Policy</h2>
      <p>Every magazine is custom-made from customer-provided photographs and copy. Because of this, completed custom orders cannot be returned for general change of mind.</p>
      <h2>2. Cancellation Window</h2>
      <p>Cancellation requests must be raised before the order enters design, printing, or binding. Once production starts, cancellation may no longer be possible.</p>
      <h2>3. Damage or Misprint</h2>
      <p>If your order arrives damaged or contains a verified manufacturing issue, contact support with photos or an unboxing video so the team can review replacement eligibility.</p>
      <h2>4. Refund Settlement</h2>
      <p>Approved refunds are processed back through the original payment method according to payment gateway and bank timelines.</p>
    `
  }
];

const ALLOWED_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "div",
  "em",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "b",
  "u",
  "ul"
]);

export async function getLegalDocument(definition: LegalDocumentDefinition) {
  const document = await db.document.findUnique({
    where: { slug: definition.slug }
  });

  const body = document?.isActive && document.body.trim().length > 0
    ? document.body
    : definition.fallbackBody;

  return {
    title: document?.title?.trim() || definition.title,
    bodyHtml: sanitizeRichTextHtml(body),
    updatedAt: document?.updatedAt ?? null,
    isPublished: Boolean(document?.isActive)
  };
}

export async function getLegalDocumentEditorRows() {
  const rows = await db.document.findMany({
    where: {
      slug: {
        in: LEGAL_DOCUMENTS.map((document) => document.slug)
      }
    }
  });
  const rowMap = new Map(rows.map((row) => [row.slug, row]));

  return LEGAL_DOCUMENTS.map((definition) => {
    const row = rowMap.get(definition.slug);

    return {
      ...definition,
      documentId: row?.id ?? null,
      editorTitle: row?.title ?? definition.title,
      editorBody: normalizeInitialEditorBody(row?.body ?? definition.fallbackBody),
      isActive: row?.isActive ?? true,
      updatedAt: row?.updatedAt ?? null
    };
  });
}

export async function upsertLegalDocument(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim() as LegalDocumentSlug;
  const definition = LEGAL_DOCUMENTS.find((document) => document.slug === slug);

  if (!definition) {
    throw new Error("Unknown legal document.");
  }

  const title = String(formData.get("title") ?? "").trim() || definition.title;
  const body = sanitizeRichTextHtml(String(formData.get("body") ?? "").trim());
  const isActive = formData.get("isActive") === "true";

  if (stripHtml(body).length === 0) {
    throw new Error(`${definition.title} content cannot be empty.`);
  }

  await db.document.upsert({
    where: { slug },
    update: {
      title,
      body,
      placement: "legal",
      isActive
    },
    create: {
      slug,
      title,
      body,
      placement: "legal",
      isActive
    }
  });
}

export function getLegalDocumentDefinition(slug: LegalDocumentSlug): LegalDocumentDefinition {
  const definition = LEGAL_DOCUMENTS.find((document) => document.slug === slug);

  if (!definition) {
    throw new Error(`Unknown legal document slug: ${slug}`);
  }

  return definition;
}

export function sanitizeRichTextHtml(value: string): string {
  const withoutDangerousBlocks = value
    .replace(/\u0000/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select)[^>]*\/?\s*>/gi, "");

  return withoutDangerousBlocks.replace(/<\s*(\/)?\s*([a-z0-9]+)([^>]*)>/gi, (_match, closing: string | undefined, tagName: string, attributes: string) => {
    const tag = tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (closing) {
      return tag === "br" ? "" : `</${tag}>`;
    }

    if (tag === "br") {
      return "<br>";
    }

    if (tag === "a") {
      const href = getSafeHref(attributes);
      return href ? `<a href="${escapeAttribute(href)}" rel="noopener noreferrer">` : "<a>";
    }

    return `<${tag}>`;
  });
}

function normalizeInitialEditorBody(value: string): string {
  return sanitizeRichTextHtml(value).replace(/\n\s+/g, "\n").trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function getSafeHref(attributes: string): string | null {
  const hrefMatch = attributes.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
  const rawHref = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "").trim();

  if (!rawHref) {
    return null;
  }

  if (rawHref.startsWith("/")) {
    return rawHref.startsWith("//") ? null : rawHref;
  }

  try {
    const parsed = new URL(rawHref);
    return ["https:", "http:", "mailto:", "tel:"].includes(parsed.protocol) ? rawHref : null;
  } catch {
    return null;
  }
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
