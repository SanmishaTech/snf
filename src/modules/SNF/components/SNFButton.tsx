import React from "react";
import { Button } from "@/components/ui/button";

export type SNFButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  sizeVariant?: "sm" | "md" | "lg";
};

/**
 * SNFButton standardizes CTA buttons across SNF surfaces.
 * - Consistent sizes, spacing, focus/hover states via shadcn Button
 * - Loading and disabled states with ARIA
 * - Full-width support
 * - Works in light/dark themes via Tailwind tokens
 */
export const SNFButton: React.FC<SNFButtonProps> = ({
  loading,
  disabled,
  fullWidth,
  iconLeft,
  iconRight,
  className = "",
  sizeVariant = "md",
  children,
  ...rest
}) => {
  const sizeClasses =
    sizeVariant === "sm"
      ? "h-9 px-3 text-sm"
      : sizeVariant === "lg"
      ? "h-12 px-6 text-base"
      : "h-10 px-4 text-sm";

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <Button
      className={`${sizeClasses} ${widthClass} inline-flex items-center justify-center gap-2 ${className}`}
      disabled={disabled || loading}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {iconLeft && <span aria-hidden="true">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span aria-hidden="true">{iconRight}</span>}
    </Button>
  );
};

export default SNFButton;