import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "warning" | "success";
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  ...props
}) => {
  const variants = {
    default: "border-transparent bg-secondary text-secondary-foreground",
    destructive:
      "border-transparent bg-destructive/20 text-destructive dark:font-semibold",
    warning: "border-transparent bg-warning/20 text-warning-foreground",
    success:
      "border-transparent bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  };

  const badgeClasses = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
    variants[variant]
  } ${className || ""}`;

  return <div className={badgeClasses} {...props} />;
};

export default Badge;
