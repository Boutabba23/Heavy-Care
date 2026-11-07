import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "warning" | "success" | "info" | "customInfo";
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  ...props
}) => {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-white",
    warning: "bg-warning/25 text-warning-foreground",
    success:
      "bg-emerald-500 text-white dark:bg-emerald-600 dark:text-white",
    info: "bg-sky-500 text-white dark:bg-sky-600 dark:text-white",
    customInfo:
      "bg-amber-300 text-foreground dark:bg-amber-400 dark:text-foreground",
  };

  const badgeClasses = `inline-flex items-center rounded-full border-2 border-foreground px-2.5 py-0.5 text-xs font-bold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
    variants[variant]
  } ${className || ""}`;

  return <div className={badgeClasses} {...props} />;
};

export default Badge;
