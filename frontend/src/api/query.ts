export const withQuery = (path: string, params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) return path;
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    qp.set(key, String(value));
  });
  const q = qp.toString();
  return q ? `${path}?${q}` : path;
};
