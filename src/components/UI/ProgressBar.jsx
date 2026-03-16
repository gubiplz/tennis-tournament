import { useEffect, useState } from 'react';
import { pluralize } from '../../utils/helpers';

export function ProgressBar({ current, total, showLabel = true }) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  useEffect(() => {
    // Animate the percentage change
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="w-full">
      {/* Progress track with premium styling */}
      <div
        className="progress-track relative"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Postęp turnieju: ${current} z ${total} meczów (${percentage}%)`}
      >
        {/* Animated fill */}
        <div
          className="progress-fill"
          style={{ width: `${animatedPercentage}%` }}
        />

        {/* Glow effect at the end */}
        {animatedPercentage > 0 && animatedPercentage < 100 && (
          <div
            className="absolute top-0 h-full w-4 transition-all duration-800"
            style={{
              left: `calc(${animatedPercentage}% - 8px)`,
              background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.6) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {showLabel && (
        <div className="flex justify-between mt-2 text-xs" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">{current}/{total}</span>
            <span className="text-gray-600">{pluralize(total, 'mecz', 'mecze', 'meczów')}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Animated percentage badge */}
            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs
                transition-all duration-300
                ${percentage === 100
                  ? 'bg-gradient-to-r from-tennis-500 to-tennis-400 text-white shadow-lg shadow-tennis-500/30'
                  : 'bg-gray-100 text-gray-700'
                }
              `}
            >
              {percentage}%
            </span>

            {/* Completion indicator */}
            {percentage === 100 && (
              <span className="ml-1 animate-bounce" aria-hidden="true">
                <svg className="w-4 h-4 text-tennis-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Milestone markers */}
      {total > 4 && (
        <div className="relative mt-1 h-1" aria-hidden="true">
          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className={`
                absolute top-0 w-1 h-1 rounded-full transform -translate-x-1/2 transition-all duration-300
                ${percentage >= milestone ? 'bg-tennis-400' : 'bg-gray-300'}
              `}
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
