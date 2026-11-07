import React, { useRef, useState, useEffect } from "react";
import { PlusIcon, TrashIcon } from "../../constants";

interface ImageInputProps {
  value: string | null | undefined;
  onChange: (base64: string | null) => void;
  placeholderText?: string;
}

const ImageInput: React.FC<ImageInputProps> = ({
  value,
  onChange,
  placeholderText = "Ajouter une image",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        setPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClickContainer = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      {preview ? (
        <div
          className="relative w-full h-24 rounded-lg border-2 border-dashed border-border group cursor-pointer"
          onClick={handleClickContainer}
        >
          <img
            src={preview}
            alt="Aperçu du filtre"
            className="w-full h-full object-contain rounded-md p-1"
          />
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-semibold">Changer</span>
          </div>
          <button
            onClick={handleClear}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold z-10"
            aria-label="Supprimer l'image"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClickContainer}
          className="w-full h-24 flex flex-col items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors"
        >
          <PlusIcon className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-1">
            {placeholderText}
          </span>
        </button>
      )}
    </div>
  );
};

export default ImageInput;
