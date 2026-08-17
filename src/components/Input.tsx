import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-ink-raised border border-panel-border rounded-md px-3 py-2 text-sm text-paper placeholder:text-paper-dim/60 focus:border-brass outline-none transition-colors ${className}`}
      {...rest}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs uppercase tracking-wide text-paper-dim mb-1">{children}</label>;
}

export function Select({ className = '', ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full bg-ink-raised border border-panel-border rounded-md px-3 py-2 text-sm text-paper focus:border-brass outline-none transition-colors ${className}`}
      {...rest}
    />
  );
}
