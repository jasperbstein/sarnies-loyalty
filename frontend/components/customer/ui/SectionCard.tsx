/**
 * SectionCard - Generic Card Container
 * Sarnies Design System v1.1
 *
 * Simple white card with subtle border.
 * Cards should blend into layout, not float.
 */

import React from "react";
import clsx from "clsx";

interface SectionCardProps {
  className?: string;
  children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  className,
  children,
}) => {
  return (
    <section className={clsx("card", className)}>
      {children}
    </section>
  );
};
