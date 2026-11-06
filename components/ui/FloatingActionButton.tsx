import React from 'react';

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ children, className, ...props }) => {
  const baseClasses = "absolute bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground border-2 border-foreground shadow-[4px_5px_0_0_hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center transition-all duration-150 hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_3.5px_0_0_hsl(var(--foreground))] active:translate-x-[4px] active:translate-y-[5px] active:shadow-none z-[30] animate-fadeIn";

  return (
    <button className={`${baseClasses} ${className || ''}`} {...props}>
      {children}
    </button>
  );
};

export default FloatingActionButton;