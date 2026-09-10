/**
 * Client for workbench cloud sync (Cloudflare Worker + D1).
 */

import type { Mission } from './workbench';

const AUTH_KEY = 'workbench-sync-auth-v1';
const UPDATED_KEY = 'workbench-sync-updated-at-v1';
const API_KEY = 'workbench-sync-api-base-v1';

export interface SyncUser {
  id: string;
  email: string;
}

export interface AuthState {
  token: string;
  user: SyncUser;
}

function defaultApiBase(): string {
  // Override via localStorage or Vite env; empty means sync disabled until configured.
  const env = (import.meta as ImportMeta & { env?: { VITE_SYNC_API_BASE?: string } }).env?.VITE_SYNC_API_BASE;
  return (env || '').replace(/\/+$/, '');
}

export function getApiBase(): string {
  try {
    return (localStorage.getItem(API_KEY) || defaultApiBase()).replace(/\/+$/, '');
  } catch {
    return defaultApiBase();
  }
}

export function setApiBase(url: string): void {
  localStorage.setItem(API_KEY, url.replace(/\/+$/, ''));
}

export function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

function saveAuth(auth: AuthState | null): void {
  if (!auth) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function loadCloudUpdatedAt(): string | null {
  try {
    return localStorage.getItem(UPDATED_KEY);
  } catch {
    return null;
  }
}

function saveCloudUpdatedAt(value: string | null): void {
  if (!value) localStorage.removeItem(UPDATED_KEY);
  else localStorage.setItem(UPDATED_KEY, value);
}

async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const base = getApiBase();
  if (!base) throw new Error('尚未配置同步服务地址');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data;
}

export async function signup(email: string, password: string): Promise<AuthState> {
  const data = await api<{ token: string; user: SyncUser }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const auth = { token: data.token, user: data.user };
  saveAuth(auth);
  return auth;
}

export async function login(email: string, password: string): Promise<AuthState> {
  const data = await api<{ token: string; user: SyncUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const auth = { token: data.token, user: data.user };
  saveAuth(auth);
  return auth;
}

export async function logout(): Promise<void> {
  const auth = loadAuth();
  try {
    if (auth) await api('/auth/logout', { method: 'POST', token: auth.token });
  } catch {
    /* ignore network errors on logout */
  }
  saveAuth(null);
}

export async function pullMissions(): Promise<{ missions: Mission[]; updatedAt: string | null }> {
  const auth = loadAuth();
  if (!auth) throw new Error('未登录');
  const data = await api<{ missions: Mission[]; updatedAt: string | null }>('/missions', {
    method: 'GET',
    token: auth.token,
  });
  if (data.updatedAt) saveCloudUpdatedAt(data.updatedAt);
  return data;
}

export async function pushMissions(missions: Mission[]): Promise<string> {
  const auth = loadAuth();
  if (!auth) throw new Error('未登录');
  const data = await api<{ updatedAt: string }>('/missions', {
    method: 'PUT',
    token: auth.token,
    body: JSON.stringify({
      missions,
      updatedAt: loadCloudUpdatedAt(),
    }),
  });
  saveCloudUpdatedAt(data.updatedAt);
  return data.updatedAt;
}

/** Merge local + cloud by mission id; newer createdAt / any newer subtask wins simply by preferring cloud if newer updatedAt. */
export function mergeMissions(local: Mission[], cloud: Mission[]): Mission[] {
  const map = new Map<string, Mission>();
  for (const m of local) map.set(m.id, m);
  for (const m of cloud) {
    const prev = map.get(m.id);
    if (!prev) {
      map.set(m.id, m);
      continue;
    }
    // Prefer the one with more completed work / later summary; fall back to cloud.
    const prevScore = prev.subtasks.filter((s) => s.status === 'done').length + (prev.summary ? 1 : 0);
    const nextScore = m.subtasks.filter((s) => s.status === 'done').length + (m.summary ? 1 : 0);
    map.set(m.id, nextScore >= prevScore ? m : prev);
  }
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
