import React from 'react';
import ColorInput from './ColorInput';
import { TrashIcon, PlusIcon } from '../../constants';
import Button from './Button';

interface ColorPaletteInputProps {
  value: string[];
  onChange: (colors: string[]) => void;
}

const ColorPaletteInput: React.FC<ColorPaletteInputProps> = ({ value, onChange }) => {
  const handleColorChange = (index: number, newColor: string) => {
    const newPalette = [...value];
    newPalette[index] = newColor;
    onChange(newPalette);
  };

  const handleRemoveColor = (index: number) => {
    const newPalette = value.filter((_, i) => i !== index);
    onChange(newPalette);
  };

  const handleAddColor = () => {
    onChange([...value, '#cccccc']);
  };

  return (
    <div className="space-y-2 p-3 border rounded-md bg-muted/30">
      <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
        {value.map((color, index) => (
          <div key={index} className="flex items-center justify-between animate-fadeIn">
            <ColorInput
              value={color}
              onChange={(newColor) => handleColorChange(index, newColor)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => handleRemoveColor(index)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button onClick={handleAddColor} variant="outline" size="sm" className="w-full">
        <PlusIcon className="mr-2 h-4 w-4" />
        Ajouter une couleur
      </Button>
    </div>
  );
};

export default ColorPaletteInput;