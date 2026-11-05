import React, { useRef, useEffect } from "react";

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

const Popover: React.FC<PopoverProps> = ({
  isOpen,
  onClose,
  trigger,
  children,
  contentClassName,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={popoverRef}>
      {trigger}
      {isOpen && (
        <div
          className={`absolute top-full right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-lg bg-popover text-popover-foreground border border-border z-50 animate-fadeIn ${
            contentClassName || ""
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Popover;
