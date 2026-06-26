import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Service-role client. Server-side only. Bypasses RLS — never expose this key.
// Node 22 (see engines) has a native global WebSocket, and we only use the REST
// interface, so no polyfill is needed.
export const db = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: {} },
});
