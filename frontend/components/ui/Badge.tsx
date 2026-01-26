import React from "react";

type BadgeVariant =
  | "neutral"
  | "freeItem"
  | "discount"
  | "promotion"
  | "featured"
  | "statusActive"
  | "statusInactive"
  // Legacy variants
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const base = "inline-flex items-center h-[22px] px-2.5 rounded-full text-xs font-semibold transition-all duration-100";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200",
  freeItem: "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200",
  discount: "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200",
  promotion: "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200",
  featured: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-300 shadow-sm",
  statusActive: "",
  statusInactive: "",
  // Legacy
  default: "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border border-gray-200",
  primary: "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200",
  success: "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200",
  warning: "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200",
  danger: "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200",
  info: "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200",
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  variant = "neutral",
  className = "",
}) => {
  const content = label || children;

  if (variant === "statusActive" || variant === "statusInactive") {
    const isActive = variant === "statusActive";
    return (
      <span className={`inline-flex items-center text-sm font-semibold ${className}`}>
        <span
          className={`inline-block w-2 h-2 rounded-full mr-2 transition-all duration-100 ${
            isActive ? "bg-green-500 shadow-sm shadow-green-300" : "bg-gray-300"
          }`}
        />
        <span className={isActive ? "text-gray-900" : "text-gray-500"}>
          {content}
        </span>
      </span>
    );
  }

  return (
    <span className={`${base} ${variantClasses[variant]} ${className}`}>
      {content}
    </span>
  );
};

// Default export for backwards compatibility
export default Badge;
