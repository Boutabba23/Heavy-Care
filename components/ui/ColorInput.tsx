import React from "react";
import Input from "./Input";

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ColorInput: React.FC<ColorInputProps> = ({
  value,
  onChange,
  className,
}) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newColor = e.target.value;
    if (!newColor.startsWith("#")) {
      newColor = "#" + newColor.replace(/[^0-9a-f]/gi, "");
    }
    onChange(newColor);
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newColor = e.target.value;
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(newColor)) {
      onChange("#000000"); // Revert to a valid color if invalid
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-8 h-8 flex-shrink-0">
        <input
          type="color"
          value={
            value.startsWith("#") && (value.length === 4 || value.length === 7)
              ? value
              : "#000000"
          }
          onChange={handleColorPickerChange}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        />
        <div
          className="w-full h-full rounded-lg border"
          style={{ backgroundColor: value }}
        />
      </div>
      <Input
        type="text"
        value={value}
        onChange={handleTextChange}
        onBlur={handleBlur}
        className="font-mono w-24 h-8"
        maxLength={7}
      />
    </div>
  );
};

export default ColorInput;
