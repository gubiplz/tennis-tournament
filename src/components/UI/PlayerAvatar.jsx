import { getAvatarColor, getInitials } from '../../utils/helpers';

export function PlayerAvatar({ name, size = 'md', className = '' }) {
  const color = getAvatarColor(name);
  const initials = getInitials(name);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-full flex items-center justify-center
        bg-gradient-to-br ${color} text-white font-bold
        border-2 border-white shadow-lg
        transition-transform duration-300
        ${className}
      `}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
