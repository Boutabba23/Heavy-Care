import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "adding"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

// Hard offset shadow driven by the theme foreground.
const shadow = "hsl(var(--foreground))";

const Button: React.FC<ButtonProps> = ({
  className,
  variant = "default",
  size = "default",
  ...props
}) => {
  const baseClasses =
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

  // Deco press: solid variants slide down onto their offset shadow.
  // (shadow size shrinks by exactly the translate delta)
  const press =
    "hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";

  const variants = {
    default: `bg-primary text-primary-foreground border-2 border-foreground ${press}`,
    destructive: `bg-destructive text-white border-2 border-foreground ${press}`,
    outline: `border-2 border-foreground bg-card text-foreground hover:bg-muted ${press}`,
    secondary: `bg-secondary text-secondary-foreground border-2 border-foreground ${press}`,
    ghost: "text-foreground hover:bg-muted hover:shadow-[inset_0_0_0_2px_rgba(0,0,0,0.08)]",
    link: "text-primary underline-offset-4 hover:underline",
    adding: `bg-emerald-500 text-white border-2 border-foreground ${press}`,
  };

  // Each solid variant starts from a 3px-3px offset shadow (4px-4px for lg).
  const withShadow =
    size === "lg"
      ? `shadow-[4px_4px_0_0_${shadow}] hover:shadow-[3px_3px_0_0_${shadow}]`
      : `shadow-[3px_3px_0_0_${shadow}] hover:shadow-[2px_2px_0_0_${shadow}]`;

  const needsShadow = variant !== "ghost" && variant !== "link";
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-6",
    icon: "h-10 w-10",
  };

  const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${
    needsShadow ? withShadow : ""
  } ${className || ""}`;

  return <button className={buttonClasses} {...props} />;
};

export default Button;
