import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

const ToastContext = createContext<{ push: (message: string, tone?: Toast['tone']) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-md text-sm font-medium shadow-lg border ${
              t.tone === 'success'
                ? 'bg-ledger/15 border-ledger/40 text-ledger'
                : 'bg-copper/15 border-copper/40 text-copper'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
