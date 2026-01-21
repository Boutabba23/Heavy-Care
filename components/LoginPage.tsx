import React, { useState } from 'react';
import LoginForm from './LoginForm';
import { LogoIcon } from '../constants';

const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentStep, setCurrentStep] = useState<'welcome' | 'login'>('welcome');

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-primary/60 to-slate-900 text-white">
      <div
        className={`flex w-[200%] md:w-full md:flex-row-reverse h-full min-h-screen transition-transform duration-500 ease-in-out ${currentStep === 'login' ? '-translate-x-1/2 md:translate-x-0' : 'translate-x-0'
          }`}
      >
        {/* Brand Section (Welcome Section on Mobile) */}
        <div className="w-1/2 md:w-[45%] flex-shrink-0 flex flex-col items-center md:justify-center p-8 relative overflow-hidden z-10 transition-opacity duration-500">
          {/* Subtle decorative background elements */}


          {/* Main Content: centered on mobile flex-1 */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-sm w-full">
            <LogoIcon className="h-40 sm:h-60 w-auto mb-6 md:mb-8 drop-shadow-2xl" />

            <div className="h-1.5 w-16 bg-primary mb-8 rounded-full" />
            <p className="text-xl text-slate-300 font-medium leading-relaxed mb-6 md:mb-12">
              Plateforme complète de gestion de maintenance, pièces et stocks d'huile pour engins lourds
            </p>

            {/* Cards: hidden on mobile, visible on desktop */}
            <div className="hidden md:grid grid-cols-2 gap-4 text-left w-full">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <p className="text-primary font-bold text-sm uppercase tracking-widest mb-1">Maintenance</p>
                <p className="text-slate-400 text-xs">Suivi & Planification</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <p className="text-primary font-bold text-sm uppercase tracking-widest mb-1">Stocks</p>
                <p className="text-slate-400 text-xs">Huiles & Consommables</p>
              </div>
            </div>
          </div>

          {/* Mobile Only: Bienvenue Button at the bottom */}
          <div className="mt-auto md:hidden w-full max-w-sm relative z-10 pb-4">
            <button
              onClick={() => setCurrentStep('login')}
              className="w-full py-4 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              Bienvenue
            </button>
          </div>
        </div>

        {/* Form Section */}
        {/* Form Section */}
        <div className="w-1/2 md:flex-1 flex-shrink-0 flex items-start md:items-center justify-center p-6 pt-12 md:pt-6 bg-transparent transition-opacity duration-500">
          <div className="w-full max-w-md">
            {/* Mobile Only Header with Back Button */}
            <div className="md:hidden flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentStep('welcome')}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Retour"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white flex-1 text-center pr-8">
                Heavy<span className="text-primary">Care</span>
              </h2>
            </div>
            <div className="animate-fadeIn">
              <LoginForm onToggleMode={toggleMode} isSignUp={isSignUp} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;