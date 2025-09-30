import React, { useState, useRef, useEffect } from 'react';
import { Input } from './Input';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  className?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  options,
  placeholder = "Sélectionner une option...",
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Trouver l'option sélectionnée
  const selectedOption = options.find(option => option.value === value);

  // Mettre à jour la valeur d'entrée quand la sélection change
  useEffect(() => {
    if (selectedOption) {
      setInputValue(selectedOption.label);
    } else {
      setInputValue("");
    }
  }, [selectedOption]);

  // Filtrer les options en fonction de la saisie
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Gérer le clic sur une option
  const handleOptionClick = (option: AutocompleteOption) => {
    onChange(option.value);
    setShowOptions(false);
  };

  // Gérer le changement de saisie
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowOptions(true);
  };

  // Gérer le focus sur l'input
  const handleInputFocus = () => {
    setShowOptions(true);
  };

  // Gérer le clic en dehors du composant
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(event.target as Node)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Popover open={showOptions} onOpenChange={setShowOptions}>
        <PopoverTrigger asChild>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="w-full"
          />
        </PopoverTrigger>
        <PopoverContent 
          ref={popoverRef}
          className="w-full p-0"
          align="start"
        >
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="px-3 py-2 cursor-pointer hover:bg-accent rounded-md"
                  onClick={() => handleOptionClick(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-muted-foreground">
                Aucune option trouvée
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default Autocomplete;
