
export function lazy<T>(load: () => Promise<{ default: T } | T>, assets: string[]): T;
