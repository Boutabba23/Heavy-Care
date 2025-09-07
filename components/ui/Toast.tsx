import React, { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "../../constants";
import { Toast as ToastType } from "../../types";

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const icons = {
  success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
  error: <XCircleIcon className="h-6 w-6 text-red-500" />,
  info: <InformationCircleIcon className="h-6 w-6 text-blue-500" />,
  warning: <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />,
};

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const inTimer = setTimeout(() => setIsVisible(true), 10);

    const outTimer = setTimeout(() => {
      // Start exit animation
      setIsVisible(false);
      // Remove from DOM after animation
      const removeTimer = setTimeout(() => onDismiss(toast.id), 300);
      return () => clearTimeout(removeTimer);
    }, 4000);

    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
    };
  }, [toast.id, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={`
        flex items-start w-full max-w-sm p-4 space-x-4 rounded-xl shadow-lg bg-card border border-border
        transition-all duration-300 ease-in-out
        ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-card-foreground">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 -m-1 rounded-full hover:bg-muted transition-colors duration-200"
        aria-label="Fermer"
      >
        <svg
          className="w-4 h-4 text-muted-foreground"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

export default Toast;
