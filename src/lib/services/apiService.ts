const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_PARSER_URL as string | undefined) ||
  '/api';

export function buildApiUrl(path: string): string {
  return `${API_BASE.replace(/\/$/, '')}${path}`;
}
