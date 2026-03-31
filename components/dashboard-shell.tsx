"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { BoltIcon, DashboardIcon, LogoIcon, SettingsIcon, UploadIcon } from "@/components/icons";

type DashboardShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    href: "/dashboard",
    label: "Call Performance Overview",
    icon: DashboardIcon,
    matches: (pathname: string) => pathname === "/dashboard" || pathname.startsWith("/call/")
  },
  {
    href: "/upload",
    label: "Upload Call Data",
    icon: UploadIcon,
    matches: (pathname: string) => pathname === "/upload"
  },
  {
    href: "/automations",
    label: "Workflow Rules",
    icon: BoltIcon,
    matches: (pathname: string) => pathname === "/automations"
  },
  {
    href: "/settings",
    label: "Configuration",
    icon: SettingsIcon,
    matches: (pathname: string) => pathname === "/settings"
  }
] as const;

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F3F4F6] px-4 py-6 sm:px-6 sm:py-8 xl:px-9">
      <div className="motion-fade-in mx-auto flex w-full max-w-[1460px] overflow-hidden rounded-[30px] border border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_12px_32px_rgba(17,24,39,0.06)]">
        <aside className="flex w-[88px] shrink-0 flex-col items-center border-r border-[#E5E7EB] bg-[#FFFFFF] px-4 py-8 sm:w-[92px] xl:w-[96px]">
          <div className="flex w-full flex-col items-center gap-10">
            <Link
              href="/dashboard"
              className={`relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-[12px] border transition hover:border-[#E5E7EB] hover:bg-[#F9FAFB] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 ${
                pathname === "/dashboard" || pathname.startsWith("/call/")
                  ? "border-[#111827] bg-[#111827] text-white focus-visible:ring-[#2563EB]"
                  : "border-transparent text-[#6B7280] opacity-50 focus-visible:ring-[#2563EB] hover:opacity-100"
              }`}
              aria-label="Call performance overview"
            >
              <LogoIcon className="h-8 w-8" />
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
        </aside>

        <div className="min-w-0 flex-1 px-6 py-7 sm:px-8 sm:py-8 lg:px-10 xl:px-12 xl:py-9">
          {children}
        </div>
      </div>
    </div>
  );
}
