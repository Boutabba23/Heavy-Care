import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Label from './ui/Label';
import { GoogleIcon, LogoIcon } from '../constants';
import { supabase } from '../utils/supabase';

const LoginView: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuthAction = async () => {
    setIsLoading(true);
    setError('');

    if (isSignUp) {
        if (!email || !password || !companyName || !confirmPassword) {
            setError('Tous les champs sont requis.');
            setIsLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            setIsLoading(false);
            return;
        }
        
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    company_name: companyName,
                }
            }
        });
        if (error) setError(error.message);

    } else { // Sign In
        if (!email || !password) {
            setError('Email et mot de passe sont requis.');
            setIsLoading(false);
            return;
        }
        
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) setError(error.message);
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
        setError(error.message);
        setIsLoading(false);
    }
    // The user will be redirected to Google and then back to the app.
    // The App component's onAuthStateChange listener will handle the session.
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-2">
            <LogoIcon className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">GestiFiltres</CardTitle>
          </div>
          <CardDescription>
            {isSignUp ? 'Créez votre compte pour commencer' : 'Connectez-vous à votre compte'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ex: Cosider TP" required disabled={isLoading} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" required disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />
          </div>
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmez le mot de passe</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={isLoading} />
            </div>
          )}
          {!isSignUp && (
              <div className="text-right">
                <a href="#" className="text-sm text-primary hover:underline">Mot de passe oublié ?</a>
              </div>
          )}
          {error && <p className="text-sm text-center text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleAuthAction} className="w-full" disabled={isLoading}>
            {isLoading ? 'Chargement...' : (isSignUp ? "S'inscrire" : 'Se connecter')}
          </Button>
          
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Ou continuer avec
              </span>
            </div>
          </div>

          <Button onClick={handleGoogleSignIn} variant="outline" className="w-full" disabled={isLoading}>
            <GoogleIcon className="mr-2 h-5 w-5" />
            Se connecter avec Google
          </Button>

          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Vous avez déjà un compte ?' : "Vous n'avez pas de compte ?"}
            <button onClick={() => {setIsSignUp(!isSignUp); setError('');}} className="ml-1 text-primary hover:underline font-semibold" disabled={isLoading}>
              {isSignUp ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginView;