import React from "react";

interface AvatarCircleProps {
  initials: string;
  size?: number;
}

export const AvatarCircle: React.FC<AvatarCircleProps> = ({
  initials,
  size = 32,
}) => {
  return (
    <div
      className="flex-shrink-0 rounded-full bg-gradient-to-br from-gray-200 to-gray-100
        flex items-center justify-center border border-gray-300 shadow-sm
        transition-all duration-100 hover:shadow-md"
      style={{ width: size, height: size }}
    >
      <span
        className="font-bold text-gray-700"
        style={{ fontSize: size * 0.375 }}
      >
        {initials}
      </span>
    </div>
  );
};
