import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/30 rounded-lg border-2 border-dashed border-border animate-fadeIn">
      <div className="mb-4 text-transparent bg-clip-text bg-gradient-to-br from-muted-foreground/30 to-muted-foreground/60">
        {icon}
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;