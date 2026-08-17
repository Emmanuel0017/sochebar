import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: ReactNode;
}

const variants: Record<string, string> = {
  primary: 'bg-brass text-ink hover:bg-brass-soft disabled:bg-brass/40',
  secondary: 'bg-panel text-paper border border-panel-border hover:border-brass/50 disabled:opacity-40',
  danger: 'bg-copper text-paper hover:bg-copper/80 disabled:opacity-40',
  ghost: 'bg-transparent text-paper-dim hover:text-paper hover:bg-panel',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
