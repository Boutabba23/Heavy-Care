import React from 'react';
import { CustomColors } from '../../types';
import { FilterIcon } from '../../constants';

interface ThemePreviewProps {
  colors: CustomColors;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ colors }) => {
  const previewStyle: React.CSSProperties = {
    '--bg': colors.background,
    '--card': colors.card,
    '--border': colors.border,
    '--primary': colors.primary,
    '--primary-fg': colors.primaryForeground,
    '--fg': colors.foreground,
    '--fg-secondary': colors.foregroundSecondary,
    '--card-fg': colors.cardForeground,
    '--accent': colors.accent,
    '--destructive': colors.destructive,
    '--input': colors.input,
  } as React.CSSProperties;

  const cardBorderStyle: React.CSSProperties = {
    borderLeftColor: colors.cardBorders?.[0] || colors.primary,
  };

  return (
    <div
      style={{ ...previewStyle, backgroundColor: 'var(--bg)' }}
      className="w-full h-full p-4 flex flex-col items-center justify-center font-sans transition-colors duration-200"
    >
      <div className="w-full text-center mb-4">
        <h2 className="font-bold text-lg" style={{ color: 'var(--fg)' }}>
          Aperçu du Thème
        </h2>
      </div>

      <div
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--card-fg)',
          borderColor: 'var(--border)',
          ...cardBorderStyle,
        }}
        className="w-full p-4 rounded-lg border border-l-4 shadow-md flex flex-col gap-3 transition-colors duration-200"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-md" style={{ color: 'var(--card-fg)' }}>
              Pelle sur chenilles
            </h3>
            <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
              Marque - Type
            </p>
          </div>
          <div style={{ color: 'var(--primary)' }}>
            <FilterIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--fg-secondary)' }}>Heures de service</span>
            <span className="font-semibold" style={{ color: 'var(--card-fg)' }}>
              12 500 hs
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--fg-secondary)' }}>Prochaine maintenance</span>
            <span className="font-semibold" style={{ color: 'var(--destructive)' }}>
              Urgent
            </span>
          </div>
        </div>

        <div
            style={{
                backgroundColor: 'var(--input)',
                borderColor: 'var(--border)',
                color: 'var(--fg-secondary)'
            }}
            className="w-full text-xs p-2 mt-2 rounded-md border"
        >
            Champ de saisie...
        </div>

        <div className="flex gap-2 mt-2">
          <button
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-fg)',
            }}
            className="flex-1 text-xs font-bold py-1.5 px-3 rounded-md transition-opacity hover:opacity-90"
          >
            Voir Détails
          </button>
          <button
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--card-fg)',
            }}
            className="text-xs font-bold py-1.5 px-3 rounded-md transition-opacity hover:opacity-90"
          >
            Action
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;