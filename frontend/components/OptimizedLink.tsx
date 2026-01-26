'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useCallback } from 'react';

interface OptimizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}

export default function OptimizedLink({ href, children, className, prefetch = true }: OptimizedLinkProps) {
  const router = useRouter();

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  }, [href, router]);

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  );
}
