import React from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center h-[42px] px-4 rounded-lg text-[14px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#D5A253] disabled:opacity-60 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-[#1B1B1B] text-white hover:bg-[#2B2B2B]",
  secondary:
    "bg-[#FFF6E8] text-[#1B1B1B] border border-[#D5A253] hover:bg-[#FBEFDA]",
  ghost:
    "bg-transparent text-[#1B1B1B] hover:bg-[#F5F5F5] border border-transparent",
  danger:
    "bg-white text-[#D32F2F] border border-[#E57373] hover:bg-[#FFF0F0]",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  fullWidth,
  className,
  children,
  ...rest
}) => {
  return (
    <button
      className={clsx(
        base,
        variants[variant],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
};
