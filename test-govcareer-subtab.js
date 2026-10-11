// Wiring checks for the "GovCareer AI" sub-tab (Roadmaps & Govt Jobs > next to Govt Jobs). Dependency-free.
const fs = require('fs'); const assert = require('assert');
const rt = fs.readFileSync('campus/frontend/app-runtime.js', 'utf8');
const server = fs.readFileSync('server.js', 'utf8');
const index = fs.readFileSync('public/index.html', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');
const t = (n, f) => { f(); console.log('ok -', n); };
t('sub-tab button sits right after Govt Jobs in the switcher', () => {
  assert.ok(/"1000\+ Govt Jobs"\),\s*React\.createElement\("button", \{ onClick: \(\) => setCtSector\('govcareer'\)[\s\S]{0,500}"GovCareer AI"\)\)\),/.test(rt));
});
t('panel renders only for careerTracks + govcareer sector', () => assert.ok(rt.includes("activeTab === 'careerTracks' && ctSector === 'govcareer' && React.createElement(GovCareerAiPanel")));
t('no new top-level tab was added', () => assert.strictEqual((rt.match(/id: 'careerTracks'/g) || []).length, (fs.readFileSync('campus/mainapp.js', 'utf8').match(/id: 'careerTracks'/g) || []).length));
t('workspace bar + gate expose GovCareer AI', () => { assert.ok(rt.includes("['govcareer','GovCareer AI']")); assert.ok(rt.includes("setCtSector('govcareer')")); });
t('availability is probed against a GovCareer-only endpoint', () => assert.ok(rt.includes("fetch('/api/meta'") && rt.includes('j.levels')));
t('GovCareer allows same-origin framing only', () => { assert.ok(server.includes("'X-Frame-Options': 'SAMEORIGIN'") && server.includes("frame-ancestors 'self'")); assert.ok(!server.includes("frame-ancestors 'none'")); });
t('embed assets are linked and cached', () => { assert.ok(index.includes('embed.css') && index.includes('embed.js') && sw.includes('/embed.css') && sw.includes('/embed.js')); });
t('embed.js activates only for ?embed=campus inside a same-origin frame', () => { const e = fs.readFileSync('public/embed.js', 'utf8'); assert.ok(e.includes('embed=campus') && e.includes('window.parent !== window') && e.includes('location.origin')); });
t('every embed.css rule is scoped to html.gc-embed', () => { const css = fs.readFileSync('public/embed.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); css.split('}').map(r => r.split('{')[0].trim()).filter(s => s && !s.startsWith('@media')).forEach(sel => assert.ok(sel.split(',').every(x => x.trim().startsWith('html.gc-embed')), sel)); });
t('embedded GovCareer never leaves the sub-tab: Campus links go to the parent, sign-in/out do not navigate the frame', () => {
  const e = fs.readFileSync('public/embed.js', 'utf8'), a = fs.readFileSync('public/account.js', 'utf8');
  assert.ok(e.includes("govcareer-embed-nav") && e.includes('preventDefault') && e.includes('/^\\/campus(\\/|$)/'));
  assert.ok(a.includes("classList.contains('gc-embed')") && a.includes('if (EMBEDDED)'));
  assert.ok(/EMBEDDED\) \{ toast\('Signed out of GovCareer AI/.test(a), 'embedded sign-out must keep the Campus session');
  assert.ok(rt.includes("e.data.type === 'govcareer-embed-nav'") && rt.includes('onCampusNav'));
  assert.ok(sw.includes('govcareer-shell-v21'));
});
console.log('GovCareer AI sub-tab wiring checks passed');
