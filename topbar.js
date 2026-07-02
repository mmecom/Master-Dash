// =============================================================
// Persistent dashboard top bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS, reads progress from the same
// localStorage keys the dashboard's tabs already use, and a
// water "+1" button writes to localStorage and (if configured)
// pushes a merged update to the Supabase health row so the
// new bottle appears on every device within ~1 second.
// =============================================================
(function () {
  'use strict';

  // -------- Supabase config (same project as the rest of the dashboard) --------
  // For your audience's standalone, replace these with placeholders
  // and have them paste their own values, just like the other pages.
  // Prefer Vercel env vars (served via /api/config → window.DASH_*),
  // otherwise fall back to these defaults.
  const TOPBAR_SUPABASE_URL = (window.DASH_SUPABASE_URL) || 'https://srajryooffirbroltjmg.supabase.co';
  const TOPBAR_SUPABASE_KEY = (window.DASH_SUPABASE_KEY) || 'sb_publishable_5142ZwTLF_DkSVRzciNuRA_bHwRAu4c';

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; justify-content: flex-end; align-items: center;
  gap: 8px;
  padding: max(10px, env(safe-area-inset-top)) 14px 8px;
  background: #0a0a0b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-water-wrap {
  display: flex; align-items: stretch;
}
.topbar-water-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-right: none;
  border-radius: 12px 0 0 12px;
  text-decoration: none;
  color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
}
.topbar-water-pill .topbar-pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #7DD3FC; flex-shrink: 0;
}
.topbar-water-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-water-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-count {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 700;
  color: #FAFAFA;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.topbar-water-add {
  width: 44px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.28), rgba(110, 231, 183, 0.28));
  color: #FFFFFF;
  font-family: inherit; font-size: 20px; font-weight: 700; line-height: 1;
  cursor: pointer;
  border-radius: 0 12px 12px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.7), rgba(110, 231, 183, 0.7));
}

/* Bottom tab bar — Instagram-style */
.bottombar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  display: flex; justify-content: space-around; align-items: stretch;
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
  background: #0a0a0b;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.bottombar-tab {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px;
  padding: 6px 0 4px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.04em;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
}
.bottombar-tab-icon {
  font-size: 24px; line-height: 1;
  filter: grayscale(100%) brightness(1.2);
  opacity: 0.55;
  transition: opacity 0.15s, filter 0.15s, transform 0.10s;
}
.bottombar-tab.active {
  color: #FAFAFA;
}
.bottombar-tab.active .bottombar-tab-icon {
  filter: grayscale(100%) brightness(1.6);
  opacity: 1;
}
.bottombar-tab:active .bottombar-tab-icon { transform: scale(0.92); }

/* Push page content above the fixed bottom bar */
body.has-bottombar {
  padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
}

@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 6px; }
  .topbar-water-pill { padding: 8px 11px; gap: 6px; }
  .topbar-pill-count { font-size: 12px; }
  .topbar-water-add { width: 40px; font-size: 18px; }
  .bottombar-tab-icon { font-size: 22px; }
  .bottombar-tab { font-size: 10px; }
}

/* === Global mobile lockdown ===
   1) Hide the right-side scrollbar on phones (iOS uses overlay scrollbars anyway).
   2) Stop iOS auto-text-size-adjust.
   3) touch-action: pan-y prevents pinch-zoom while still allowing vertical scroll.
   4) overscroll-behavior on every common modal class stops scroll chaining —
      scrolling inside a settings popup won't drag the page behind it.
   5) When body has .topbar-modal-open, the page can't scroll at all (locked).
*/
html, body {
  -webkit-text-size-adjust: 100%;
}
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open {
  overflow: hidden;
  touch-action: none;
}
/* On phones, blow the modals up to full screen and let them be the only
   scrolling element. Way less "is this scrolling the page or the modal?"
   confusion. */
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100vh !important;
    height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
}

