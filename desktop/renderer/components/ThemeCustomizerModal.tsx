import React from 'react';
import { CustomColors, SavedTheme } from '../types';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';
import ColorInput from './ui/ColorInput';
import { defaultCustomColors } from '../hooks/useAppLogic';
import Label from './ui/Label';
import ColorPaletteInput from './ui/ColorPaletteInput';
import ThemePreview from './ui/ThemePreview';
import Input from './ui/Input';
import { PhotoIcon, TrashIcon } from '../constants';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (theme: Omit<SavedTheme, 'id'> & { id?: string }) => void;
  initialColors: CustomColors;
  editingTheme: SavedTheme | null;
}

const LabeledColorInput: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <Label>{label}</Label>
    <ColorInput value={value} onChange={onChange} />
  </div>
);

const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ isOpen, onClose, onSave, initialColors, editingTheme }) => {
  const [colors, setColors] = React.useState<CustomColors>(initialColors);
  const [name, setName] = React.useState('');
  const [nameError, setNameError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setColors(initialColors);
      setName(editingTheme?.name || 'Mon Thème');
      setNameError('');
    }
  }, [isOpen, initialColors, editingTheme]);

  const handleColorChange = (key: keyof CustomColors, value: string | string[]) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Le nom du thème est requis.');
      return;
    }
    onSave({ id: editingTheme?.id, name, colors });
    onClose();
  };

  const handleReset = () => {
    setColors(defaultCustomColors);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="xl">
      <DialogHeader>
        <DialogTitle>{editingTheme ? 'Modifier le Thème' : 'Nouveau Thème Personnalisé'}</DialogTitle>
        <DialogDescription>
          Créez une palette de couleurs unique et visualisez les changements en direct.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        {/* Left Column: Controls */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
          <div className="space-y-2">
            <Label htmlFor="theme-name">Nom du Thème</Label>
            <Input
              id="theme-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Thème Cosider"
              className={nameError ? 'border-destructive' : ''}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-muted-foreground text-sm flex items-center justify-between">
              <span>Base & Environnement</span>
              <label className="cursor-pointer group flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <PhotoIcon className="w-4 h-4" />
                <span className="text-xs font-bold">Image de fond</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (readEvent) => {
                        handleColorChange('backgroundImage', readEvent.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </h3>

            {colors.backgroundImage && (
              <div className="relative group rounded-md overflow-hidden border border-border h-24 mb-2">
                <img src={colors.backgroundImage} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleColorChange('backgroundImage', '')}
                  className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer l'image"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            )}

            <LabeledColorInput label="Arrière-plan" value={colors.background} onChange={(c) => handleColorChange('background', c)} />
            <LabeledColorInput label="Fond des Cartes" value={colors.card} onChange={(c) => handleColorChange('card', c)} />
            <LabeledColorInput label="Accentuation / Hover" value={colors.accent} onChange={(c) => handleColorChange('accent', c)} />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-muted-foreground text-sm">Typographie</h3>
            <LabeledColorInput label="Texte Principal" value={colors.foreground} onChange={(c) => handleColorChange('foreground', c)} />
            <LabeledColorInput label="Texte Secondaire" value={colors.foregroundSecondary} onChange={(c) => handleColorChange('foregroundSecondary', c)} />
            <LabeledColorInput label="Texte dans les Cartes" value={colors.cardForeground} onChange={(c) => handleColorChange('cardForeground', c)} />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-muted-foreground text-sm">Composants</h3>
            <LabeledColorInput label="Bordures" value={colors.border} onChange={(c) => handleColorChange('border', c)} />
            <LabeledColorInput label="Fond des Champs" value={colors.input} onChange={(c) => handleColorChange('input', c)} />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-muted-foreground text-sm">Actions</h3>
            <LabeledColorInput label="Primaire" value={colors.primary} onChange={(c) => handleColorChange('primary', c)} />
            <LabeledColorInput label="Texte sur Primaire" value={colors.primaryForeground} onChange={(c) => handleColorChange('primaryForeground', c)} />
            <LabeledColorInput label="Destructive" value={colors.destructive} onChange={(c) => handleColorChange('destructive', c)} />
            <LabeledColorInput label="Texte sur Destructive" value={colors.destructiveForeground} onChange={(c) => handleColorChange('destructiveForeground', c)} />
            <LabeledColorInput label="Anneau de Focus" value={colors.ring} onChange={(c) => handleColorChange('ring', c)} />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-muted-foreground text-sm">Bordures "Arc-en-ciel"</h3>
            <p className="text-xs text-muted-foreground -mt-2">Personnalisez la palette pour les bordures des cartes d'engins.</p>
            <ColorPaletteInput
              value={colors.cardBorders}
              onChange={(palette) => handleColorChange('cardBorders', palette)}
            />
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="hidden md:flex flex-col items-center justify-center bg-transparent rounded-lg border overflow-hidden">
          <ThemePreview colors={colors} />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" onClick={handleReset}>Réinitialiser Couleurs</Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave}>Enregistrer le Thème</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default ThemeCustomizerModal;