import React from 'react';

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ children, className, ...props }) => {
  const baseClasses = "absolute bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-100 z-[30] animate-fadeIn";

  return (
    <button className={`${baseClasses} ${className || ''}`} {...props}>
      {children}
    </button>
  );
};

export default FloatingActionButton;