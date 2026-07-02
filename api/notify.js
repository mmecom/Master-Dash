// ============================================================
// GET /api/notify   — reminder sender (called by a scheduler)
//
// Triggered by Vercel Cron (Authorization: Bearer <CRON_SECRET>) OR an
// external scheduler like cron-job.org (?key=<CRON_SECRET>). It checks the
// current time in the user's timezone and sends any DUE web-push reminders,
// de-duplicating so each reminder fires at most once per slot.
//
// Reads the push subscription + prefs the app synced into Supabase
// (app_state row "levelup", keys "push:sub" / "push:prefs"), and tracks
// what was already sent in its own row ("push-state").
//
// Env vars required on Vercel:
//   SUPABASE_URL, SUPABASE_ANON_KEY   (already set for this project)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, (optional) VAPID_SUBJECT
//   CRON_SECRET                        (shared secret for the scheduler)
// ============================================================
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.authorization || '';
  const key = (req.query && req.query.key) || '';
  if (secret && auth !== 'Bearer ' + secret && key !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'supabase env missing' });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID env missing' });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY
  );
  const supa = createClient(URL, KEY);

  // Subscription + prefs (written by the app via cloud sync)
  const { data: lv } = await supa.from('app_state').select('data').eq('key', 'levelup').maybeSingle();
  const D = (lv && lv.data) || {};
  const sub = D['push:sub'];
  const prefs = D['push:prefs'] || {};
  if (!sub) return res.status(200).json({ skipped: 'no subscription' });

  // Current time in the user's timezone
  const tz = prefs.tz || 'Europe/Amsterdam';
  const parts = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).forEach(p => { parts[p.type] = p.value; });
  const hour = parseInt(parts.hour, 10);
  const dateStr = parts.year + '-' + parts.month + '-' + parts.day;

  // What was already sent (only this endpoint writes this row)
  const { data: ps } = await supa.from('app_state').select('data').eq('key', 'push-state').maybeSingle();
  const lastSent = (ps && ps.data && ps.data.lastSent) || {};

  const toSend = [];
  const m = prefs.morning || {};
  if (m.enabled !== false && hour === (m.hour != null ? m.hour : 8) && lastSent.morning !== dateStr) {
    toSend.push({ id: 'morning', mark: () => { lastSent.morning = dateStr; },
      payload: { title: 'Goedemorgen ☀️', body: 'Tijd voor je ochtend check-in.', url: '/daily.html', tag: 'morning' } });
  }
  const h = prefs.hourly || {};
  const start = h.startHour != null ? h.startHour : 9, end = h.endHour != null ? h.endHour : 22;
  if (h.enabled !== false && hour >= start && hour <= end) {
    const hourKey = dateStr + '#' + hour;
    if (lastSent.hourly !== hourKey) {
      toSend.push({ id: 'hourly', mark: () => { lastSent.hourly = hourKey; },
        payload: { title: 'Mood check ✍️', body: 'Hoe voel je je nu? Tik om te loggen.', url: '/daily.html', tag: 'hourly' } });
    }
  }

  const results = [];
  for (const item of toSend) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(item.payload));
      item.mark();
      results.push({ id: item.id, ok: true });
    } catch (e) {
      results.push({ id: item.id, ok: false, code: e && e.statusCode });
    }
  }
  if (toSend.length) {
    await supa.from('app_state').upsert(
      { key: 'push-state', data: { lastSent }, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  }
  return res.status(200).json({ tz, time: hour + ':' + parts.minute, sent: results });
}
