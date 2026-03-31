import Link from "next/link";
import type { ReactNode } from "react";
import { LogoIcon } from "@/components/icons";

type LegalSection = {
  title: string;
  content: ReactNode;
};

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalPageShell({
  eyebrow,
  title,
  description,
  lastUpdated,
  sections
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-[#F3F4F6]">
      <header className="border-b border-[var(--border-subtle)] bg-[rgba(247,248,251,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 text-[var(--text-primary)] no-underline">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
              <LogoIcon className="h-7 w-7" />
            </span>
            <div>
              <div className="type-section-title text-[16px]">Orvelle</div>
              <div className="type-body-text text-[12px]">Revenue Recovery OS</div>
            </div>
          </Link>

          <nav className="flex items-center gap-4 text-[14px]">
            <Link href="/" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Home
            </Link>
            <Link href="/privacy" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Privacy
            </Link>
            <Link href="/terms" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <section className="surface-primary px-6 py-7 shadow-[0_18px_55px_rgba(17,24,39,0.06)] sm:px-8 sm:py-9 lg:px-10">
          <div className="max-w-[760px]">
            <div className="type-label-text text-[12px]">{eyebrow}</div>
            <h1 className="type-page-title mt-4 text-[34px] sm:text-[42px]">{title}</h1>
            <p className="type-body-text mt-4 text-[16px]">{description}</p>
            <p className="type-body-text mt-4 text-[13px]">Last updated: {lastUpdated}</p>
          </div>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-[var(--border-subtle)] pt-8 first:border-t-0 first:pt-0">
                <h2 className="type-section-title text-[20px]">{section.title}</h2>
                <div className="type-body-text mt-4 space-y-3 text-[15px] leading-7">{section.content}</div>
              </section>
            ))}
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 text-[14px] sm:flex-row sm:items-center sm:justify-between">
          <p className="type-body-text text-[13px]">Orvelle helps service businesses identify and recover missed call revenue.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
