import { useState } from 'react';
import { MAX_SCORE, MIN_SCORE } from '../../constants/tournament';

export function ScoreButton({ onClick, children, variant = 'default', label }) {
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onClick();
  };

  const defaultLabel = variant === 'plus' ? 'Zwiększ wynik' : variant === 'minus' ? 'Zmniejsz wynik' : undefined;

  return (
    <button
      onClick={handleClick}
      aria-label={label || defaultLabel}
      className={`
        score-btn
        ${pressed ? 'scale-90' : ''}
        ${variant === 'plus' ? 'hover:bg-green-100 hover:text-green-700' : ''}
        ${variant === 'minus' ? 'hover:bg-red-100 hover:text-red-700' : ''}
      `}
    >
      {children}
    </button>
  );
}

export function ScoreInput({ value, onChange, label, size = 'md' }) {
  const sizeClasses = size === 'lg'
    ? 'score-box'
    : 'score-box w-16 h-16 text-3xl';

  return (
    <div className="flex flex-col items-center gap-2" role="group" aria-label={label ? `Wynik: ${label}` : 'Wynik'}>
      <ScoreButton
        onClick={() => onChange(Math.min(MAX_SCORE, value + 1))}
        variant="plus"
        label={label ? `Zwiększ wynik dla ${label}` : 'Zwiększ wynik'}
      >
        +
      </ScoreButton>
      <div className={sizeClasses} aria-live="polite" aria-atomic="true">
        <span className="relative z-10">{value}</span>
      </div>
      <ScoreButton
        onClick={() => onChange(Math.max(MIN_SCORE, value - 1))}
        variant="minus"
        label={label ? `Zmniejsz wynik dla ${label}` : 'Zmniejsz wynik'}
      >
        -
      </ScoreButton>
      {label && (
        <span className="text-xs font-medium text-gray-600 truncate max-w-[80px]">
          {label}
        </span>
      )}
    </div>
  );
}
