'use client';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// EXACT SPECS: 32px diameter, neutral colors, 12px initials
const sizeClasses = {
  sm: 'w-8 h-8 text-xs',      // 32px - tables
  md: 'w-10 h-10 text-sm',    // 40px - standard
  lg: 'w-16 h-16 text-lg',    // 64px - profiles
};

export default function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  // EXACT COLOR ROLES: #F5F5F5 bg, #1B1B1B text
  return (
    <div
      className={`
        ${sizeClasses[size]}
        flex-shrink-0
        rounded-full
        bg-neutral-100
        flex items-center justify-center
        font-semibold
        text-neutral-900
        ${className}
      `}
    >
      {initials}
    </div>
  );
}
