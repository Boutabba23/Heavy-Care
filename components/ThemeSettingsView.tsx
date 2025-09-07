
import React from 'react';
import { SavedTheme, Theme } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon } from '../constants';
import { ThemeInfo, themes } from '../utils/themes';
import Button from './ui/Button';
import { useAppLogic } from '../hooks/useAppLogic';

const ThemeCard: React.FC<{ theme: ThemeInfo; isActive: boolean; onClick: () => void }> = ({ theme, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left rounded-lg border-2 transition-all ${isActive ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'}`}
        aria-label={`Sélectionner le thème ${theme.name}`}
        aria-pressed={isActive}
    >
        <div className="p-4 rounded-md flex flex-col space-y-2" style={{ backgroundColor: theme.colors.bg, color: theme.colors.text }}>
            <div className="flex justify-between items-center">
                <span className="font-semibold">{theme.name}</span>
                {isActive && <CheckIcon className="w-5 h-5 text-primary"/>}
            </div>
            <div className="flex space-x-2">
                <div className="flex-1 p-2 rounded" style={{ backgroundColor: theme.colors.card }}>
                    <div className="w-1/2 h-2 rounded" style={{ backgroundColor: theme.colors.primary }}></div>
                </div>
            </div>
        </div>
    </button>
);


interface SettingsViewProps {
  currentTheme: Theme;
  savedThemes: SavedTheme[];
  onThemeChange: (themeId: Theme) => void;
  onOpenCustomizer: (theme: SavedTheme | null) => void;
  onDeleteTheme: (themeId: string) => void;
  onOpenConfirmationDialog: ReturnType<typeof useAppLogic>['actions']['openConfirmationDialog'];
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentTheme, savedThemes, onThemeChange, onOpenCustomizer, onDeleteTheme, onOpenConfirmationDialog }) => {
  const lightThemes = themes.filter(t => t.type === 'light');
  const darkThemes = themes.filter(t => t.type === 'dark');

  const handleDeleteClick = (theme: SavedTheme) => {
    onOpenConfirmationDialog({
      title: 'Supprimer le Thème',
      description: `Êtes-vous sûr de vouloir supprimer le thème "${theme.name}" ? Cette action est irréversible.`,
      onConfirm: () => onDeleteTheme(theme.id),
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
       <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Paramètres d'Affichage</CardTitle>
          <CardDescription>
            Personnalisez l'apparence de l'application pour qu'elle corresponde à vos préférences.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Créer un Thème</CardTitle>
          <CardDescription>Créez votre propre palette de couleurs et sauvegardez-la.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => onOpenCustomizer(null)} className="w-full sm:w-auto">
            <PlusIcon className="mr-2 h-5 w-5" />
            Nouveau Thème Personnalisé
          </Button>
        </CardContent>
      </Card>

      {savedThemes.length > 0 && (
        <Card>
            <CardHeader>
                <CardTitle>Mes Thèmes</CardTitle>
                <CardDescription>Gérez vos thèmes personnalisés sauvegardés.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {savedThemes.map(theme => (
                    <div 
                        key={theme.id}
                        className={`p-3 rounded-lg border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${currentTheme === theme.id ? 'border-primary bg-muted/50' : 'border-border'}`}
                    >
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-md border-2" style={{
                                background: `linear-gradient(45deg, ${theme.colors.background} 50%, ${theme.colors.card} 50%)`,
                                borderColor: theme.colors.primary
                             }} />
                            <span className="font-semibold">{theme.name}</span>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                            {currentTheme !== theme.id ? (
                                <Button size="sm" variant="outline" onClick={() => onThemeChange(theme.id)}>Activer</Button>
                            ) : (
                               <div className="flex items-center gap-2 text-sm font-semibold text-primary pr-2">
                                   <CheckIcon className="w-4 h-4" />
                                   <span>Actif</span>
                               </div>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOpenCustomizer(theme)}><PencilIcon className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(theme)}><TrashIcon className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
      )}

      <Card>
          <CardHeader>
              <CardTitle>Thèmes Prédéfinis</CardTitle>
              <CardDescription>Choisissez parmi une sélection de thèmes clairs et sombres.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lightThemes.map(theme => (
                  <ThemeCard 
                      key={theme.id}
                      theme={theme} 
                      isActive={currentTheme === theme.id} 
                      onClick={() => onThemeChange(theme.id)}
                  />
              ))}
               {darkThemes.map(theme => (
                  <ThemeCard 
                      key={theme.id}
                      theme={theme} 
                      isActive={currentTheme === theme.id} 
                      onClick={() => onThemeChange(theme.id)}
                  />
              ))}
          </CardContent>
      </Card>
    </div>
  );
};

export default SettingsView;