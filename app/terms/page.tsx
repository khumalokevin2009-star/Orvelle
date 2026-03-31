import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service | Orvelle",
  description: "Simple website terms for using the Orvelle site and submitting demo requests."
};

const sections = [
  {
    title: "Use of the website",
    content: (
      <>
        <p>
          You may use the Orvelle website to learn about the product and request a demo for legitimate business
          purposes.
        </p>
        <p>
          You agree not to misuse the site, interfere with its operation, attempt unauthorized access, or submit false,
          misleading, or harmful information.
        </p>
      </>
    )
  },
  {
    title: "Demo requests",
    content: (
      <>
        <p>
          When you submit a demo request, you agree to provide accurate business contact details so we can evaluate and
          respond to your enquiry.
        </p>
        <p>
          Submitting a demo request does not create a customer relationship, service commitment, or guarantee of access
          to any feature, plan, or timeline.
        </p>
      </>
    )
  },
  {
    title: "Intellectual property",
    content: (
      <>
        <p>
          The Orvelle website, brand, software, copy, graphics, and related materials are owned by Orvelle or its
          licensors and are protected by applicable intellectual property laws.
        </p>
        <p>
          You may not copy, reproduce, distribute, reverse engineer, or create derivative works from the site or
          product materials without prior written permission.
        </p>
      </>
    )
  },
  {
    title: "No warranties",
    content: (
      <>
        <p>
          The website and its content are provided on an “as is” and “as available” basis. We do not promise that the
          website will always be available, error free, or suitable for a particular purpose.
        </p>
      </>
    )
  },
  {
    title: "Limitation of liability",
    content: (
      <>
        <p>
          To the fullest extent permitted by law, Orvelle will not be liable for any indirect, incidental, special, or
          consequential losses arising from your use of the website or reliance on its content.
        </p>
        <p>
          Our total liability in connection with the public website will be limited to the amount you paid us to use
          it, which in most cases is zero.
        </p>
      </>
    )
  },
  {
    title: "Changes to the website or service",
    content: (
      <>
        <p>
          We may update, suspend, or remove parts of the website or product offering at any time, including content,
          workflows, or availability, as Orvelle evolves.
        </p>
        <p>We may also update these Terms from time to time by posting a revised version on this page.</p>
      </>
    )
  },
  {
    title: "Contact information",
    content: (
      <>
        <p>
          Questions about these Terms can be sent to{" "}
          <Link href="mailto:access@revenueops.io" className="font-medium text-[var(--accent)] no-underline hover:underline">
            access@revenueops.io
          </Link>
          .
        </p>
      </>
    )
  }
] as const;

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms of Service"
      title="Terms for using the Orvelle website"
      description="These terms apply to your use of the public Orvelle website and the demo request flow."
      lastUpdated="31 March 2026"
      sections={[...sections]}
    />
  );
}
