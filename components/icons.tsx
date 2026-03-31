import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function LogoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        d="M16 5.333c-4.97 0-9 3.95-9 8.822 0 2.58 1.13 5.125 3.1 6.98l4.87 4.586a1.5 1.5 0 0 0 2.06 0l4.87-4.586c1.97-1.855 3.1-4.4 3.1-6.98 0-4.871-4.03-8.822-9-8.822Z"
        fill="#2D8CFF"
      />
      <circle cx="22.8" cy="7.9" r="5.2" fill="#4AA3FF" />
      <path d="M22.8 5.3v4.5M25.05 7.55h-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="M8 12h8M12 8v8" opacity="0.55" />
    </svg>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M5 8l7 5 7-5" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="6" cy="6" r="1.7" />
      <circle cx="12" cy="6" r="1.7" />
      <circle cx="18" cy="6" r="1.7" />
      <circle cx="6" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18" cy="12" r="1.7" />
      <circle cx="6" cy="18" r="1.7" />
      <circle cx="12" cy="18" r="1.7" />
      <circle cx="18" cy="18" r="1.7" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path d="M8 12.1 12.1 8" strokeLinecap="round" />
      <path d="M6.6 8.2 5.1 9.7a2.7 2.7 0 0 0 3.82 3.82l1.51-1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13.4 11.8 1.5-1.5a2.7 2.7 0 1 0-3.82-3.82L9.57 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <rect x="3.8" y="4.8" width="12.4" height="11.4" rx="2.4" />
      <path
        d="M6.5 3.8v2M13.5 3.8v2M3.8 8.1h12.4M7.3 10.6h.01M10 10.6h.01M12.7 10.6h.01M7.3 13.2h.01M10 13.2h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchFlagIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props}>
      <path d="M5.5 15V5.2A1.2 1.2 0 0 1 6.7 4h5.35l-1 2 1 2H6.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.2 5.7a.8.8 0 0 1 1.2-.69l6.48 4.02a.8.8 0 0 1 0 1.38L8.4 14.45a.8.8 0 0 1-1.2-.68V5.7Z" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="4" cy="10" r="1.2" />
      <circle cx="10" cy="10" r="1.2" />
      <circle cx="16" cy="10" r="1.2" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path d="M7 10.2 13 6.8M7 9.8 13 13.2" strokeLinecap="round" />
      <circle cx="5.2" cy="10" r="1.8" />
      <circle cx="14.8" cy="6" r="1.8" />
      <circle cx="14.8" cy="14" r="1.8" />
    </svg>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path d="M5 4.5h8l2 2v9A1.5 1.5 0 0 1 13.5 17h-8A1.5 1.5 0 0 1 4 15.5V6a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M7 4.5v4h6v-4M7.2 14h5.6" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="2.5" />
      <path
        d="M10 3.7v1.5M10 14.8v1.5M15.33 5.89l-1.05 1.05M5.72 14.5l-1.05 1.05M16.3 10h-1.5M5.2 10H3.7M15.33 14.11l-1.05-1.05M5.72 5.5 4.67 4.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path d="M10 4.5v7" strokeLinecap="round" />
      <path d="m7.5 9.5 2.5 2.8 2.5-2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15.5h10" strokeLinecap="round" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path d="M10 15.5v-7" strokeLinecap="round" />
      <path d="m7.5 8.5 2.5-2.8 2.5 2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15.5h10" strokeLinecap="round" />
    </svg>
  );
}

export function AudioFileIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path d="M6 3.8h5.5L15 7.3v8.9A1.3 1.3 0 0 1 13.7 17.5H6.3A1.3 1.3 0 0 1 5 16.2V5.1A1.3 1.3 0 0 1 6.3 3.8H6Z" />
      <path d="M11.5 3.8v3.7H15" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.7 9.4v3.4a1.35 1.35 0 1 1-.9-1.27" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.7 9.5 12.4 9v2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path d="M4.8 5.6h10.4" strokeLinecap="round" />
      <path d="M7.2 5.6v-.8A1.3 1.3 0 0 1 8.5 3.5h3a1.3 1.3 0 0 1 1.3 1.3v.8" />
      <path d="m6.1 5.6.6 9a1.2 1.2 0 0 0 1.2 1.1h4.2a1.2 1.2 0 0 0 1.2-1.1l.6-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.4 8.5v4.5M11.6 8.5v4.5" strokeLinecap="round" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props}>
      <path d="m10.9 3.8-4 6.1h3.1l-1 6.3 4-6.3H9.9l1-6.1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path d="M4.5 15.5h11" strokeLinecap="round" />
      <path d="M6.5 13v-3.5M10 13V6.5M13.5 13V9" strokeLinecap="round" />
    </svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <circle cx="10" cy="7" r="2.8" />
      <path d="M5.6 15c.9-2.3 2.4-3.4 4.4-3.4S13.5 12.7 14.4 15" strokeLinecap="round" />
    </svg>
  );
}

export function MailMiniIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <rect x="3" y="4" width="12" height="10" rx="2" />
      <path d="m4 6 5 4 5-4" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="3.1" />
      <path
        d="M10 2.9v2.1M10 15v2.1M4.98 4.98l1.48 1.48M13.54 13.54l1.48 1.48M2.9 10H5M15 10h2.1M4.98 15.02l1.48-1.48M13.54 6.46l1.48-1.48"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
      <path
        d="M13.8 13.96A6.3 6.3 0 0 1 6.04 6.2a6.3 6.3 0 1 0 7.76 7.76Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
