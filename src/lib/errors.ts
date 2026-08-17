export function errorMessage(err: unknown): string {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  return anyErr?.message ?? 'Something went wrong';
}
