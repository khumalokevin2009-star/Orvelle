import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Orvelle",
  description: "How Orvelle collects, uses, and protects demo request and website information."
};

const sections = [
  {
    title: "Who we are",
    content: (
      <>
        <p>
          Orvelle is an early-stage software business building tools that help service businesses identify missed
          revenue from inbound calls and follow up more effectively.
        </p>
        <p>
          This policy applies to the public Orvelle website, our demo request flow, and communications you receive from
          us after contacting us.
        </p>
      </>
    )
  },
  {
    title: "What information we collect",
    content: (
      <>
        <p>When you request a demo, we collect the details you provide to us directly:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Name</li>
          <li>Work email address</li>
          <li>Company name</li>
          <li>Monthly call volume, if you choose to provide it</li>
        </ul>
        <p>
          We may also receive basic website usage information if analytics, logs, or similar monitoring tools are
          enabled on the site.
        </p>
      </>
    )
  },
  {
    title: "How we use your information",
    content: (
      <>
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Respond to demo requests and follow up with you</li>
          <li>Understand whether Orvelle is a fit for your business</li>
          <li>Schedule conversations and provide product information</li>
          <li>Improve the website, messaging, and demo process</li>
          <li>Protect the site from misuse, spam, or abuse</li>
        </ul>
      </>
    )
  },
  {
    title: "Legal basis and reasons for processing",
    content: (
      <>
        <p>
          We process demo request data because it is necessary to respond to your enquiry and because we have a
          legitimate business interest in marketing, operating, and improving Orvelle.
        </p>
        <p>
          Where applicable, we also rely on your consent when you voluntarily submit information through our forms or
          choose to continue speaking with us about the product.
        </p>
      </>
    )
  },
  {
    title: "Who we share it with",
    content: (
      <>
        <p>We do not sell your personal information.</p>
        <p>We may share it with service providers that help us operate the website and respond to enquiries, such as:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Form providers used to receive demo requests</li>
          <li>Hosting, infrastructure, and analytics vendors</li>
          <li>Professional advisers where reasonably necessary</li>
        </ul>
        <p>We may also disclose information if required to comply with law, regulation, or a valid legal request.</p>
      </>
    )
  },
  {
    title: "How long we keep it",
    content: (
      <>
        <p>
          We keep demo request information for as long as it is reasonably necessary to respond to your enquiry,
          evaluate a potential commercial relationship, and maintain a record of business communications.
        </p>
        <p>
          In most cases, we expect to keep demo request records for up to 24 months unless a longer period is needed
          for legal, security, or contractual reasons.
        </p>
      </>
    )
  },
  {
    title: "Data security",
    content: (
      <>
        <p>
          We use reasonable administrative, technical, and organizational measures to protect personal information,
          including access controls and reputable third-party infrastructure providers.
        </p>
        <p>No system is completely risk free, so we cannot guarantee absolute security.</p>
      </>
    )
  },
  {
    title: "Your rights",
    content: (
      <>
        <p>
          Depending on where you are located, you may have the right to request access to your personal information,
          correct it, delete it, object to certain processing, or ask for processing to be restricted.
        </p>
        <p>
          To make a request, contact us using the details below. You may also have the right to complain to your local
          data protection authority.
        </p>
      </>
    )
  },
  {
    title: "Contact information",
    content: (
      <>
        <p>
          If you have any privacy questions or want to make a data request, contact us at{" "}
          <Link href="mailto:access@revenueops.io" className="font-medium text-[var(--accent)] no-underline hover:underline">
            access@revenueops.io
          </Link>
          .
        </p>
      </>
    )
  },
  {
    title: "Updates to this policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time as the product, website, or our legal obligations change.
        </p>
        <p>When we make material updates, we will update the effective date at the top of this page.</p>
      </>
    )
  }
] as const;

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy Policy"
      title="How Orvelle handles your information"
      description="This policy explains what information we collect through the website and demo request flow, how we use it, and what choices you have."
      lastUpdated="31 March 2026"
      sections={[...sections]}
    />
  );
}
