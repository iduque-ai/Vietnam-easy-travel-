import React from 'react';
import { Volume2, Square } from 'lucide-react';

interface AudioWaveIndicatorProps {
  isPlaying: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorClass?: string;
  onStop?: () => void;
  className?: string;
}

export const AudioWaveIndicator: React.FC<AudioWaveIndicatorProps> = ({
  isPlaying,
  size = 'md',
  colorClass = 'text-amber-400',
  onStop,
  className = '',
}) => {
  if (!isPlaying) {
    return (
      <Volume2
        className={`${
          size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        } ${colorClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 justify-center group ${className}`}
      onClick={(e) => {
        if (onStop) {
          e.stopPropagation();
          onStop();
        }
      }}
      title="Reproduciendo voz natural (Click para detener)"
    >
      <span className="w-1 h-3.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1 h-5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1 h-2.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0s]" />
      <span className="w-1 h-4 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.25s]" />
    </div>
  );
};
