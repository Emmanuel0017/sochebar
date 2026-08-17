import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  tear = false,
}: {
  children: ReactNode;
  className?: string;
  tear?: boolean;
}) {
  return (
    <div className={`bg-panel border border-panel-border rounded-lg ${tear ? 'receipt-tear' : ''} ${className}`}>
      {children}
    </div>
  );
}
