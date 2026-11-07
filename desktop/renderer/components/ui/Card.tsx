import React from "react";

// fix: Update Card component to forward refs, enabling it to be targeted by hooks like useRef.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-2xl border-2 border-foreground bg-card text-card-foreground shadow-[5px_6px_0_0_hsl(var(--foreground))] transition-all duration-200 ${
      className || ""
    }`}
    {...props}
  >
    {children}
  </div>
));
Card.displayName = "Card";

const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
  >
    {children}
  </div>
);

const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h3
    className={`text-xl font-black leading-tight tracking-tight ${
      className || ""
    }`}
  >
    {children}
  </h3>
);

const CardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p className={`text-sm text-muted-foreground ${className || ""}`}>
    {children}
  </p>
);

const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={`p-6 pt-0 ${className || ""}`}>{children}</div>
);

const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={`flex items-center p-6 pt-0 ${className || ""}`}>
    {children}
  </div>
);

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};