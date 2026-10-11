/* GovCareer AI live notifications inside the Campus Portal.
 * Listens to the official-source feed (same origin: /api/stream + /api/feed) from ANY Campus tab, so a new government
 * notification arrives in the portal the moment the server publishes it, not only when the GovCareer AI sub-tab is open.
 * Shows an accessible toast (click opens Roadmaps & Govt Jobs > GovCareer AI) and an unread badge on that sub-tab.
 * Every value comes from the server feed; nothing is generated here. If the feed endpoint does not exist (Campus deployed
 * alone) this script does nothing. */
(function () {
  'use strict';
  var SEEN = 'gc_feed_seen', UNREAD = 'gc_feed_unread';
  var LABEL = { 'job.new': 'New official notification', 'deadline.extended': 'Deadline extended', 'job.amended': 'Notification amended', 'job.detected': 'Detected on an official site (not yet verified)', 'job.retracted': 'Notification withdrawn' };
  var es = null, retry = 2000, seen = 0, unread = 0, started = false, pollT = null;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, String(v)); } catch (e) {} return null; }
  function signedIn() {
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/TNP_CURRENT_USER$/.test(k)) return /"loggedIn"\s*:\s*true/.test(localStorage.getItem(k) || ''); } } catch (e) {}
    return false;
  }
  function style() {
    if (document.getElementById('gc-live-style')) return;
    var s = document.createElement('style'); s.id = 'gc-live-style';
    s.textContent = '.gc-unread{margin-left:6px;min-width:16px;height:16px;padding:0 4px;border-radius:9999px;background:#e11d48;color:#fff;font-size:9px;font-weight:900;display:inline-flex;align-items:center;justify-content:center}' +
      '#gc-toasts{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;flex-direction:column;gap:8px;max-width:min(380px,calc(100vw - 32px))}' +
      '.gc-toast{background:#0f172a;color:#fff;border-radius:16px;padding:12px 14px;box-shadow:0 12px 34px rgba(0,0,0,.28);font:600 12px/1.4 Inter,system-ui,sans-serif;cursor:pointer;border:1px solid #1e3a5f;text-align:left}' +
      '.gc-toast small{display:block;font-weight:500;color:#93c5fd;margin-top:3px}.gc-toast:focus{outline:2px solid #38bdf8}';
    document.head.appendChild(s);
  }
  function box() {
    var b = document.getElementById('gc-toasts');
    if (!b) { b = document.createElement('div'); b.id = 'gc-toasts'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); }
    return b;
  }
  function openTab() { if (typeof window.__openGovCareer === 'function') window.__openGovCareer(); }
  function toast(title, sub) {
    style(); var t = document.createElement('button'); t.type = 'button'; t.className = 'gc-toast';
    t.textContent = title; if (sub) { var s = document.createElement('small'); s.textContent = sub; t.appendChild(s); }
    t.onclick = function () { openTab(); t.remove(); };
    box().appendChild(t); setTimeout(function () { t.remove(); }, 12000);
  }
  function report() { ls(UNREAD, unread); try { window.dispatchEvent(new CustomEvent('govcareer:unread', { detail: { count: unread } })); } catch (e) {} }
  function handle(kind, d) {
    var id = Number(d && d.feed_id); if (!id || id <= seen) return; seen = id; ls(SEEN, seen);
    if (kind === 'job.retracted') return;
    unread += 1; report();
    var bits = [d.organization, d.vacancies != null ? d.vacancies + ' vacancies' : null, d.application_close ? 'last date ' + d.application_close : null].filter(Boolean).join(' · ');
    toast((LABEL[kind] || 'Update') + ': ' + String(d.title || '').slice(0, 140), bits);
  }
  function catchUp() {
    return fetch('/api/feed?since=' + seen + '&limit=20', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok && /json/.test(r.headers.get('content-type') || '') ? r.json() : null; })
      .then(function (j) {
        if (!j) return false;
        var evs = (j.events || []).filter(function (e) { return e.id > seen && e.kind !== 'RETRACTED'; });
        if (evs.length) { seen = Math.max.apply(null, evs.map(function (e) { return e.id; })); ls(SEEN, seen); unread += evs.length; report(); toast(evs.length + ' new government notification' + (evs.length > 1 ? 's' : '') + ' since you last looked', 'Open GovCareer AI to see them'); }
        else if (!ls(SEEN) && j.max_id) { seen = j.max_id; ls(SEEN, seen); }
        return true;
      }).catch(function () { return false; });
  }
  function connect() {
    if (es) { try { es.close(); } catch (e) {} es = null; }
    if (!('EventSource' in window)) return;
    es = new EventSource('/api/stream');
    es.onopen = function () { retry = 2000; catchUp(); };
    es.onerror = function () { try { es.close(); } catch (e) {} es = null; setTimeout(connect, retry); retry = Math.min(retry * 2, 60000); };
    Object.keys(LABEL).forEach(function (k) { es.addEventListener(k, function (e) { try { handle(k, JSON.parse(e.data)); } catch (x) {} }); });
  }
  function start() {
    if (started || !signedIn()) return; started = true;
    seen = Number(ls(SEEN)) || 0; unread = Number(ls(UNREAD)) || 0;
    window.addEventListener('govcareer:opened', function () { unread = 0; report(); });
    catchUp().then(function (ok) {
      if (!ok) return;                       // no feed here (Campus deployed alone): stay silent
      connect(); pollT = setInterval(catchUp, 60000);   // safety net if the stream is blocked by a proxy
      document.addEventListener('visibilitychange', function () { if (!document.hidden) catchUp(); });
    });
  }
  // The Campus app signs in after load; look for a session for a while, then stop.
  var tries = 0, iv = setInterval(function () { start(); if (started || ++tries > 120) clearInterval(iv); }, 2500);
  window.GovCareerLive = { unread: function () { return unread; }, open: openTab };
})();
