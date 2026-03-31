"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronDownIcon, LinkIcon } from "@/components/icons";
import {
  dateRangeOptions,
  getDateRangeLabel,
  type DateRangeKey
} from "@/lib/analysis-window";

export { dateRangeOptions, getDateRangeLabel };
export type { DateRangeKey };

type DashboardHeaderProps = {
  selectedRange: DateRangeKey;
  summaryItems: string[];
  onSelectRange: (range: DateRangeKey) => void;
  onCopyLink: () => void;
};

export function DashboardHeader({
  selectedRange,
  summaryItems,
  onSelectRange,
  onCopyLink
}: DashboardHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="motion-fade-up flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="pt-1">
        <h1 className="type-page-title text-[30px] sm:text-[32px]">
          Call Performance Overview
        </h1>
        <p className="type-body-text mt-2 max-w-[720px] text-[15px]">
          Monitoring conversion failures and revenue leakage across inbound call activity
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {summaryItems.map((item) => (
            <div
              key={item}
              className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-[13px] font-medium text-[#374151]"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 self-start">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-sm font-semibold text-[#111827] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            <CalendarIcon className="h-[18px] w-[18px] text-[#6B7280]" />
            <span>{getDateRangeLabel(selectedRange)}</span>
            <ChevronDownIcon
              className={`h-4 w-4 text-[#6B7280] transition ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isOpen ? (
            <div
              role="menu"
              aria-label="Select analysis window"
              className="absolute right-0 top-[calc(100%+0.55rem)] z-30 min-w-[176px] rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] p-2 shadow-[0_16px_36px_rgba(17,24,39,0.08)]"
            >
              {dateRangeOptions.map((option) => {
                const isActive = option.key === selectedRange;

                return (
                  <button
                    key={option.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => {
                      onSelectRange(option.key);
                      setIsOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium transition hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      isActive ? "bg-[#F9FAFB] text-[#111827]" : "text-[#6B7280]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isActive ? <span className="text-[12px] font-semibold text-[#2563EB]">Active</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:text-[#111827] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          aria-label="Copy overview link"
        >
          <LinkIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
