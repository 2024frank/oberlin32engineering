export type UnknownRecord = Record<string, unknown>;

export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  storageBucket: string;
  portalEnabled: boolean;
  useDatabase: boolean;
  contentVersion: string;
}

declare global {
  interface Window {
    O32_CONFIG?: Partial<RuntimeConfig>;
  }
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function text(record: UnknownRecord, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

export function flag(record: UnknownRecord, key: string): boolean {
  return record[key] === true;
}

export function list(record: UnknownRecord, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
