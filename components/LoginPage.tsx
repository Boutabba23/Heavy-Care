import React, { useState } from 'react';
import LoginForm from './LoginForm';

const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">GestiFiltres</h1>
          <p className="text-muted-foreground">Gestionnaire de filtres pour engins</p>
        </div>
        <LoginForm onToggleMode={toggleMode} isSignUp={isSignUp} />
      </div>
    </div>
  );
};

export default LoginPage;