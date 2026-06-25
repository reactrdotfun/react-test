import ws from 'ws';
// @supabase/supabase-js spins up a realtime client that needs a global WebSocket.
// Node < 22 has none, so polyfill it (we don't use realtime, this just keeps init happy).
if (typeof globalThis.WebSocket === 'undefined') globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Service-role client. Server-side only. Bypasses RLS — never expose this key.
export const db = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: {} },
});
