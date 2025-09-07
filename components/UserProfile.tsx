import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../utils/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { EyeIcon, EyeSlashIcon } from "../constants";

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    try {
      // Use Supabase auth client to update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Mot de passe mis à jour avec succès");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowChangePassword(false);
      }
    } catch (err) {
      setError("Erreur lors de la mise à jour du mot de passe");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Profil Utilisateur
        </h1>
        <p className="text-muted-foreground">
          Gérez vos informations de compte
        </p>
      </div>

      <Card>
        <CardHeader className="mb-6">
          <CardTitle>Informations du Compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <p className="text-sm">{user.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              ID Utilisateur
            </label>
            <p className="text-sm font-mono">{user.id}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Dernière Connexion
            </label>
            <p className="text-sm">
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString("fr-FR")
                : "Inconnue"}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Compte Créé
            </label>
            <p className="text-sm">
              {new Date(user.created_at).toLocaleString("fr-FR")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="mb-6">
          <CardTitle>Sécurité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showChangePassword ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mot de passe</p>
                <p className="text-sm text-muted-foreground">
                  Modifiez votre mot de passe pour sécuriser votre compte
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowChangePassword(true)}
              >
                Modifier
              </Button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
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
                <label
                  htmlFor="currentPassword"
                  className="text-sm font-medium"
                >
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeSlashIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmNewPassword"
                  className="text-sm font-medium"
                >
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
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

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Mise à jour..." : "Mettre à jour"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError(null);
                    setMessage(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="mb-6">
          <CardTitle>Actions du Compte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Se déconnecter</p>
              <p className="text-sm text-muted-foreground">
                Déconnectez-vous de votre session actuelle
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={loading}
            >
              {loading ? "Déconnexion..." : "Se déconnecter"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
