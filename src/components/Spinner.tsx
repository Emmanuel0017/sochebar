export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-panel-border border-t-brass"
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={28} />
    </div>
  );
}
