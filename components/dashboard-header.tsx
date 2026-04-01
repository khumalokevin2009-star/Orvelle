"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        dropdownRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
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

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    function updateMenuPosition() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const width = Math.min(Math.max(rect.width, 176), Math.max(viewportWidth - 24, 176));
      const left = Math.max(12, Math.min(rect.right - width, viewportWidth - width - 12));
      const top = rect.bottom + 9;

      setMenuPosition({ top, left, width });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  return (
    <div className="motion-fade-up relative z-20 flex flex-col gap-4 overflow-visible sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="pt-1">
        <h1 className="type-page-title text-[28px] sm:text-[32px]">
          Revenue Recovery Overview
        </h1>
        <p className="type-body-text mt-2 max-w-[720px] text-[15px]">
          A structured operating view of missed revenue, recovery performance, and the next calls your team should act on.
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

      <div className="relative z-30 flex w-full flex-wrap items-center justify-between gap-3 self-start sm:w-auto sm:flex-nowrap sm:justify-start">
        <div className="relative z-40" ref={dropdownRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="inline-flex h-11 min-w-[0] cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-sm font-semibold text-[#111827] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] sm:justify-start"
          >
            <CalendarIcon className="h-[18px] w-[18px] text-[#6B7280]" />
            <span>{getDateRangeLabel(selectedRange)}</span>
            <ChevronDownIcon
              className={`h-4 w-4 text-[#6B7280] transition ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
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

      {isOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Select analysis window"
              className="fixed z-[140] rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] p-2 shadow-[0_16px_36px_rgba(17,24,39,0.08)]"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width
              }}
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
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
