"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { BoltIcon, DashboardIcon, LogoutIcon, SettingsIcon, UploadIcon } from "@/components/icons";
import { OrvelleBrandIcon } from "@/components/orvelle-brand";
import { createClient } from "@/lib/supabase/client";

type DashboardShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    href: "/dashboard",
    label: "Call Performance Overview",
    mobileLabel: "Dashboard",
    icon: DashboardIcon,
    matches: (pathname: string) => pathname === "/dashboard" || pathname.startsWith("/call/")
  },
  {
    href: "/upload",
    label: "Upload Call Data",
    mobileLabel: "Upload",
    icon: UploadIcon,
    matches: (pathname: string) => pathname === "/upload"
  },
  {
    href: "/automations",
    label: "Workflow Rules",
    mobileLabel: "Rules",
    icon: BoltIcon,
    matches: (pathname: string) => pathname === "/automations"
  },
  {
    href: "/settings",
    label: "Configuration",
    mobileLabel: "Settings",
    icon: SettingsIcon,
    matches: (pathname: string) =>
      pathname === "/settings" || pathname.startsWith("/settings/")
  }
] as const;

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const activeNavItem = navItems.find(({ matches }) => matches(pathname)) ?? navItems[0];

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] px-3 py-4 sm:px-6 sm:py-8 xl:px-9">
      <div className="motion-fade-in mx-auto flex w-full max-w-[1460px] flex-col overflow-visible rounded-[24px] border border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_12px_32px_rgba(17,24,39,0.06)] lg:flex-row lg:overflow-hidden lg:rounded-[30px]">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#FFFFFF] px-4 py-4 lg:hidden">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3 rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label="Orvelle workspace home"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#E5E7EB] bg-[#F9FAFB] shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
              <OrvelleBrandIcon size={28} priority />
            </span>
            <span className="min-w-0">
              <span className="type-section-title block truncate text-[15px]">Orvelle</span>
              <span className="type-muted-text block text-[12px]">{activeNavItem.mobileLabel}</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="button-secondary-ui inline-flex h-10 w-10 items-center justify-center text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogoutIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <aside className="hidden w-[88px] shrink-0 flex-col items-center justify-between border-r border-[#E5E7EB] bg-[#FFFFFF] px-4 py-8 lg:flex lg:w-[92px] xl:w-[96px]">
          <div className="flex w-full flex-col items-center gap-10">
            <Link
              href="/dashboard"
              className="relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-[14px] border border-[#E5E7EB] bg-[#F9FAFB] shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:border-[#D1D5DB] hover:bg-[#FFFFFF] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              aria-label="Orvelle home"
            >
              <OrvelleBrandIcon size={30} priority />
            </Link>

            <nav className="flex w-full flex-col items-center gap-8">
              {navItems.map(({ href, icon: Icon, label, matches }) => {
                const isActive = matches(pathname);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-[12px] border transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 ${
                      isActive
                        ? "border-[#111827] bg-[#111827] text-white focus-visible:ring-[#2563EB]"
                        : "border-transparent bg-transparent text-[#6B7280] opacity-50 hover:border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#111827] hover:opacity-100 focus-visible:ring-[#2563EB]"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={label}
                  >
                    <Icon className="h-[21px] w-[21px]" />
                  </Link>
                );
              })}
            </nav>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-transparent bg-transparent text-[#6B7280] opacity-50 transition hover:border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#111827] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogoutIcon className="h-[21px] w-[21px]" />
          </button>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-7 sm:pb-24 lg:px-8 lg:py-8 lg:pb-8 xl:px-12 xl:py-9">
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="grid grid-cols-4 gap-1 rounded-[20px] border border-[#E5E7EB] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_20px_40px_rgba(17,24,39,0.12)] backdrop-blur-[18px]">
          {navItems.map(({ href, icon: Icon, label, mobileLabel, matches }) => {
            const isActive = matches(pathname);

            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-2 py-2.5 text-center transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 ${
                  isActive
                    ? "bg-[#111827] text-white focus-visible:ring-[#2563EB]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] focus-visible:ring-[#2563EB]"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="truncate text-[11px] font-semibold tracking-[0.01em]">{mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
