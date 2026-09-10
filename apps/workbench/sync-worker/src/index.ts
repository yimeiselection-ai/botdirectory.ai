/**
 * Workbench sync API — Cloudflare Worker + D1.
 * Free Cloudflare account is enough; no paid VPS required.
 *
 * Routes:
 *   GET  /health
 *   POST /auth/signup   { email, password }
 *   POST /auth/login    { email, password }
 *   POST /auth/logout
 *   GET  /me
 *   GET  /missions
 *   PUT  /missions      { missions, updatedAt? }
 */

export interface Env {
  DB: D1Database;
}

type Json = Record<string, unknown>;

const SESSION_DAYS = 30;
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function error(status: number, message: string): Response {
  return json({ error: message }, status);
}

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function bearer(request: Request): string | null {
  const h = request.headers.get('Authorization') ?? '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

async function readJson(request: Request): Promise<Json | null> {
  try {
    return (await request.json()) as Json;
  } catch {
    return null;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  // Keep iterations modest: Workers free CPU budget is small; 120k often returns 500.
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 10_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: saltHex ?? bytesToHex(salt) };
}

async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = uid('sess');
  await db
    .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, nowIso(), addDays(SESSION_DAYS))
    .run();
  return token;
}

async function userFromToken(db: D1Database, token: string | null): Promise<{ id: string; email: string } | null> {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.email, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .bind(token)
    .first<{ id: string; email: string; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return { id: row.id, email: row.email };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (request.method === 'GET' && path === '/health') {
        return json({ ok: true, service: 'workbench-sync' });
      }

      if (request.method === 'POST' && path === '/auth/signup') {
        const body = await readJson(request);
        const email = normalizeEmail(String(body?.email ?? ''));
        const password = String(body?.password ?? '');
        if (!email.includes('@') || password.length < 8) {
          return error(400, '邮箱无效，或密码少于 8 位');
        }
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existing) return error(409, '该邮箱已注册，请直接登录');
        const { hash, salt } = await hashPassword(password);
        const id = uid('user');
        await env.DB
          .prepare('INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(id, email, hash, salt, nowIso())
          .run();
        const token = await createSession(env.DB, id);
        return json({ token, user: { id, email } }, 201);
      }

      if (request.method === 'POST' && path === '/auth/login') {
        const body = await readJson(request);
        const email = normalizeEmail(String(body?.email ?? ''));
        const password = String(body?.password ?? '');
        const user = await env.DB
          .prepare('SELECT id, email, password_hash, password_salt FROM users WHERE email = ?')
          .bind(email)
          .first<{ id: string; email: string; password_hash: string; password_salt: string }>();
        if (!user) return error(401, '邮箱或密码错误');
        const { hash } = await hashPassword(password, user.password_salt);
        if (hash !== user.password_hash) return error(401, '邮箱或密码错误');
        const token = await createSession(env.DB, user.id);
        return json({ token, user: { id: user.id, email: user.email } });
      }

      if (request.method === 'POST' && path === '/auth/logout') {
        const token = bearer(request);
        if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        return json({ ok: true });
      }

      if (request.method === 'GET' && path === '/me') {
        const user = await userFromToken(env.DB, bearer(request));
        if (!user) return error(401, '未登录或会话已过期');
        return json({ user });
      }

      if (request.method === 'GET' && path === '/missions') {
        const user = await userFromToken(env.DB, bearer(request));
        if (!user) return error(401, '未登录或会话已过期');
        const row = await env.DB
          .prepare('SELECT payload, updated_at FROM mission_state WHERE user_id = ?')
          .bind(user.id)
          .first<{ payload: string; updated_at: string }>();
        if (!row) return json({ missions: [], updatedAt: null });
        let missions: unknown = [];
        try {
          missions = JSON.parse(row.payload);
        } catch {
          missions = [];
        }
        return json({ missions, updatedAt: row.updated_at });
      }

      if (request.method === 'PUT' && path === '/missions') {
        const user = await userFromToken(env.DB, bearer(request));
        if (!user) return error(401, '未登录或会话已过期');
        const body = await readJson(request);
        const missions = body?.missions;
        if (!Array.isArray(missions)) return error(400, 'missions 必须是数组');
        const clientUpdatedAt = typeof body?.updatedAt === 'string' ? body.updatedAt : null;
        const existing = await env.DB
          .prepare('SELECT updated_at FROM mission_state WHERE user_id = ?')
          .bind(user.id)
          .first<{ updated_at: string }>();

        // Last-write-wins, but reject stale clients when they send an older timestamp.
        if (
          clientUpdatedAt &&
          existing?.updated_at &&
          new Date(clientUpdatedAt).getTime() < new Date(existing.updated_at).getTime()
        ) {
          return error(409, '云端有更新的数据，请先拉取再保存');
        }

        const updatedAt = nowIso();
        const payload = JSON.stringify(missions);
        await env.DB
          .prepare(
            `INSERT INTO mission_state (user_id, payload, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
          )
          .bind(user.id, payload, updatedAt)
          .run();
        return json({ ok: true, updatedAt });
      }

      return error(404, 'Not found');
    } catch (err) {
      console.error(err);
      const detail = err instanceof Error ? err.message : String(err);
      return error(500, `服务器错误: ${detail}`);
    }
  },
};
