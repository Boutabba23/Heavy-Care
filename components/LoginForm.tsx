import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { EyeIcon, EyeSlashIcon, GoogleIcon } from "../constants";

interface LoginFormProps {
  onToggleMode: () => void;
  isSignUp?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onToggleMode,
  isSignUp = false,
}) => {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignUp && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        setError(error.message);
      } else if (isSignUp) {
        setMessage(
          "Inscription réussie ! Vérifiez votre email pour confirmer votre compte."
        );
      }
    } catch (err) {
      setError("Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("Erreur lors de la connexion avec Google");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Veuillez entrer votre adresse email");
      setLoading(false);
      return;
    }

    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setMessage("Instructions de réinitialisation envoyées par email");
        setShowResetPassword(false);
      }
    } catch (err) {
      setError("Erreur lors de l'envoi de l'email de réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  if (showResetPassword) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            Réinitialiser le mot de passe
          </CardTitle>
          <CardDescription className="text-center">
            Entrez votre email pour recevoir un lien de réinitialisation
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="reset-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="reset-email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Envoi en cours..."
                : "Envoyer le lien de réinitialisation"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowResetPassword(false)}
              className="w-full"
            >
              Retour à la connexion
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          {isSignUp ? "Créer un compte" : "Se connecter"}
        </CardTitle>
        <CardDescription className="text-center">
          {isSignUp
            ? "Créez votre compte pour accéder à GestiFiltres"
            : "Connectez-vous à votre compte GestiFiltres"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              {message}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Chargement..."
              : isSignUp
              ? "Créer le compte"
              : "Se connecter"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full"
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Continuer avec Google
          </Button>

          <div className="flex flex-col space-y-2 text-center text-sm">
            {!isSignUp && (
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
            )}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-primary hover:underline"
            >
              {isSignUp
                ? "Déjà un compte ? Se connecter"
                : "Pas de compte ? S'inscrire"}
            </button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;
