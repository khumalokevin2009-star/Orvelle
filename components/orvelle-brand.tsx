import Image from "next/image";

type OrvelleBrandIconProps = {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
};

type OrvelleWordmarkProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
  theme?: "light" | "dark";
};

export function OrvelleBrandIcon({
  size = 28,
  className = "",
  alt = "Orvelle",
  priority = false
}: OrvelleBrandIconProps) {
  return (
    <Image
      src="/logo-icon.svg"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`h-auto w-auto object-contain ${className}`.trim()}
    />
  );
}

export function OrvelleWordmark({
  className = "",
  alt = "Orvelle",
  priority = false,
  theme = "light"
}: OrvelleWordmarkProps) {
  const themeClass = theme === "dark" ? "brightness-0 invert" : "";

  return (
    <Image
      src="/logo-text.svg"
      alt={alt}
      width={168}
      height={45}
      priority={priority}
      sizes="(max-width: 640px) 112px, 132px"
      className={`h-auto w-[112px] object-contain sm:w-[132px] ${themeClass} ${className}`.trim()}
    />
  );
}
