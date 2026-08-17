const styles: Record<string, string> = {
  ok: 'bg-ledger/15 text-ledger border-ledger/30',
  warn: 'bg-brass/15 text-brass border-brass/30',
  danger: 'bg-copper/15 text-copper border-copper/30',
  neutral: 'bg-paper-dim/10 text-paper-dim border-paper-dim/20',
};

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof styles; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}
