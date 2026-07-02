// ============================================================
// GET /api/hevy-workouts?page=1&pageSize=10
// Header: X-Hevy-Api-Key: <your Hevy API key>
// Proxies to https://api.hevyapp.com/v1/workouts because Hevy's API
// doesn't send CORS headers, so the browser can't call it directly.
// The key is passed per-request from the browser and forwarded as
// Hevy's `api-key` header — it is NOT stored on the server.
// (Get your key in the Hevy app → Settings → Developer; needs Hevy Pro.)
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Hevy-Api-Key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const key = req.headers['x-hevy-api-key'] || '';
  if (!key) return res.status(401).json({ error: 'missing X-Hevy-Api-Key header' });

  const page     = parseInt((req.query && req.query.page) || '1', 10) || 1;
  let   pageSize = parseInt((req.query && req.query.pageSize) || '10', 10) || 10;
  if (pageSize > 10) pageSize = 10;   // Hevy caps pageSize at 10
  if (pageSize < 1)  pageSize = 1;

  const url = 'https://api.hevyapp.com/v1/workouts?page=' + page + '&pageSize=' + pageSize;
  try {
    const r = await fetch(url, { headers: { 'api-key': key, 'Accept': 'application/json' } });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: 'proxy fetch failed: ' + (e && e.message ? e.message : String(e)) });
  }
}