/* Help (?) button + modal */
.topbar-help-btn {
  margin-right: auto;
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05);
  color: #FAFAFA; font-family: inherit; font-size: 16px; font-weight: 700; line-height: 1;
  cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 0.15s;
}
.topbar-help-btn:hover { background: rgba(255,255,255,0.10); }
.help-modal-bg {
  display: none; position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,0.66); backdrop-filter: blur(6px);
  align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto;
}
.help-modal-bg.show { display: flex; }
.help-modal {
  width: 100%; max-width: 560px; margin: auto;
  background: #101012; border: 1px solid rgba(255,255,255,0.09); border-radius: 18px;
  padding: 22px 22px 26px; color: #B8B6B0;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.help-modal h2 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #FAFAFA; }
.help-modal .help-intro { font-size: 13px; color: #76746E; margin: 0 0 16px; line-height: 1.5; }
.help-modal h3 {
  margin: 18px 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #9c9a94;
}
.help-modal p { font-size: 13.5px; line-height: 1.6; margin: 0 0 8px; }
.help-modal code {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 12.5px;
  background: rgba(255,255,255,0.06); color: #E8E5DD; padding: 2px 6px; border-radius: 6px;
  display: inline-block; margin: 2px 0;
}
.help-modal .help-close {
  margin-top: 20px; width: 100%; padding: 13px; border: 0; border-radius: 12px;
  background: linear-gradient(180deg,#FFFFFF,#E8E5DD); color: #0A0A0B;
  font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
}
`;

  // -------- HTML --------
  const topbarHtml = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick actions">
  <button class="topbar-help-btn" id="topbarHelp" type="button" aria-label="How this page works">?</button>
  <div class="topbar-water-wrap">
    <a href="health.html#water" class="topbar-water-pill" id="topbarWater" aria-label="Water progress">
      <span class="topbar-pill-dot"></span>
      <span class="topbar-pill-count" id="topbarWaterCount">0/0</span>
    </a>
    <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">+</button>
  </div>
</header>
`;

  const bottombarHtml = `
<nav class="bottombar" id="bottombar" role="navigation" aria-label="Main tabs">
  <a href="index.html" class="bottombar-tab" data-page="main">
    <span class="bottombar-tab-icon">🏠</span>
    <span>Main</span>
  </a>
  <a href="daily.html" class="bottombar-tab" data-page="daily">
    <span class="bottombar-tab-icon">✅</span>
    <span>Daily</span>
  </a>
  <a href="health.html" class="bottombar-tab" data-page="health">
    <span class="bottombar-tab-icon">💊</span>
    <span>Health</span>
  </a>
  <a href="gym.html" class="bottombar-tab" data-page="fitness">
    <span class="bottombar-tab-icon">💪</span>
    <span>Fitness</span>
  </a>
</nav>
`;

  // When the water tracker is iframed inside health.html, the embedded
  // page shouldn't render its own chrome again.
  function isEmbedded() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function shouldShowChrome() {
    return !isEmbedded();
  }
  function currentPageKey() {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.endsWith('daily.html')) return 'daily';
    if (p.endsWith('health.html')) return 'health';
    if (p.endsWith('gym.html')) return 'fitness';
    return 'main'; // index.html, /, or anything else falls back to main
  }

  function injectStyleAndHTML() {
    if (document.getElementById('topbar') || document.getElementById('bottombar')) return;
    if (!shouldShowChrome()) return;

    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);

    const topWrap = document.createElement('div');
    topWrap.innerHTML = topbarHtml.trim();
    document.body.insertBefore(topWrap.firstChild, document.body.firstChild);

    const bottomWrap = document.createElement('div');
    bottomWrap.innerHTML = bottombarHtml.trim();
    document.body.appendChild(bottomWrap.firstChild);

    // Highlight the active bottom tab.
    const active = currentPageKey();
    document.querySelectorAll('.bottombar-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-page') === active);
    });

    // Reserve room above the fixed bottom bar so page content can scroll
    // past it without being hidden.
    document.body.classList.add('has-bottombar');
  }

  // -------- Active-date helpers (match the goals page 6 AM rollover) --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // -------- Read progress from localStorage --------
  function getGoalsProgress() {
    const key = 'goals:' + activeDateKey();
    let goals = [];
    try { goals = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
    const total = Array.isArray(goals) ? goals.length : 0;
    const done = total ? goals.filter(g => g && g.done).length : 0;
    return { done, total };
  }

  function getStackProgress() {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('stack:items')) || []; } catch (e) {}
    let taken = {};
    try { taken = JSON.parse(localStorage.getItem('stack:taken:' + activeDateKey())) || {}; } catch (e) {}
    const total = Array.isArray(items) ? items.length : 0;
    const done = total ? items.filter(i => i && taken[i.id]).length : 0;
    return { done, total };
  }

  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    // Past 6pm and still under half → flag as missed
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }

  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }

  function render() {
    const waterEl = document.getElementById('topbarWater');
    if (!waterEl) return; // not injected yet

    const w = getWaterProgress();
    const countEl = document.getElementById('topbarWaterCount');
    if (countEl) countEl.textContent = w.total ? w.done + '/' + w.total : '0/0';
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  // -------- Water +1 (works from any page) --------
  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }

  async function pushWaterMergedToSupabase(localWater) {
    // Only do this when we're NOT on the health page — health page
    // has its own sync that already detects the localStorage change.
    if (window.location.pathname.endsWith('/health.html') ||
        window.location.pathname.endsWith('health.html')) return;

    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;

    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) { /* offline — local change will sync next time user visits health */ }
  }

  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();

    const btn = document.getElementById('topbarWaterAdd');
    if (btn) {
      btn.classList.add('flash');
      setTimeout(() => btn.classList.remove('flash'), 220);
    }

    pushWaterMergedToSupabase(state);
  }

  // -------- Mobile lockdown helpers --------
  // Belt-and-suspenders zoom prevention — iOS Safari sometimes ignores
  // user-scalable=no, so we also kill the gesture events directly.
  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    // Also kill the iOS double-tap-to-zoom on any tap.
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }

  // Watch every known modal-bg / overlay class — when any one of them
  // gets `.show` or `.is-open`, lock the body scroll. When the last
  // one closes, unlock.
  function startModalLock() {
    const MODAL_SELECTORS = [
      '.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'
    ];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) {
            return true;
          }
        }
      }
      return false;
    }
    function sync() {
      document.body.classList.toggle('topbar-modal-open', anyOpen());
    }
    const observer = new MutationObserver(sync);
    // Observe class changes anywhere in body — modal toggles are rare so
    // a global subtree observer is cheap.
    observer.observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // -------- Help ("?" → uitleg + berekeningen per pagina) --------
  const HELP = {
    home: {
      title: 'Startscherm',
      intro: 'Tegels naar elke tracker. Tik een tegel om te openen.',
      body: '<p>Elke pagina heeft rechtsboven z\'n eigen <b>?</b> met uitleg over die pagina en de berekeningen die erin zitten.</p>'
    },
    main: {
      title: 'Main — dag & doelen',
      intro: 'Je overzicht voor vandaag. De dag rolt om 06:00 om naar de volgende dag.',
      body:
        '<h3>Dag-ring</h3>' +
        '<p>Laat zien hoeveel van je wakkere dag (08:00–24:00) voorbij is.</p>' +
        '<p><code>% = (uur − 8) / (24 − 8) × 100</code></p>' +
        '<p>Vóór 08:00 telt de ring af tot opstaan; na 24:00 verschijnt “Sleep!”.</p>' +
        '<h3>Doelen & streak</h3>' +
        '<p>Afgevinkt / totaal van vandaag. <b>Streak</b> = aantal dagen op rij dat álle doelen af waren.</p>' +
        '<h3>Today\'s stats</h3>' +
        '<p>Haalt per tracker de dagwaarde op: doelen, habits, mood/energie/slaap, water, cafeïne, gym-sets en gewicht. Geen data = <code>—</code>.</p>'
    },
    health: {
      title: 'Health — WHOOP & supplementen',
      intro: 'Herstel en slaap uit WHOOP, plus je dagelijkse supplement-stack.',
      body:
        '<h3>WHOOP recovery</h3>' +
        '<p>Komt rechtstreeks uit WHOOP.</p>' +
        '<p><code>≥ 67 groen (go hard) · 34–66 amber · &lt; 34 rood (rust)</code></p>' +
        '<h3>Slaap</h3>' +
        '<p>Sleep performance % uit WHOOP: hoeveel slaap je kreeg t.o.v. wat je nodig had.</p>' +
        '<h3>Supplement stack</h3>' +
        '<p>Afgevinkt / totaal per dag.</p>'
    },
    fitness: {
      title: 'Fitness',
      intro: 'Progressive-overload tracker, gewicht en lichaamssamenstelling.',
      body:
        '<h3>Geschat 1RM (Epley)</h3>' +
        '<p><code>1RM = gewicht × (1 + reps / 30)</code> — bij minder dan 2 reps geldt gewoon het gewicht zelf.</p>' +
        '<h3>Volgende sessie</h3>' +
        '<p>Zit je bovenin je rep-range? Dan is het advies: gewicht omhoog met je ingestelde <i>increment</i>.</p>' +
        '<h3>Gewicht</h3>' +
        '<p>7-daagse verschil = nu − gewicht ~7 dagen terug (met %). Het weekoverzicht toont het <b>weekgemiddelde</b> vs de week ervoor.</p>' +
        '<h3>Spier vs vet (schatting, ~30 dagen)</h3>' +
        '<p><code>weightDelta = nu − 30d terug</code></p>' +
        '<p><code>strengthDelta = gem. 1RM nu / 1RM 30d terug</code></p>' +
        '<p>Max spiergroei per week (Lyle McDonald): 1 jaar 0,45 · 2 jaar 0,23 · 3 jaar+ 0,11 kg.</p>' +
        '<p><code>spier = rate × weken × (1 + strengthDelta)</code>, begrensd tussen 0 en weightDelta. <code>vet = weightDelta − spier</code>.</p>' +
        '<h3>Progression</h3>' +
        '<p>Per oefening een lijn van je geschatte 1RM over de tijd. %-verandering = <code>(laatste − eerste) / eerste</code>.</p>'
    },
    daily: {
      title: 'Daily — habits, check-in, journal, insights',
      intro: 'Dagelijkse habits + reflectie. De dag rolt om 06:00 om.',
      body:
        '<h3>Habits</h3>' +
        '<p>Afgevinkt / ingepland vandaag. Ingepland = dagelijks, op gekozen weekdagen, of X× per week. <b>Streak</b> = dagen op rij met alles af.</p>' +
        '<h3>Maandoverzicht</h3>' +
        '<p>Per dag een balk met het dagpercentage.</p>' +
        '<p><code>dag% = afgevinkt uit maand-set / grootte maand-set</code></p>' +
        '<p>De maand-set = alle habits die die maand minstens 1× zijn afgevinkt (vaste noemer, net als je sheet).</p>' +
        '<h3>Insights — completion %</h3>' +
        '<p>Per habit over de gekozen periode (Maand = 30 dagen, Jaar = 365, All = alles). Bij “X×/week” telt per week <code>min(gedaan, target) / target</code>, dus 1×/week gehaald = 100%.</p>' +
        '<h3>Habit → energie</h3>' +
        '<p><code>gem. energie mét habit − gem. energie zónder</code> (minstens 3 dagen elk). Vereist dat je energie logt in de check-in.</p>' +
        '<h3>Trends</h3>' +
        '<p>Gemiddelde van je laatste 30 check-ins (mood / energie / slaap).</p>'
    },
    water: {
      title: 'Water — dagdoel',
      intro: 'Je waterdoel past zich aan op gewicht, beweging, cafeïne e.d.',
      body:
        '<h3>Dagdoel (ml)</h3>' +
        '<p><code>gewicht(kg) × 35</code></p>' +
        '<p>+ beweging: <code>(uur/week ÷ 7) × 500</code></p>' +
        '<p>+ cafeïne: <code>max(0, mg − 200) × 1,5</code></p>' +
        '<p>+ extra middelen · + man <code>+200</code> · + leeftijd ≥ 50 <code>+100</code></p>' +
        '<p>Aantal eenheden = <code>doel ÷ volume per eenheid</code> (fles / glas / oz / ml).</p>'
    },
    caffeine: {
      title: 'Cafeïne',
      intro: 'Hoeveel cafeïne er nu nog actief in je lichaam zit.',
      body:
        '<h3>Actief in je lichaam</h3>' +
        '<p><code>dosis × 0,5 ^ (uren / 5)</code></p>' +
        '<p>Halfwaardetijd ≈ 5 uur: elke 5 uur halveert de hoeveelheid.</p>' +
        '<h3>Dagtotaal</h3>' +
        '<p>Som van alle mg die je vandaag hebt gelogd. FDA-max ≈ 400 mg/dag.</p>' +
        '<h3>Piek & afbouw</h3>' +
        '<p>Piek ~45 min na inname; “cleared” zodra het onder ~10 mg zakt.</p>'
    }
  };
  function helpKey(path) {
    path = (path || '').toLowerCase();
    if (path.endsWith('health.html')) return 'health';
    if (path.endsWith('gym.html')) return 'fitness';
    if (path.endsWith('daily.html')) return 'daily';
    if (path.endsWith('po-water.html')) return 'water';
    if (path.endsWith('caffeine.html')) return 'caffeine';
    if (path.endsWith('index.html') || path === '/' || path === '') return 'home';
    return 'main';
  }
  function openHelp() {
    let bg = document.getElementById('helpModalBg');
    if (!bg) {
      bg = document.createElement('div'); bg.className = 'help-modal-bg'; bg.id = 'helpModalBg';
      bg.innerHTML = '<div class="help-modal"><h2 id="helpTitle"></h2><p class="help-intro" id="helpIntro"></p>' +
        '<div id="helpBody"></div><button class="help-close" id="helpClose" type="button">Sluiten</button></div>';
      document.body.appendChild(bg);
      bg.addEventListener('click', (e) => { if (e.target === bg) bg.classList.remove('show'); });
      bg.querySelector('#helpClose').addEventListener('click', () => bg.classList.remove('show'));
    }
    const h = HELP[helpKey(location.pathname)] || HELP.main;
    bg.querySelector('#helpTitle').textContent = h.title;
    bg.querySelector('#helpIntro').textContent = h.intro;
    bg.querySelector('#helpBody').innerHTML = h.body;
    bg.classList.add('show');
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    const helpBtn = document.getElementById('topbarHelp');
    if (helpBtn) helpBtn.addEventListener('click', openHelp);
    render();
    lockGestures();
    startModalLock();

    // Re-render when localStorage changes from another tab/window OR when
    // the page becomes visible (sync may have pulled in the background).
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    // Periodic refresh so counts stay current after midnight rollover etc.
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
