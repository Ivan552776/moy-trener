/* Анимации шагов «Поварской книги»: вид строго сверху (как у Kitchen Stories), сцены SVG, кадр считает код (requestAnimationFrame, только transform/opacity и пара атрибутов).
   Сцена — шаблон действия, параметры — содержимое шага: что режем (форма и цвет из продукта), что в кастрюле, что на сковороде.
   Звуки синтезирует Web Audio прямо в браузере — без файлов и чужих лицензий (docs/zvuki-istochniki.md). По умолчанию выключены.
   CA.mount(el, CA.cut('morkov')) — сцена в элемент; CA.sound(true) — звук; «уменьшить движение» — статичный кадр. */
(function () {
const BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/[^/]*$/, ''); // рядом лежит папка snd/
const NS = 'http://www.w3.org/2000/svg', RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
let UID = 0;
function E(tag, a, p) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e }
function H(p, html) { const g = E('g', {}, p); g.innerHTML = html; return g }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
const eOut = k => 1 - Math.pow(1 - k, 3), eIn = k => k * k * k, eIO = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2) };
// детерминированный шум — кадр одинаковый при каждом открытии
const R = (i, a = 0, b = 1) => a + (b - a) * ((((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1);
const wob = (t, s) => Math.sin(t * 7.1 + s) * .6 + Math.sin(t * 13.3 + s * 2.1) * .4;

function defs(svg, html) { const d = E('defs', {}, svg); d.innerHTML = html; return d }

/* ---------- продукты: цвет, свет, тень ---------- */
const F = {
  morkov: { c: '#F2871F', l: '#FFB45C', d: '#B8560F', core: '#FFC77D', n: 'морковь', cut: 'coin' },
  luk: { c: '#F1DDA6', l: '#FFF6DC', d: '#C9A35B', skin: '#C98C3E', n: 'лук', cut: 'cube' },
  kur: { c: '#F1D7B6', l: '#FFF0DE', d: '#C79A6A', n: 'курица', cut: 'chunk' },
  svekla: { c: '#8E1B3A', l: '#C2456A', d: '#56091F', n: 'свёкла' },
  kapusta: { c: '#D6EBB6', l: '#F2FAE6', d: '#9CC06E', n: 'капуста' },
  kartofel: { c: '#EED08C', l: '#FFF0C8', d: '#C49A48', n: 'картофель' },
  grechka: { c: '#93602F', l: '#C58E56', d: '#5E3A18', n: 'гречка' },
  ukrop: { c: '#5FA641', l: '#8BCB6A', d: '#3D7A28', n: 'укроп' },
};

/* ---------- вид сверху: столешница, общий свет слева сверху, тени вниз-вправо ---------- */
const VB = '0 0 340 180';
function scene(dec = []) { const id = ++UID, svg = E('svg', { viewBox: VB, 'aria-hidden': 'true' }); svg._id = id;
  defs(svg, `<radialGradient id="tbl${id}" gradientUnits="userSpaceOnUse" cx="70" cy="10" r="380"><stop offset="0" stop-color="var(--ct0,#F6F0E6)"/><stop offset=".55" stop-color="var(--ct1,#E8DECF)"/><stop offset="1" stop-color="var(--ct2,#D6C8B3)"/></radialGradient>
   <filter id="sb${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2"/></filter>
   <filter id="sbs${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter>
   <radialGradient id="puff${id}"><stop offset="0" stop-color="var(--steam,#fff)" stop-opacity=".7"/><stop offset=".5" stop-color="var(--steam,#fff)" stop-opacity=".28"/><stop offset="1" stop-color="var(--steam,#fff)" stop-opacity="0"/></radialGradient>`);
  E('rect', { x: -300, y: -300, width: 940, height: 780, fill: `url(#tbl${id})` }, svg);
  H(svg, [...Array(90)].map((_, i) => `<ellipse cx="${R(i, -20, 360).toFixed(1)}" cy="${R(i + 9, -10, 190).toFixed(1)}" rx="${R(i + 3, .5, 1.5).toFixed(2)}" ry="${R(i + 5, .4, 1).toFixed(2)}" fill="var(--speck,#9C8B73)" opacity="${R(i + 7, .1, .26).toFixed(2)}"/>`).join(''));
  decor(svg, id, dec); return { id, svg } }
// мягкая тень предмета: та же форма, смещена вниз-вправо и размыта
const shade = (id, body, dx = 6, dy = 8, op = .22) => `<g transform="translate(${dx} ${dy})" filter="url(#sb${id})" opacity="${op}">${body}</g>`;
const metalDefs = id => `<radialGradient id="rim${id}" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#F4F6F8"/><stop offset=".45" stop-color="#C3CAD1"/><stop offset=".8" stop-color="#8E979F"/><stop offset="1" stop-color="#6E767E"/></radialGradient>
 <radialGradient id="wal${id}" cx=".66" cy=".72" r=".75"><stop offset="0" stop-color="#D7DDE2"/><stop offset=".7" stop-color="#9AA3AB"/><stop offset="1" stop-color="#6E767E"/></radialGradient>
 <linearGradient id="hnd${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9D0D6"/><stop offset=".5" stop-color="#8E979F"/><stop offset="1" stop-color="#6E767E"/></linearGradient>
 <radialGradient id="cast${id}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#4A4540"/><stop offset=".55" stop-color="#2B2C2E"/><stop offset="1" stop-color="#17181A"/></radialGradient>
 <radialGradient id="castr${id}" cx=".3" cy=".25" r=".95"><stop offset="0" stop-color="#6A7076"/><stop offset=".5" stop-color="#34383C"/><stop offset="1" stop-color="#1B1D1F"/></radialGradient>
 <linearGradient id="wood${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EEBF83"/><stop offset=".6" stop-color="#DBA265"/><stop offset="1" stop-color="#C98E50"/></linearGradient>
 <linearGradient id="spat${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C98F55"/><stop offset=".45" stop-color="#F0C892"/><stop offset="1" stop-color="#B87E45"/></linearGradient>
 <linearGradient id="bld${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7F9FA"/><stop offset=".35" stop-color="#D3D9DE"/><stop offset=".7" stop-color="#A7B0B8"/><stop offset="1" stop-color="#7E8790"/></linearGradient>
 <linearGradient id="khd${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#454C52"/><stop offset=".5" stop-color="#22272B"/><stop offset="1" stop-color="#0F1215"/></linearGradient>
 <radialGradient id="coin${id}" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#FFC27A"/><stop offset=".55" stop-color="#F59A3B"/><stop offset="1" stop-color="#D96D12"/></radialGradient>
 <radialGradient id="chk${id}" cx=".4" cy=".36" r=".7"><stop offset="0" stop-color="#F8E6CB"/><stop offset=".5" stop-color="#EAC48E"/><stop offset=".85" stop-color="#C98A45"/><stop offset="1" stop-color="#9A5A22"/></radialGradient>
<radialGradient id="em${id}" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#34D399"/><stop offset=".45" stop-color="#059669"/><stop offset=".85" stop-color="#047857"/><stop offset="1" stop-color="#065F46"/></radialGradient>
 <radialGradient id="emw${id}" cx=".64" cy=".7" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#EEF1EF"/><stop offset="1" stop-color="#CDD6D1"/></radialGradient>
 <linearGradient id="emh${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10B981"/><stop offset=".55" stop-color="#047857"/><stop offset="1" stop-color="#064E3B"/></linearGradient>
 <radialGradient id="bub${id}" cx=".36" cy=".32" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fff" stop-opacity=".25"/><stop offset=".8" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></radialGradient>`;

/* кусочки сверху (центр 0,0) */
function top(p, f, kind, s = 1, seed = 0, id = UID) {
  const P = F[f], g = E('g', {}, p);
  switch (kind) {
    case 'coin': H(g, `<circle r="${7.6 * s}" fill="url(#coin${id})"/><circle r="${7.6 * s}" fill="none" stroke="${P.d}" stroke-width=".9" opacity=".7"/><circle r="${3.4 * s}" fill="#FFD08F" opacity=".9"/>
      ${[0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3 + seed; return `<path d="M${(Math.cos(a) * 3.6 * s).toFixed(1)} ${(Math.sin(a) * 3.6 * s).toFixed(1)}L${(Math.cos(a) * 6.6 * s).toFixed(1)} ${(Math.sin(a) * 6.6 * s).toFixed(1)}" stroke="#E07A1C" stroke-width=".5" opacity=".5"/>` }).join('')}<path d="M${-5 * s} ${-3 * s}A${6 * s} ${6 * s} 0 0 1 ${2 * s} ${-6 * s}" stroke="#fff" stroke-width="1.2" fill="none" opacity=".55" stroke-linecap="round"/>`); break;
    case 'cube': { const on = f === 'luk', c0 = on ? '#FBF5E6' : P.l, c1 = on ? '#E3D2AC' : P.d; // лук — перламутровый, картофель — жёлтый
      H(g, `<g transform="rotate(${R(seed, -30, 30).toFixed(0)})"><rect x="${-4.4 * s}" y="${-4.4 * s}" width="${8.8 * s}" height="${8.8 * s}" rx="${1.8 * s}" fill="${on ? c0 : P.c}"/><rect x="${-4.4 * s}" y="${-4.4 * s}" width="${8.8 * s}" height="${4.4 * s}" rx="${1.8 * s}" fill="${c0}" opacity=".7"/><rect x="${-4.4 * s}" y="${-4.4 * s}" width="${8.8 * s}" height="${8.8 * s}" rx="${1.8 * s}" fill="none" stroke="${c1}" stroke-width=".8"/>
      <path d="M${-3 * s} ${-3 * s}H${2.6 * s}" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>${on ? `<path d="M${-2 * s} ${.5 * s}H${2.6 * s}M${-2 * s} ${2.6 * s}H${2.2 * s}" stroke="#E8DAB8" stroke-width=".6"/>` : ''}</g>`); break }
    case 'chunk': { const r = i => (R(seed * 7 + i, .78, 1.1) * 8.5 * s).toFixed(1);
      H(g, `<g transform="rotate(${R(seed, 0, 180).toFixed(0)})"><path d="M${-r(1)} 0Q${-r(2)} ${-r(3) * .8} 0 ${-r(4) * .85}Q${r(5)} ${-r(6) * .8} ${r(7)} 0Q${r(8)} ${r(1) * .8} 0 ${r(2) * .85}Q${-r(3)} ${r(4) * .75} ${-r(1)} 0Z" fill="url(#chk${id})"/>
       <path d="M${-r(2) * .55} ${-r(3) * .35}Q0 ${-r(4) * .62} ${r(5) * .5} ${-r(6) * .3}" stroke="#fff" stroke-width="1.3" fill="none" opacity=".5" stroke-linecap="round"/></g>`); break }
    case 'stick': H(g, `<g transform="rotate(${R(seed, 0, 180).toFixed(0)})"><rect x="${-2.4 * s}" y="${-8 * s}" width="${4.8 * s}" height="${16 * s}" rx="${1.6 * s}" fill="${P.c}"/><rect x="${-1.4 * s}" y="${-7 * s}" width="${1.2 * s}" height="${12 * s}" rx=".6" fill="${P.l}" opacity=".65"/></g>`); break;
    case 'strip': H(g, `<g transform="rotate(${R(seed, 0, 180).toFixed(0)})"><path d="M${-10 * s} 0Q0 ${-5 * s} ${10 * s} 0" stroke="${P.c}" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/><path d="M${-7 * s} -1Q0 ${-4.4 * s} ${6 * s} -1" stroke="${P.l}" stroke-width=".8" fill="none" opacity=".8"/></g>`); break;
    case 'grain': { const tone = ['#8A5A2B', '#A06A35', '#7A4C22', '#B07A42'][seed % 4];
      H(g, `<g transform="rotate(${R(seed, 0, 360).toFixed(0)})"><path d="M0 ${-3.2 * s}C${2.5 * s} ${-2.4 * s} ${2.6 * s} ${1.6 * s} 0 ${2.9 * s}C${-2.6 * s} ${1.6 * s} ${-2.5 * s} ${-2.4 * s} 0 ${-3.2 * s}Z" fill="${tone}"/><ellipse cx="${-.9 * s}" cy="${-1.1 * s}" rx="${.7 * s}" ry="${1.1 * s}" fill="#E2B883" opacity=".75"/></g>`); break }
    case 'speck': H(g, `<path d="M${-3 * s} 0Q0 ${-2 * s} ${3 * s} ${-.5 * s}" stroke="${P.c}" stroke-width="${1.2 * s}" fill="none" stroke-linecap="round" transform="rotate(${R(seed, 0, 180).toFixed(0)})"/>`); break;
  }
  return g
}
const KIND = { morkov: 'coin', luk: 'cube', kur: 'chunk', svekla: 'stick', kapusta: 'strip', kartofel: 'cube', grechka: 'grain', ukrop: 'speck' };

/* пар к зрителю: клубы растут и тают */
function steamUp(p, id, n, cx, cy, spread) {
  const P = [...Array(n)].map((_, i) => ({ e: E('circle', { r: 18, fill: `url(#puff${id})`, opacity: 0 }, p), a: R(i, 0, 6.283), r: R(i + 3, 0, spread), s: R(i + 5, 0, 3), d: R(i + 7, 2.4, 3.4) }));
  return t => P.forEach(q => { const k = ((t + q.s) % q.d) / q.d, x = cx + Math.cos(q.a) * q.r - k * 10, y = cy + Math.sin(q.a) * q.r * .6 - k * 14;
    q.e.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(.5 + k * 1.6).toFixed(2)})`); q.e.setAttribute('opacity', (Math.sin(k * Math.PI) * .7).toFixed(2)) })
}
/* круги на воде сверху */
function rings(p, n, col = '#fff') { const P = [...Array(n)].map(() => E('circle', { fill: 'none', stroke: col, 'stroke-width': 1.3, opacity: 0 }, p)); let k = 0;
  return { at: (x, y, t0, big = 1) => { const e = P[k++ % n]; e._x = x; e._y = y; e._t = t0; e._b = big }, frame: t => P.forEach(e => { if (e._t == null) return; const a = (t - e._t) / .95; if (a < 0 || a > 1) { e.setAttribute('opacity', 0); return }
    e.setAttribute('cx', e._x); e.setAttribute('cy', e._y); e.setAttribute('r', ((3 + a * 26) * e._b).toFixed(1)); e.setAttribute('opacity', ((1 - a) * .6).toFixed(2)) }) } }

/* кастрюля сверху: тень, ручки, ободок, внутренняя стенка, содержимое по кругу */
function potTop(svg, id, cx, cy, R0) { // эмалированная кастрюля фирменного изумрудного цвета, белая эмаль внутри, белый ободок
  H(svg, shade(id, `<circle cx="${cx}" cy="${cy}" r="${R0 + 2}"/><rect x="${cx - R0 - 22}" y="${cy - 7}" width="${2 * R0 + 44}" height="14" rx="7"/>`, 7, 9, .3));
  H(svg, shade(id, `<circle cx="${cx}" cy="${cy}" r="${R0}"/>`, 1.5, 2.2, .42).replace(`filter="url(#sb${id})"`, `filter="url(#sbs${id})"`)); // контактная тень — посуда стоит
  H(svg, `<rect x="${cx - R0 - 22}" y="${cy - 7}" width="${2 * R0 + 44}" height="14" rx="7" fill="url(#emh${id})"/><rect x="${cx - R0 - 18}" y="${cy - 3.5}" width="14" height="7" rx="3.5" fill="var(--ct1,#E8DECF)"/><rect x="${cx + R0 + 4}" y="${cy - 3.5}" width="14" height="7" rx="3.5" fill="var(--ct1,#E8DECF)"/>
   <circle cx="${cx}" cy="${cy}" r="${R0}" fill="url(#em${id})"/><circle cx="${cx}" cy="${cy}" r="${R0 - 3.2}" fill="#F7FAF8"/><circle cx="${cx}" cy="${cy}" r="${R0 - 5.5}" fill="url(#emw${id})"/>`);
  defs(svg, `<clipPath id="pc${id}"><circle cx="${cx}" cy="${cy}" r="${R0 - 5.5}"/></clipPath>`);
  const inner = E('g', { 'clip-path': `url(#pc${id})` }, svg);
  H(svg, `<circle cx="${cx}" cy="${cy}" r="${R0 - 4.3}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".9"/><path d="M${cx - R0 + 2} ${cy - 10}A${R0 - 2} ${R0 - 2} 0 0 1 ${cx - 10} ${cy - R0 + 2}" stroke="#fff" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`);
  return { inner, cx, cy, r: R0 - 5.5 }
}
/* сковорода сверху: чугун, ручка вправо-вниз */
function panTop(svg, id, cx, cy, R0) {
  const hx = cx + R0 * .86, hy = cy + R0 * .5;
  H(svg, shade(id, `<circle cx="${cx}" cy="${cy}" r="${R0}"/><path d="M${hx} ${hy - 7}L${hx + 92} ${hy + 30}L${hx + 86} ${hy + 44}L${hx - 6} ${hy + 6}Z"/>`, 7, 9, .32));
  H(svg, shade(id, `<circle cx="${cx}" cy="${cy}" r="${R0}"/>`, 1.5, 2.2, .45).replace(`filter="url(#sb${id})"`, `filter="url(#sbs${id})"`));
  H(svg, `<path d="M${hx - 4} ${hy - 8}L${hx + 90} ${hy + 28}Q${hx + 98} ${hy + 32} ${hx + 94} ${hy + 40}Q${hx + 90} ${hy + 47} ${hx + 82} ${hy + 43}L${hx - 10} ${hy + 6}Z" fill="url(#khd${id})"/><circle cx="${hx + 84}" cy="${hy + 36}" r="3.6" fill="var(--ct1,#E8DECF)"/>
   <circle cx="${cx}" cy="${cy}" r="${R0}" fill="url(#castr${id})"/><circle cx="${cx}" cy="${cy}" r="${R0 - 7}" fill="url(#cast${id})"/>
   <path d="M${cx - R0 + 4} ${cy - 12}A${R0 - 4} ${R0 - 4} 0 0 1 ${cx - 12} ${cy - R0 + 4}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".35" stroke-linecap="round"/>`);
  const shine = [...Array(5)].map((_, i) => E('ellipse', { rx: R(i, 5, 12), ry: R(i + 2, 1.2, 2.4), fill: '#FFF1C4', opacity: 0, transform: '' }, svg));
  return { cx, cy, r: R0 - 9, shine: t => shine.forEach((e, i) => { const k = (t * .22 + i / 5) % 1, a = -2.3 + k * 1.6; e.setAttribute('cx', (cx + Math.cos(a) * (R0 - 22)).toFixed(1)); e.setAttribute('cy', (cy + Math.sin(a) * (R0 - 22)).toFixed(1)); e.setAttribute('opacity', (Math.sin(k * Math.PI) * .45).toFixed(2)) }) }
}

/* ---------- 1. Нарезать (сверху): доска, морковь, нож поперёк; при замахе нож ближе к камере — больше и тень дальше ---------- */
function cut(f = 'morkov') {
  const { id, svg } = scene(['salt']), P = F[f];
  defs(svg, metalDefs(id) + `<linearGradient id="car${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.l}"/><stop offset=".45" stop-color="${P.c}"/><stop offset="1" stop-color="${P.d}"/></linearGradient>
   <radialGradient id="onT${id}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#FBEFD0"/><stop offset=".6" stop-color="#E8C98A"/><stop offset="1" stop-color="#B98447"/></radialGradient>`);
  // доска
  H(svg, shade(id, `<rect x="40" y="26" width="262" height="128" rx="14"/>`, 7, 10, .42) + `<rect x="40" y="26" width="262" height="128" rx="14" fill="#A86A33"/>${shade(id, '<rect x="40" y="26" width="262" height="128" rx="14"/>', 1.4, 2, .4).replace(`filter="url(#sb${id})"`, `filter="url(#sbs${id})"`)}<rect x="40" y="26" width="262" height="128" rx="14" fill="#A86A33"/><rect x="42" y="27.5" width="258" height="124" rx="12.5" fill="url(#wood${id})"/>
   ${[...Array(9)].map((_, i) => `<path d="M${48 + R(i, 0, 14)} ${36 + i * 13 + R(i + 1, -2, 2)}Q${150 + R(i + 2, -30, 30)} ${34 + i * 13 + R(i + 3, -3, 3)} ${300 - R(i + 4, 0, 16)} ${37 + i * 13}" stroke="#A9692F" stroke-width=".7" fill="none" opacity="${R(i + 5, .14, .28).toFixed(2)}"/>`).join('')}
   <rect x="42.5" y="28" width="257" height="123" rx="12" fill="none" stroke="#fff" stroke-width="1" opacity=".35"/><rect x="40" y="26" width="262" height="128" rx="14" fill="none" stroke="#8E5626" stroke-width="1" opacity=".55"/><circle cx="286" cy="42" r="5" fill="#A9692F" opacity=".45"/>`);
  const CX = 196, CY = 90, prod = E('g', {}, svg);
  if (P.cut === 'coin') H(prod, shade(id, `<path d="M100 76.5C130 76 166 80 ${CX} 82L${CX} 98C166 100 130 104.5 100 104C90 103 86 97 86 90C86 83 90 77.5 100 76.5Z"/>`, 4, 6, .28) +
    `<g stroke-linecap="round" fill="none">${[['#2F6B22', 4, 'M88 88Q72 80 60 70'], ['#3F8A2E', 3.4, 'M88 86Q76 70 76 54'], ['#5FA641', 3, 'M87 92Q70 96 56 96'], ['#7BC05A', 2.4, 'M89 84Q86 68 94 56'], ['#4E9A38', 2.6, 'M88 94Q74 106 64 114']].map(([c, w, d]) => `<path d="${d}" stroke="${c}" stroke-width="${w}"/>`).join('')}
     <path d="M76 54q-6-4-4-10M94 56q-3-6 3-10M60 70q-8-2-10-8M56 96q-8 0-12-6M64 114q-6 3-12 0" stroke="#7BC05A" stroke-width="2"/></g>
     <path d="M100 76.5C130 76 166 80 ${CX} 82L${CX} 98C166 100 130 104.5 100 104C90 103 86 97 86 90C86 83 90 77.5 100 76.5Z" fill="url(#car${id})"/>
     ${[...Array(9)].map((_, i) => { const x = 104 + i * 10.2, h = lerp(26, 16, i / 9); return `<path d="M${x} ${90 - h / 2}q1.8 ${h / 2} 0 ${h}" stroke="${P.d}" stroke-width=".8" fill="none" opacity="${R(i, .22, .4).toFixed(2)}"/>` }).join('')}
     <path d="M96 80C130 79 166 82.5 ${CX - 4} 84.5" stroke="#fff" stroke-width="2.6" fill="none" opacity=".5" stroke-linecap="round"/>`);
  else if (P.cut === 'cube') { const ox = CX - 42, oy = CY, L = ox - 42;
    defs(svg, `<radialGradient id="pearl${id}" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#FFFEFA"/><stop offset=".7" stop-color="#F7F0DE"/><stop offset="1" stop-color="#EADBB8"/></radialGradient>
     <linearGradient id="skin${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8BE78"/><stop offset=".6" stop-color="#C98C3E"/><stop offset="1" stop-color="#9C6528"/></linearGradient><clipPath id="oc${id}"><rect x="0" y="0" width="${CX + 1}" height="200"/></clipPath>`);
    const og = E('g', { 'clip-path': `url(#oc${id})` }, prod);
    H(og, shade(id, `<ellipse cx="${ox}" cy="${oy}" rx="45" ry="33"/>`, 4, 6, .3) + `<ellipse cx="${ox}" cy="${oy}" rx="45" ry="33" fill="url(#skin${id})"/><ellipse cx="${ox}" cy="${oy}" rx="42" ry="30.5" fill="url(#pearl${id})"/>
     ${[.82, .66, .5, .34, .2].map(k => `<ellipse cx="${(L + 42 * k).toFixed(1)}" cy="${oy}" rx="${(42 * k).toFixed(1)}" ry="${(30.5 * k).toFixed(1)}" fill="none" stroke="#E2D1A9" stroke-width="1.1"/>`).join('')}
     <path d="M${L + 1} ${oy - 4}q-6 -1 -9 -5M${L + 1} ${oy}h-10M${L + 1} ${oy + 4}q-6 1 -9 5" stroke="#8E6232" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="${L + 3}" cy="${oy}" rx="3" ry="4.5" fill="#B9874A"/>
     <path d="M${ox - 24} ${oy - 20}Q${ox} ${oy - 30} ${ox + 22} ${oy - 22}" stroke="#fff" stroke-width="2.4" fill="none" opacity=".75" stroke-linecap="round"/>
     <path d="M${ox + 30} ${oy - 22}Q${ox + 44} ${oy - 8} ${ox + 42} ${oy + 10}" stroke="#7E4E1E" stroke-width="1" fill="none" opacity=".45"/>`) }
  else H(prod, shade(id, `<path d="M88 72Q130 64 ${CX} 74L${CX} 106Q130 116 88 108Q74 90 88 72Z"/>`, 4, 6, .28) + `<path d="M88 72Q130 64 ${CX} 74L${CX} 106Q130 116 88 108Q74 90 88 72Z" fill="url(#chk${id})"/>`);
  // нож сверху: клинок поперёк продукта, рукоять к зрителю (вниз)
  const ksh = E('g', { filter: `url(#sb${id})` }, svg), ksp = E('path', { d: 'M3 -74Q6 -68 7 -58L8 24L-16 24Q-17 -12 -6 -50Q-1 -66 3 -74Z', fill: '#000' }, ksh);
  const knife = E('g', {}, svg);
  H(knife, `<path d="M3 -74Q6 -68 7 -58L8 24L-16 24Q-17 -12 -6 -50Q-1 -66 3 -74Z" fill="url(#bld${id})"/>
   <path d="M3 -74Q-1 -66 -6 -50Q-17 -12 -16 24" stroke="#fff" stroke-width="1.3" fill="none" opacity=".95"/><path d="M1 -66Q-4 -52 -9 -34Q-13 -12 -12 22" stroke="#B9C1C8" stroke-width="2.2" fill="none" opacity=".8"/>
   <path d="M6 -58L7 22" stroke="#5E666E" stroke-width="1.6" opacity=".85"/><path d="M-2 -40Q-5 -12 -4 18" stroke="#fff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
   <path d="M-17 23H9V30H-17Z" fill="#C9D0D6"/><path d="M-17 29H9" stroke="#8E979F" stroke-width="1"/><path d="M-9 30H6Q8 30 8 33V78Q8 85 -0.5 85Q-9 85 -9 78V33Q-9 30 -7 30Z" fill="url(#khd${id})"/>
   <circle cx="-.5" cy="44" r="2" fill="#D7DDE2"/><circle cx="-.5" cy="58" r="2" fill="#D7DDE2"/><circle cx="-.5" cy="72" r="2" fill="#D7DDE2"/><path d="M-6 35V80" stroke="#fff" stroke-width=".9" opacity=".25"/>`);
  const pile = E('g', {}, svg), N = 6, T = 4.2, STEP = .55, T0 = .25, sl = [];
  for (let i = 0; i < N; i++) { const w = E('g', { opacity: 0 }, pile); const k = P.cut === 'coin' ? 'coin' : P.cut === 'cube' ? 'cube' : 'chunk';
    H(w, shade(id, k === 'coin' ? '<circle r="7.6"/>' : k === 'cube' ? '<rect x="-4.4" y="-4.4" width="8.8" height="8.8" rx="2"/>' : '<circle r="8"/>', 1.6, 2.2, .3).replace(`filter="url(#sb${id})"`, `filter="url(#sbs${id})"`));
    top(w, f, k, 1, i, id); sl.push({ w, sx: 216 + (i % 3) * 11 + R(i, -2.5, 2.5), sy: 78 + Math.floor(i / 3) * 12 + R(i + 4, -3, 3) + (P.cut === 'coin' ? 0 : 6) }) }
  let last = -1;
  function frame(t, emit) {
    t %= T; const tc = t - T0, i = Math.floor(tc / STEP), ph = tc - i * STEP;
    // подъём (замедляется) — пауза — быстрый удар — отскок; «выше» = ближе к камере: крупнее, тень дальше и мягче
    let up = 0;
    if (tc >= 0 && i < N) { up = ph < .24 ? eOut(ph / .24) : ph < .31 ? 1 : ph < .4 ? 1 - eIn((ph - .31) / .09) : ph < .47 ? .1 * Math.sin((ph - .4) / .07 * Math.PI) : 0;
      if (ph >= .4 && i !== last) { last = i; emit && emit('chop', f) } }
    else if (tc >= N * STEP) up = .7 * Math.sin(clamp((tc - N * STEP) / 1.4) * Math.PI);
    if (t < T0) last = -1;
    const done = tc < 0 ? 0 : Math.min(N, Math.floor((tc - .4) / STEP) + 1), back = eIO(clamp((tc - N * STEP - .5) / .8)), feed = done * 3.2 * (1 - back);
    prod.setAttribute('transform', `translate(${feed.toFixed(1)} 0)`);
    const kx = CX + 3 + feed, ky = CY;
    knife.setAttribute('transform', `translate(${kx.toFixed(1)} ${(ky - up * 3).toFixed(1)}) scale(${(1 + up * .07).toFixed(3)}) rotate(${(up * -3).toFixed(1)})`);
    ksh.setAttribute('transform', `translate(${(kx + 3 + up * 9).toFixed(1)} ${(ky + 4 + up * 11).toFixed(1)})`); ksh.setAttribute('opacity', (.32 - up * .14).toFixed(2));
    sl.forEach((s, k) => { const ts = tc - (k * STEP + .4); if (ts < 0) { s.w.setAttribute('opacity', 0); return }
      const fl = eOut(clamp(ts / .5)), x = lerp(kx + 9, s.sx, fl) + back * 30, y = lerp(ky + R(k, -6, 6), s.sy, fl), hopS = 1 + Math.sin(clamp(ts / .5) * Math.PI) * .12;
      s.w.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${hopS.toFixed(3)})`); s.w.setAttribute('opacity', ((1 - back) * clamp(ts / .05)).toFixed(2)) })
  }
  return { svg, frame, T, title: 'Нарезать', sub: `${P.n} — ${P.cut === 'coin' ? 'кружками' : P.cut === 'cube' ? 'кубиком' : 'кусочками'}`, sound: 'chop' }
}

/* ---------- 2. Налить воду (сверху): струя бьёт в точку, круги расходятся, гладь растёт к стенкам ---------- */
function pour() {
  const { id, svg } = scene(['towel']);
  defs(svg, metalDefs(id) + `<radialGradient id="wat${id}" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#9FDAF7"/><stop offset=".7" stop-color="#5DB4E6"/><stop offset="1" stop-color="#3E93CC"/></radialGradient>
   <radialGradient id="jug${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".6" stop-color="#E6F3FA" stop-opacity=".35"/><stop offset="1" stop-color="#BFDCEB" stop-opacity=".55"/></radialGradient>`);
  const pot = potTop(svg, id, 196, 92, 74);
  const wat = E('circle', { cx: pot.cx, cy: pot.cy, r: pot.r, fill: `url(#wat${id})`, opacity: 0 }, pot.inner), cres = E('path', { d: `M${pot.cx - pot.r * .78} ${pot.cy - pot.r * .1}A${pot.r * .8} ${pot.r * .8} 0 0 1 ${pot.cx + pot.r * .1} ${pot.cy - pot.r * .78}A${pot.r * .95} ${pot.r * .95} 0 0 0 ${pot.cx - pot.r * .78} ${pot.cy - pot.r * .1}Z`, fill: '#fff', opacity: 0 }, pot.inner), glint = E('ellipse', { rx: 18, ry: 5, fill: '#fff', opacity: .28, transform: `rotate(-30 ${pot.cx - 18} ${pot.cy - 20})` }, pot.inner);
  const rg = rings(pot.inner, 7), splash = E('circle', { r: 5, fill: '#E6F6FF', opacity: 0 }, pot.inner), drops = [...Array(8)].map(() => E('circle', { r: 1.6, fill: '#E6F6FF', opacity: 0 }, pot.inner));
  // кувшин сверху: горловина-капля с носиком, ручка-петля; вода внутри смещается к носику при наклоне; тень отходит
  const JD = 'M-30 0A30 30 0 0 1 22 -20Q38 -7 47 0Q38 7 22 20A30 30 0 0 1 -30 0Z';
  defs(svg, `<clipPath id="jc${id}"><path d="${JD}" transform="scale(.9)"/></clipPath>`);
  const jsh = E('g', { filter: `url(#sb${id})` }, svg); E('path', { d: JD, fill: '#000' }, jsh);
  const jug = E('g', {}, svg);
  H(jug, `<path d="M-28 -12Q-52 -14 -52 2Q-52 18 -28 14" stroke="rgba(255,255,255,.92)" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-28 -12Q-52 -14 -52 2Q-52 18 -28 14" stroke="#BFDCEB" stroke-width="1.2" fill="none" opacity=".8"/>
   <path d="${JD}" fill="url(#jug${id})"/>`);
  const jw = E('g', { 'clip-path': `url(#jc${id})` }, jug), jwat = E('ellipse', { rx: 30, ry: 26, fill: '#6BC0EE', opacity: .8 }, jw); E('ellipse', { rx: 10, ry: 5, cx: -6, cy: -8, fill: '#fff', opacity: .35 }, jw);
  H(jug, `<path d="${JD}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="2.2"/><path d="M-22 -16A27 27 0 0 1 6 -27" stroke="#fff" stroke-width="2.6" fill="none" opacity=".85" stroke-linecap="round"/>`);
  // струя сверху: короткий яркий «столб» у носика (вода уходит от камеры вниз) и пятно удара с брызгами
  const stream = E('path', { fill: '#BFE6FB', opacity: 0 }, svg), core = E('ellipse', { rx: 3, ry: 2, fill: '#fff', opacity: 0 }, svg);
  const T = 4.8, JX = 126, JY = 62, JA = 36, JR = JA * Math.PI / 180;
  function frame(t, emit) {
    t %= T;
    const tilt = t < .6 ? eIO(t / .6) : t < 3.6 ? 1 : 1 - eIO(clamp((t - 3.6) / .5)), flow = t > .5 && t < 3.75, fk = clamp((t - .5) / .15) * (1 - clamp((t - 3.6) / .15));
    // наклон сверху: кувшин чуть сжимается вдоль оси наклона, вода в нём уходит к носику, тень отходит дальше
    jug.setAttribute('transform', `translate(${JX} ${JY}) rotate(${JA}) scale(${(1 - tilt * .1).toFixed(3)} 1)`);
    jsh.setAttribute('transform', `translate(${(JX + 9 + tilt * 6).toFixed(1)} ${(JY + 12 + tilt * 6).toFixed(1)}) rotate(${JA}) scale(${(1 - tilt * .1).toFixed(3)} 1)`); jsh.setAttribute('opacity', (.24 - tilt * .06).toFixed(2));
    const empty = clamp((t - .6) / 3.1) * (t < 4.4 ? 1 : 1 - eIO(clamp((t - 4.4) / .4)));
    jwat.setAttribute('transform', `translate(${(tilt * 12 + empty * 6).toFixed(1)} 0) scale(${(1 - empty * .5).toFixed(3)} ${(1 - empty * .35).toFixed(3)})`);
    const fill = t < .6 ? 0 : t < 3.7 ? eIO((t - .6) / 3.1) : t < 4.3 ? 1 : 1 - eIO((t - 4.3) / .5);
    wat.setAttribute('opacity', (lerp(.22, .92, fill) * (t < 4.3 ? 1 : 1 - Math.sin(clamp((t - 4.3) / .5) * Math.PI) * .5)).toFixed(2)); cres.setAttribute('opacity', (fill * .38).toFixed(2));
    glint.setAttribute('cx', (pot.cx - 18).toFixed(1)); glint.setAttribute('cy', (pot.cy - 20).toFixed(1)); glint.setAttribute('opacity', (.12 + fill * .2).toFixed(2));
    const sx = JX + Math.cos(JR) * 47 * (1 - tilt * .1), sy = JY + Math.sin(JR) * 47, ex = sx + 5 + wob(t, 2) * .8, ey = sy + 7 + wob(t, 5) * .6;
    if (fk > 0) { const w = 3.4 * fk;
      stream.setAttribute('d', `M${(sx - w).toFixed(1)} ${(sy - 1).toFixed(1)}Q${(sx + 1).toFixed(1)} ${(sy + 4).toFixed(1)} ${(ex - w * .7).toFixed(1)} ${ey.toFixed(1)}A${(w * .8).toFixed(1)} ${(w * .8).toFixed(1)} 0 0 0 ${(ex + w * .7).toFixed(1)} ${ey.toFixed(1)}Q${(sx + 4).toFixed(1)} ${(sy + 2).toFixed(1)} ${(sx + w).toFixed(1)} ${(sy - 1).toFixed(1)}Z`); stream.setAttribute('opacity', .95);
      core.setAttribute('cx', (lerp(sx, ex, .55)).toFixed(1)); core.setAttribute('cy', (lerp(sy, ey, .55)).toFixed(1)); core.setAttribute('opacity', (.9 * fk).toFixed(2));
      splash.setAttribute('cx', ex); splash.setAttribute('cy', ey); splash.setAttribute('r', (5 + wob(t * 3, 1) * 1.6).toFixed(1)); splash.setAttribute('opacity', (.9 * fk).toFixed(2)) }
    else { stream.setAttribute('opacity', 0); core.setAttribute('opacity', 0); splash.setAttribute('opacity', 0) }
    if (flow && Math.floor(t / .28) !== frame._r) { frame._r = Math.floor(t / .28); rg.at(ex, ey, t, 1 + fill * .5) }
    rg.frame(t);
    drops.forEach((e, i) => { const k = ((t * 1.7 + i / drops.length) % 1), ang = i * .78 + .3, d = 4 + k * 18; e.setAttribute('cx', (ex + Math.cos(ang) * d).toFixed(1)); e.setAttribute('cy', (ey + Math.sin(ang) * d).toFixed(1)); e.setAttribute('r', (1.8 * (1 - k * .6)).toFixed(2)); e.setAttribute('opacity', (flow ? (1 - k) * .85 : 0).toFixed(2)) });
    emit && emit(flow ? 'pour' : 'pour-stop', fill)
  }
  return { svg, frame, T, title: 'Налить воду', sub: 'струя в центр, гладь растёт', sound: 'pour' }
}

/* содержимое кастрюли сверху */
const BROTH = { grechka: { c0: '#CDAE84', c1: '#A9824F', items: [['grechka', 150, .95]] }, borsch: { c0: '#C9465F', c1: '#8E1B36', items: [['svekla', 10, .9], ['kapusta', 10, 1], ['kartofel', 8, 1], ['morkov', 6, .8], ['ukrop', 14, 1.3]] }, voda: { c0: '#9FDAF7', c1: '#3E93CC', items: [] } };
function brothTop(pot, id, kind) {
  const B = BROTH[kind]; defs(pot.inner.ownerSVGElement, `<radialGradient id="br${id}" cx=".4" cy=".36" r=".72"><stop offset="0" stop-color="${B.c0}"/><stop offset="1" stop-color="${B.c1}"/></radialGradient>`);
  E('circle', { cx: pot.cx, cy: pot.cy, r: pot.r, fill: `url(#br${id})` }, pot.inner);
  const g = E('g', {}, pot.inner), list = []; let s = 0;
  B.items.forEach(([f, n, sc]) => { for (let i = 0; i < n; i++, s++) { const a = R(s, 0, 6.283), r = Math.sqrt(R(s + 40, .01, .96)) * pot.r * .94, w = E('g', {}, g); top(w, f, f === 'morkov' ? 'stick' : KIND[f], sc, s, id); list.push({ w, x: pot.cx + Math.cos(a) * r, y: pot.cy + Math.sin(a) * r, s }) } });
  E('ellipse', { cx: pot.cx - pot.r * .35, cy: pot.cy - pot.r * .42, rx: pot.r * .45, ry: pot.r * .14, fill: '#fff', opacity: .2, transform: `rotate(-30 ${pot.cx - pot.r * .35} ${pot.cy - pot.r * .42})` }, pot.inner);
  return t => list.forEach(q => q.w.setAttribute('transform', `translate(${(q.x + wob(t * .5, q.s) * 1.4).toFixed(1)} ${(q.y + wob(t * .6, q.s + 3) * 1.4).toFixed(1)})`))
}

/* ---------- 3. Посолить (сверху): ложка над кастрюлей наклоняется, крупинки летят вниз — уменьшаются и гаснут кругами ---------- */
function salt(kind = 'grechka') {
  const { id, svg } = scene(['pepper']);
  defs(svg, metalDefs(id));
  const pot = potTop(svg, id, 172, 94, 72), fl = brothTop(pot, id, kind), rg = rings(pot.inner, 12);
  const sp = E('g', {}, svg), mound = E('g', {}, sp);
  H(sp, shade(id, `<ellipse rx="17" ry="12"/><path d="M14 -4L88 -30L92 -22L16 6Z"/>`, 10, 14, .2) + `<path d="M14 -4L86 -30Q93 -32 94 -26Q95 -20 88 -18L16 6Z" fill="url(#hnd${id})"/><path d="M18 -3L86 -27" stroke="#fff" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>
   <ellipse rx="17" ry="12" fill="url(#rim${id})"/><ellipse rx="13.5" ry="9" fill="url(#wal${id})"/>`);
  H(mound, `<ellipse rx="10.5" ry="7" fill="#fff"/><ellipse cx="-2" cy="-2" rx="6" ry="3.6" fill="#fff"/><path d="M-6 -3A7 5 0 0 1 3 -5" stroke="#E4E9ED" stroke-width="1" fill="none"/>${[...Array(10)].map((_, i) => `<circle cx="${R(i, -8, 8).toFixed(1)}" cy="${R(i + 4, -5, 5).toFixed(1)}" r=".6" fill="#DDE3E8"/>`).join('')}`);
  sp.appendChild(mound);
  const G = [...Array(40)].map((_, i) => ({ e: E('rect', { width: 2.2, height: 2.2, rx: .5, fill: '#fff', stroke: '#C9D0D6', 'stroke-width': .3, opacity: 0 }, svg), s: i }));
  const T = 3.2;
  function frame(t, emit) {
    t %= T;
    const tilt = t < .6 ? eIO(t / .6) : t < 2.1 ? 1 : t < 2.6 ? 1 - eIO((t - 2.1) / .5) : 0, sx = 214 - tilt * 6, sy = 52 + tilt * 3;
    // наклон сверху: ложка поворачивается и чуть сжимается поперёк
    sp.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${(-8 - tilt * 10 + wob(t * 2, 2)).toFixed(1)}) scale(1 ${(1 - tilt * .3).toFixed(3)})`);
    mound.setAttribute('transform', `translate(${(-tilt * 3).toFixed(1)} 0) scale(${(1 - clamp((t - .7) / 1.3) * .6 * (t < 2.8 ? 1 : 1 - clamp((t - 2.8) / .3))).toFixed(3)})`);
    G.forEach(g => { const st = .65 + (g.s / G.length) * 1.4, k = (t - st) / .55;
      if (k < 0 || k > 1) { g.e.setAttribute('opacity', 0); if (k > 1 && g.hit !== Math.floor(t / T) + 1 && g.s % 3 === 0) { g.hit = Math.floor(t / T) + 1; rg.at(g.x, g.y, t, .4); emit && emit('grain') } return }
      // падение от ложки вниз к воде: в кадре сверху крупинка уходит от камеры — уменьшается, слегка сносится к центру
      const x0 = sx - 14 + R(g.s, -4, 4), y0 = sy + R(g.s + 2, -3, 4); g.x = x0 + (pot.cx - x0) * .12 * k + R(g.s + 5, -6, 6) * k; g.y = y0 + 16 * k + R(g.s + 7, -4, 6) * k;
      g.e.setAttribute('x', g.x.toFixed(1)); g.e.setAttribute('y', g.y.toFixed(1)); g.e.setAttribute('transform', `rotate(${(k * 300 + g.s * 40) % 360} ${g.x.toFixed(1)} ${g.y.toFixed(1)}) scale(1)`);
      g.e.setAttribute('width', (2.6 - k * 1.5).toFixed(2)); g.e.setAttribute('height', (2.6 - k * 1.5).toFixed(2)); g.e.setAttribute('opacity', (.95 - k * .2).toFixed(2)) });
    if (t < .05) G.forEach(g => g.hit = 0);
    if (tilt > .9 && Math.floor(t / .18) !== frame._r) { frame._r = Math.floor(t / .18); emit && emit('pourSalt') }
    rg.frame(t); fl(t)
  }
  return { svg, frame, T, title: 'Посолить', sub: kind === 'grechka' ? 'гречку в кастрюле' : 'бульон', sound: 'salt' }
}

/* ---------- 4. Жарить (сверху): кусочки подпрыгивают — крупнее, тень отходит; масло бликует; брызги во все стороны; пар к зрителю ---------- */
function piecesIn(svg, id, c, items, n) {
  const list = [];
  for (let i = 0; i < n; i++) { const f = items[i % items.length], a = R(i + 3, 0, 6.283), r = Math.sqrt(R(i + 17, .02, .9)) * c.r, w = E('g', {}, svg), shd = E('g', { filter: `url(#sbs${id})`, opacity: .45 }, w), body = E('g', {}, w);
    const k = KIND[f]; H(shd, k === 'coin' ? '<circle r="7.6" fill="#000"/>' : k === 'cube' ? '<rect x="-4.4" y="-4.4" width="8.8" height="8.8" rx="2" fill="#000"/>' : '<circle r="8" fill="#000"/>');
    top(body, f, k, f === 'kur' ? 1.25 : 1.05, i, id); list.push({ w, shd, body, x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r, a, r, s: i }) }
  return list
}
function fry(items = ['kur', 'morkov', 'luk']) {
  const { id, svg } = scene(['dill']);
  defs(svg, metalDefs(id) + `<radialGradient id="oil${id}"><stop offset="0" stop-color="#FFD98A" stop-opacity=".5"/><stop offset="1" stop-color="#FFC24D" stop-opacity="0"/></radialGradient>`);
  const pan = panTop(svg, id, 150, 88, 76);
  E('ellipse', { cx: pan.cx - 10, cy: pan.cy - 6, rx: 46, ry: 34, fill: `url(#oil${id})` }, svg);
  const P = piecesIn(svg, id, pan, items, 15), sp = [...Array(22)].map(() => E('circle', { r: 1.4, fill: '#FFF0C2', opacity: 0 }, svg)), st = steamUp(svg, id, 6, pan.cx, pan.cy - 10, 40);
  const T = 6;
  function frame(t, emit) {
    t %= T; pan.shine(t);
    P.forEach(q => { const per = R(q.s, 1.4, 2.6), k = ((t + R(q.s + 1, 0, 3)) % per) / per, hop = k < .22 ? Math.sin(k / .22 * Math.PI) : 0, j = wob(t * 3, q.s) * .5;
      q.body.setAttribute('transform', `translate(${(q.x + j - hop * 1.5).toFixed(1)} ${(q.y - hop * 2).toFixed(1)}) scale(${(1 + hop * .16).toFixed(3)}) rotate(${(hop * 20 + j * 3).toFixed(1)})`);
      q.shd.setAttribute('transform', `translate(${(q.x + 1.6 + hop * 3).toFixed(1)} ${(q.y + 2.2 + hop * 4).toFixed(1)})`); q.shd.setAttribute('opacity', (.45 - hop * .2).toFixed(2)) });
    sp.forEach((e, i) => { const life = .5, s0 = R(i, 0, T), k = ((t - s0 + T) % T) / life; if (k > 1) { e.setAttribute('opacity', 0); return }
      const q = P[i % P.length], a = R(i + 4, 0, 6.283), d = 4 + k * R(i + 5, 18, 34); e.setAttribute('cx', (q.x + Math.cos(a) * d).toFixed(1)); e.setAttribute('cy', (q.y + Math.sin(a) * d).toFixed(1)); e.setAttribute('r', (R(i, 1, 1.9) * (1 + Math.sin(k * Math.PI) * .5)).toFixed(2)); e.setAttribute('opacity', ((1 - k) * .9).toFixed(2)) });
    st(t); emit && emit('sizzle')
  }
  return { svg, frame, T, title: 'Жарить', sub: 'курица с морковью и луком', sound: 'sizzle' }
}

/* ---------- 5. Варить (сверху): бульон цвета блюда, пузыри растут и лопаются кругом, пар поднимается к зрителю ---------- */
function boil(kind = 'grechka') {
  const { id, svg } = scene(['towel']);
  defs(svg, metalDefs(id));
  const pot = potTop(svg, id, 170, 90, 76), fl = brothTop(pot, id, kind), rg = rings(pot.inner, 10);
  const bub = [...Array(16)].map((_, i) => ({ c: E('circle', { r: 0, fill: `url(#bub${id})` }, pot.inner), s: i, life: R(i, .7, 1.3), off: R(i + 5, 0, 2), r: R(i + 9, 2.4, 7) }));
  const st = steamUp(svg, id, 8, pot.cx, pot.cy - 8, 46);
  const T = 6;
  function frame(t, emit) {
    t %= T;
    bub.forEach(b => { const k = ((t + b.off) % b.life) / b.life, cyc = Math.floor((t + b.off) / b.life), a = R(b.s * 13 + cyc, 0, 6.283), r = Math.sqrt(R(b.s * 7 + cyc, .03, .85)) * pot.r, x = pot.cx + Math.cos(a) * r, y = pot.cy + Math.sin(a) * r;
      if (k < .8) { b.c.setAttribute('cx', x.toFixed(1)); b.c.setAttribute('cy', y.toFixed(1)); b.c.setAttribute('r', (b.r * eOut(k / .8) * (1 + wob(t * 9, b.s) * .05)).toFixed(2)); b.c.setAttribute('opacity', 1) }
      else { b.c.setAttribute('opacity', 0); if (b._c !== cyc) { b._c = cyc; rg.at(x, y, t, b.r / 10); emit && emit('bubble') } } });
    rg.frame(t); fl(t); st(t)
  }
  return { svg, frame, T, title: 'Варить', sub: kind === 'grechka' ? 'гречка — на слабом огне' : 'борщ — свёкла, капуста, картофель', sound: 'bubble' }
}

/* ---------- 6. Перемешать (сверху): лопатка ходит по кругу, рукоять наружу; кусочки уходят по кругу и расступаются ---------- */
function stir(items = ['luk', 'morkov']) {
  const { id, svg } = scene(['salt']);
  defs(svg, metalDefs(id));
  const pan = panTop(svg, id, 150, 88, 76), P = piecesIn(svg, id, pan, items, 18), st = steamUp(svg, id, 4, pan.cx, pan.cy - 6, 36);
  const ssh = E('g', { filter: `url(#sb${id})`, opacity: .28 }, svg); H(ssh, `<rect x="-11" y="-8" width="22" height="16" rx="7" fill="#000"/><rect x="9" y="-3" width="86" height="6" rx="3" fill="#000"/>`);
  const spat = E('g', {}, svg);
  H(spat, `<rect x="9" y="-3.2" width="88" height="6.4" rx="3.2" fill="url(#spat${id})"/><rect x="-12" y="-9" width="24" height="18" rx="8" fill="url(#spat${id})"/><path d="M-8 -5H8" stroke="#fff" stroke-width="1.2" opacity=".5" stroke-linecap="round"/><path d="M14 -1H92" stroke="#fff" stroke-width=".9" opacity=".45"/>`);
  const T = 2.8, W = 2 * Math.PI / T;
  function frame(t, emit) {
    const tt = t % (T / .14); t = tt % T; pan.shine(tt); const th = t * W, rr = pan.r * .5, sx = pan.cx + Math.cos(th) * rr, sy = pan.cy + Math.sin(th) * rr, ang = th * 180 / Math.PI;
    spat.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${ang.toFixed(1)})`); ssh.setAttribute('transform', `translate(${(sx + 5).toFixed(1)} ${(sy + 7).toFixed(1)}) rotate(${ang.toFixed(1)})`);
    P.forEach(q => { const da = Math.atan2(Math.sin(th - q.a), Math.cos(th - q.a)), push = Math.exp(-da * da * 5) * .45, a = q.a + t * W * (1 / 7) * 0 + push, r = Math.min(q.r + push * 6, pan.r * .95);
      const x = pan.cx + Math.cos(a + tt * W * .14) * r, y = pan.cy + Math.sin(a + tt * W * .14) * r;
      q.body.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((tt * W * .14 + push) * 57).toFixed(1)})`); q.shd.setAttribute('transform', `translate(${(x + 1.6).toFixed(1)} ${(y + 2.2).toFixed(1)})`) });
    st(t); emit && emit('scrape')
  }
  return { svg, frame, T: T / .14, title: 'Перемешать', sub: 'лук и морковь на сковороде', sound: 'scrape' }
}

/* ---------- детали у края столешницы: неподвижны, не отвлекают ---------- */
function decor(svg, id, kinds) { kinds.forEach(k => {
  if (k === 'towel') H(svg, `<g transform="translate(-6 128) rotate(-8)">${shade(id, '<rect width="70" height="60" rx="6"/>', 4, 6, .2)}<rect width="70" height="60" rx="6" fill="#F4FBF8"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${i * 14 + 3}" y="0" width="7" height="60" fill="#10B981" opacity=".22"/><rect x="0" y="${i * 14 + 3}" width="70" height="7" fill="#10B981" opacity=".22"/>`).join('')}<path d="M4 58H66" stroke="#047857" stroke-width="2" opacity=".5"/></g>`);
  if (k === 'dill') H(svg, `<g transform="translate(312 22) rotate(30)" stroke-linecap="round" fill="none">${shade(id, '<path d="M0 0V44" stroke="#000" stroke-width="3"/>', 3, 4, .15)}<path d="M0 0Q2 22 0 44" stroke="#4E9A38" stroke-width="1.6"/>
    ${[...Array(9)].map((_, i) => `<path d="M${(i % 2 ? 1 : -1) * .5} ${4 + i * 4.4}q${i % 2 ? 7 : -7} -3 ${i % 2 ? 10 : -10} -8" stroke="${['#5FA641', '#7BC05A', '#4E9A38'][i % 3]}" stroke-width="1.1"/><path d="M${(i % 2 ? 1 : -1) * 4} ${3 + i * 4.4}l${i % 2 ? 3 : -3} -4" stroke="#8BCB6A" stroke-width=".9"/>`).join('')}</g>`);
  if (k === 'salt') H(svg, `<g transform="translate(318 158)">${[...Array(18)].map((_, i) => `<rect x="${R(i, -9, 9).toFixed(1)}" y="${R(i + 3, -5, 5).toFixed(1)}" width="1.8" height="1.8" rx=".4" fill="#fff" stroke="#D5DBE0" stroke-width=".3" transform="rotate(${R(i, 0, 90).toFixed(0)})"/>`).join('')}</g>`);
  if (k === 'pepper') H(svg, `<g transform="translate(20 20)">${[...Array(7)].map((_, i) => `<circle cx="${R(i, -8, 8).toFixed(1)}" cy="${R(i + 3, -6, 6).toFixed(1)}" r="1.6" fill="#3A2A1E"/><circle cx="${(R(i, -8, 8) - .5).toFixed(1)}" cy="${(R(i + 3, -6, 6) - .5).toFixed(1)}" r=".5" fill="#8C7A68"/>`).join('')}</g>`);
}) }
/* доска сверху (общая для «нарезать», «натереть», «очистить», «отбить», «сформовать», «раскатать») */
function boardTop(svg, id, x = 40, y = 26, w = 262, h = 128) {
  H(svg, shade(id, `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/>`, 7, 10, .42) + shade(id, `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/>`, 1.4, 2, .4).replace(`filter="url(#sb${id})"`, `filter="url(#sbs${id})"`) +
   `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#A86A33"/><rect x="${x + 2}" y="${y + 1.5}" width="${w - 4}" height="${h - 4}" rx="12.5" fill="url(#wood${id})"/>
   ${[...Array(9)].map((_, i) => `<path d="M${x + 8 + R(i, 0, 14)} ${y + 10 + i * h / 10 + R(i + 1, -2, 2)}Q${x + w / 2 + R(i + 2, -30, 30)} ${y + 8 + i * h / 10 + R(i + 3, -3, 3)} ${x + w - 4 - R(i + 4, 0, 16)} ${y + 11 + i * h / 10}" stroke="#A9692F" stroke-width=".7" fill="none" opacity="${R(i + 5, .14, .28).toFixed(2)}"/>`).join('')}
   <rect x="${x + 2.5}" y="${y + 2}" width="${w - 5}" height="${h - 5}" rx="12" fill="none" stroke="#fff" stroke-width="1" opacity=".35"/>`) }
/* миска сверху: белая керамика с изумрудной полосой по ободку */
function bowlTop(svg, id, cx, cy, R0) {
  H(svg, shade(id, `<circle cx="${cx}" cy="${cy}" r="${R0}"/>`, 6, 8, .3) + shade(id, `<circle cx="${cx}" cy="${cy}" r="${R0}"/>`, 1.4, 2, .4).replace(`filter="url(#sb${id})"`, `filter="url(#sbs${id})"`) +
   `<circle cx="${cx}" cy="${cy}" r="${R0}" fill="url(#emw${id})"/><circle cx="${cx}" cy="${cy}" r="${R0 - 2.5}" fill="none" stroke="#10B981" stroke-width="2.2" opacity=".8"/><circle cx="${cx}" cy="${cy}" r="${R0 - 7}" fill="#FFFFFF"/>
   <path d="M${cx - R0 + 4} ${cy - 10}A${R0 - 4} ${R0 - 4} 0 0 1 ${cx - 10} ${cy - R0 + 4}" stroke="#fff" stroke-width="2.4" fill="none" opacity=".9" stroke-linecap="round"/>`);
  defs(svg, `<clipPath id="bw${id}"><circle cx="${cx}" cy="${cy}" r="${R0 - 7}"/></clipPath>`);
  return { inner: E('g', { 'clip-path': `url(#bw${id})` }, svg), cx, cy, r: R0 - 7 } }
// «вверх-вниз» инструмента (нож, молоток): ближе к камере — крупнее, тень дальше
function hit(ph, per = .55) { const p = ph % per; return p < .24 ? eOut(p / .24) : p < .31 ? 1 : p < .4 ? 1 - eIn((p - .31) / .09) : p < .47 ? .1 * Math.sin((p - .4) / .07 * Math.PI) : 0 }
const sc0 = (id, svg, frame, T, title, sub, sound) => ({ svg, frame, T, title, sub, sound });

/* натереть на тёрке: морковь короче тёрки ходит вверх-вниз с наклоном, стружка вылетает снизу и копится горкой под тёркой */
function grate(f = 'morkov') {
  const { id, svg } = scene(), P = F[f]; defs(svg, metalDefs(id)); boardTop(svg, id); decor(svg, id, ['dill']);
  const pile = E('g', {}, svg), N = 40, sh = [...Array(N)].map((_, i) => { const w = E('g', { opacity: 0 }, pile); H(w, `<path d="M-5 0Q0 -2 5 0" stroke="${P.c}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M-3 -.6Q0 -1.6 3 -.6" stroke="${P.l}" stroke-width=".7" fill="none"/>`);
    const a = R(i, 0, 3.14), r = Math.sqrt(R(i + 3, 0, 1)); return { w, x: 178 + Math.cos(a) * r * 26 * (R(i + 7) > .5 ? 1 : -1), y: 132 + Math.sin(a) * r * 10, r: R(i, 0, 180) } });
  H(svg, shade(id, '<rect x="150" y="30" width="56" height="96" rx="8"/>', 5, 7, .3) + `<rect x="150" y="30" width="56" height="96" rx="8" fill="url(#rim${id})"/><rect x="156" y="36" width="44" height="84" rx="5" fill="#B9C1C8"/>
   ${[...Array(9)].map((_, r) => [...Array(5)].map((_, c) => `<path d="M${161 + c * 8 + (r % 2) * 4} ${42 + r * 8.6}q3 -2 6 0" stroke="#5E666E" stroke-width="1.6" fill="none"/>`).join('')).join('')}<path d="M152 36V120" stroke="#fff" stroke-width="1.6" opacity=".6"/><rect x="160" y="18" width="36" height="12" rx="6" fill="url(#khd${id})"/>`);
  const pr = E('g', {}, svg);
  H(pr, shade(id, '<rect x="-10" y="-22" width="20" height="44" rx="9"/>', 5, 7, .3) + `<rect x="-10" y="-22" width="20" height="44" rx="9" fill="url(#coin${id})"/><path d="M-5 -16V14" stroke="#fff" stroke-width="2" opacity=".45" stroke-linecap="round"/>${[0, 1, 2].map(i => `<path d="M-9 ${-10 + i * 10}q9 2 18 0" stroke="${P.d}" stroke-width=".7" fill="none" opacity=".4"/>`).join('')}<path d="M-9 22q9 3 18 0" stroke="${P.core}" stroke-width="3" opacity=".9"/>`);
  const fly = [...Array(10)].map(() => E('path', { d: 'M-4 0Q0 -2 4 0', stroke: P.c, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round', opacity: 0 }, svg));
  const T = 3.2;
  function frame(t, emit) { t %= T; const k = (t % .62) / .62, y = 74 + Math.sin(k * 2 * Math.PI) * 22, tilt = Math.cos(k * 2 * Math.PI) * 8;
    pr.setAttribute('transform', `translate(178 ${y.toFixed(1)}) rotate(${tilt.toFixed(1)})`);
    if (Math.floor(t / .31) !== frame._g) { frame._g = Math.floor(t / .31); emit && emit('grate') }
    fly.forEach((e, i) => { const q = ((t * 2.2 + i / fly.length) % 1); e.setAttribute('transform', `translate(${(178 + R(i, -14, 14) * q).toFixed(1)} ${(122 + q * 12).toFixed(1)}) rotate(${(i * 40 + q * 200).toFixed(0)})`); e.setAttribute('opacity', (Math.sin(q * Math.PI) * .9).toFixed(2)) });
    const n = Math.floor(clamp(t / (T * .85)) * N); sh.forEach((s, i) => { s.w.setAttribute('opacity', i < n ? (t > T * .9 ? 1 - (t - T * .9) / (T * .1) : 1).toFixed(2) : 0); s.w.setAttribute('transform', `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.r.toFixed(0)})`) }) }
  return sc0(id, svg, frame, T, 'Натереть', `${P.n} — на тёрке`, 'grate') }

/* промыть: в миске вода кружит крупу, сверху льётся вода, круги */
function rinse(kind = 'grechka') {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['towel']);
  const b = bowlTop(svg, id, 186, 92, 72); E('circle', { cx: b.cx, cy: b.cy, r: b.r, fill: '#9FD6F2', opacity: .55 }, b.inner);
  const g = E('g', {}, b.inner), list = [...Array(110)].map((_, i) => { const w = E('g', {}, g); top(w, kind, KIND[kind] || 'grain', .9, i, id); return { w, a: R(i, 0, 6.283), r: Math.sqrt(R(i + 4, .02, .95)) * b.r * .9 } });
  const rg = rings(b.inner, 6), col = E('circle', { r: 4, fill: '#E6F6FF', opacity: .9 }, b.inner);
  const T = 4;
  function frame(t, emit) { t %= T; list.forEach(q => { const a = q.a + t * (2 * Math.PI / T) * (1.2 - q.r / b.r); q.w.setAttribute('transform', `translate(${(b.cx + Math.cos(a) * q.r).toFixed(1)} ${(b.cy + Math.sin(a) * q.r).toFixed(1)})`) });
    const ix = b.cx - 18 + wob(t, 2), iy = b.cy - 16; col.setAttribute('cx', ix); col.setAttribute('cy', iy); col.setAttribute('r', (4 + wob(t * 3, 1)).toFixed(1));
    if (Math.floor(t / .3) !== frame._r) { frame._r = Math.floor(t / .3); rg.at(ix, iy, t, 1.2) } rg.frame(t); emit && emit('pour', .5) }
  return sc0(id, svg, frame, T, 'Промыть', kind === 'grechka' ? 'гречку — до прозрачной воды' : 'под водой', 'pour') }

/* очистить: овальная картофелина с коричневой кожурой и глазками; овощечистка идёт вдоль, под ней — светлая влажная полоса;
   длинная лента кожуры закручивается спиралью и падает к очисткам */
function peel(f = 'kartofel') {
  const { id, svg } = scene(), P = F[f]; defs(svg, metalDefs(id) + `<radialGradient id="skn${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#D9AE72"/><stop offset=".6" stop-color="#B98546"/><stop offset="1" stop-color="#8A5C2C"/></radialGradient>
   <linearGradient id="flesh${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6D8"/><stop offset=".5" stop-color="#F6E3A8"/><stop offset="1" stop-color="#E9CB82"/></linearGradient><clipPath id="pk${id}"><ellipse cx="0" cy="0" rx="46" ry="30"/></clipPath>`);
  boardTop(svg, id); decor(svg, id, ['salt']);
  const CX = 140, CY = 88, pot = E('g', { transform: `translate(${CX} ${CY}) rotate(-8)` }, svg);
  H(pot, shade(id, '<ellipse rx="46" ry="30"/>', 5, 7, .32) + `<ellipse rx="46" ry="30" fill="url(#skn${id})"/>${[[-22, -8], [6, -16], [24, 6], [-8, 14], [30, -12]].map(([x, y]) => `<path d="M${x - 2.4} ${y}q2.4 -2 4.8 0" stroke="#5E3A18" stroke-width="1.2" fill="none"/><circle cx="${x}" cy="${y + .8}" r=".9" fill="#5E3A18"/>`).join('')}
   <ellipse cx="-14" cy="-14" rx="14" ry="5" fill="#fff" opacity=".22"/>`);
  const bandsG = E('g', { 'clip-path': `url(#pk${id})` }, pot), NB = 4, bands = [...Array(NB)].map((_, i) => { const y = -22 + i * 14.5, g = E('g', {}, bandsG); E('rect', { x: -48, y: y - 7, width: 96, height: 14, rx: 6, fill: `url(#flesh${id})` }, g); E('path', { d: `M-40 ${y - 3}H40`, stroke: '#fff', 'stroke-width': 1.4, opacity: .6, 'stroke-linecap': 'round' }, g); return { g, y } });
  const peeler = E('g', {}, svg); H(peeler, shade(id, '<rect x="-6" y="-6" width="12" height="52" rx="5"/>', 4, 6, .3) + `<rect x="-11" y="-10" width="22" height="12" rx="4" fill="url(#rim${id})"/><path d="M-8 -4H8" stroke="#5E666E" stroke-width="1.3"/><rect x="-6" y="2" width="12" height="46" rx="5" fill="url(#emh${id})"/><path d="M-3 8V42" stroke="#fff" stroke-width="1" opacity=".4"/>`);
  // лента кожуры: спираль коричневая снаружи, светлая изнутри
  const spir = (n) => { let d = ''; for (let a = 0; a <= n; a += .25) { const r = 2 + a * 2.2; d += (a ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r * .7).toFixed(1) } return d };
  const curl = E('g', {}, svg); E('path', { d: spir(9), stroke: '#8A5C2C', 'stroke-width': 4.6, fill: 'none', 'stroke-linecap': 'round' }, curl); E('path', { d: spir(9), stroke: '#EBD39A', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round', opacity: .9 }, curl);
  const pileP = [...Array(NB)].map((_, i) => { const w = E('g', { opacity: 0 }, svg); H(w, `<path d="${spir(7)}" stroke="#8A5C2C" stroke-width="4" fill="none" stroke-linecap="round"/><path d="${spir(7)}" stroke="#EBD39A" stroke-width="1.3" fill="none" opacity=".8"/>`); return { w, x: 236 + (i % 2) * 22 + R(i, -4, 4), y: 70 + Math.floor(i / 2) * 28 + R(i + 2, -4, 4), r: R(i, 0, 360) } });
  const T = 4.8, PASS = T * .85 / NB;
  function frame(t, emit) { t %= T; const pi = Math.min(NB - 1, Math.floor(t / PASS)), pk = clamp((t - pi * PASS) / (PASS * .8)), fade = t > T * .93 ? 1 - (t - T * .93) / (T * .07) : 1;
    bands.forEach((b, i) => { const s = i < pi ? 1 : i === pi ? eIO(pk) : 0; b.g.setAttribute('transform', `translate(-48 0) scale(${s.toFixed(3)} 1) translate(48 0)`); b.g.setAttribute('opacity', fade.toFixed(2)) });
    const by = bands[pi].y, a = -8 * Math.PI / 180, lx = -44 + pk * 88, px = CX + Math.cos(a) * lx - Math.sin(a) * by, py = CY + Math.sin(a) * lx + Math.cos(a) * by;
    peeler.setAttribute('transform', `translate(${px.toFixed(1)} ${(py - 4).toFixed(1)}) rotate(-80)`);
    if (pk > .05 && pk < .1 && frame._p !== pi) { frame._p = pi; emit && emit('peel') }
    const drop = clamp((t - pi * PASS - PASS * .8) / (PASS * .2)); curl.setAttribute('transform', `translate(${(px + 10 + drop * 30).toFixed(1)} ${(py - 6 + drop * 10).toFixed(1)}) scale(${(.3 + pk * .7).toFixed(2)}) rotate(${(pk * 180).toFixed(0)})`); curl.setAttribute('opacity', pk > .05 && t < T * .9 ? (1 - drop).toFixed(2) : 0);
    pileP.forEach((p, i) => { p.w.setAttribute('opacity', (i < pi || (i === pi && pk >= 1) ? fade : 0).toFixed(2)); p.w.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(0)})`) }) }
  return sc0(id, svg, frame, T, 'Очистить', `${P.n} — овощечисткой`, 'peel') }

/* отбить: молоток вверх-вниз (тень), кусок мяса с каждым ударом шире */
function pound(f = 'kur') {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); boardTop(svg, id); decor(svg, id, ['pepper']);
  const meat = E('g', {}, svg); H(meat, shade(id, '<path d="M-46 0Q-44 -26 0 -28Q46 -26 46 0Q44 26 0 28Q-44 26 -46 0Z"/>', 4, 6, .3) + `<path d="M-46 0Q-44 -26 0 -28Q46 -26 46 0Q44 26 0 28Q-44 26 -46 0Z" fill="url(#chk${id})"/><path d="M-30 -12Q0 -24 30 -12" stroke="#fff" stroke-width="2.4" fill="none" opacity=".5" stroke-linecap="round"/>`);
  const msh = E('g', { filter: `url(#sb${id})` }, svg); E('rect', { x: -16, y: -16, width: 32, height: 32, rx: 4, fill: '#000' }, msh);
  const mal = E('g', {}, svg); H(mal, `<rect x="-4" y="14" width="8" height="70" rx="4" fill="url(#spat${id})"/><rect x="-16" y="-16" width="32" height="32" rx="5" fill="url(#rim${id})"/>${[...Array(4)].map((_, r) => [...Array(4)].map((_, c) => `<path d="M${-11 + c * 7} ${-11 + r * 7}l2.6 2.6l2.6 -2.6" stroke="#6E767E" stroke-width=".8" fill="none"/>`).join('')).join('')}`);
  const T = 3.3, N = 5;
  function frame(t, emit) { t %= T; const i = Math.floor(t / .55), up = i < N ? hit(t) : .5 * Math.sin(clamp((t - N * .55) / .55) * Math.PI);
    if (i < N && (t % .55) >= .4 && frame._i !== i) { frame._i = i; emit && emit('pound') } if (t < .1) frame._i = -1;
    const wide = 1 + Math.min(i + ((t % .55) >= .4 ? 1 : 0), N) * .06 * (t < N * .55 + .3 ? 1 : 1 - eIO(clamp((t - N * .55 - .3) / .5)));
    meat.setAttribute('transform', `translate(166 92) scale(${wide.toFixed(3)} ${(1 + (wide - 1) * .6).toFixed(3)})`);
    const mx = 170 + Math.sin(i * 2.1) * 14, my = 86 + Math.cos(i * 1.7) * 8;
    mal.setAttribute('transform', `translate(${mx.toFixed(1)} ${(my - up * 3).toFixed(1)}) rotate(-24) scale(${(1 + up * .1).toFixed(3)})`); msh.setAttribute('transform', `translate(${(mx + 3 + up * 10).toFixed(1)} ${(my + 4 + up * 12).toFixed(1)}) rotate(-24)`); msh.setAttribute('opacity', (.32 - up * .14).toFixed(2)) }
  return sc0(id, svg, frame, T, 'Отбить', 'кусочки мяса до толщины 1 см', 'pound') }

/* поперчить: мельница проворачивается над кастрюлей, тёмные крупинки ложатся на поверхность */
function pepper(kind = 'borsch') {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['pepper']);
  const pot = potTop(svg, id, 172, 94, 72), fl = brothTop(pot, id, kind), specks = [...Array(40)].map((_, i) => ({ e: E('circle', { r: 1.1, fill: '#2A1E14', opacity: 0 }, pot.inner), x: pot.cx - 30 + R(i, -24, 24), y: pot.cy - 20 + R(i + 3, -16, 20), st: R(i + 5, .3, 2.4) }));
  const mill = E('g', {}, svg); H(mill, shade(id, '<circle r="20"/>', 10, 14, .22) + `<circle r="20" fill="url(#spat${id})"/><circle r="12" fill="url(#rim${id})"/><circle r="4" fill="#5E666E"/>`);
  const cap = E('g', {}, mill); H(cap, `<path d="M0 -12V-6M0 6V12M-12 0H-6M6 0H12" stroke="#6E767E" stroke-width="1.4"/>`);
  const T = 3.2;
  function frame(t, emit) { t %= T; const tw = Math.sin(t * 9) * 25 * (t < 2.6 ? 1 : 0); mill.setAttribute('transform', 'translate(132 60)'); cap.setAttribute('transform', `rotate(${tw.toFixed(1)})`);
    if (t < 2.6 && Math.floor(t / .25) !== frame._m) { frame._m = Math.floor(t / .25); emit && emit('grind') }
    specks.forEach(s => s.e.setAttribute('cx', s.x.toFixed(1)) || s.e.setAttribute('cy', s.y.toFixed(1)) || s.e.setAttribute('opacity', t > s.st ? (t > T - .4 ? (T - t) / .4 : 1).toFixed(2) : 0)); fl(t) }
  return sc0(id, svg, frame, T, 'Поперчить', 'щепоть молотого перца', 'grind') }

/* налить масло: бутылка над сковородой, золотое пятно растекается и бликует */
function oil() {
  const { id, svg } = scene(); defs(svg, metalDefs(id) + `<radialGradient id="ol${id}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FFE59A"/><stop offset=".7" stop-color="#F2B83A" stop-opacity=".75"/><stop offset="1" stop-color="#E09A1A" stop-opacity=".3"/></radialGradient>`); decor(svg, id, ['dill']);
  const pan = panTop(svg, id, 150, 88, 76), pool = E('ellipse', { cx: pan.cx - 6, cy: pan.cy - 4, rx: 4, ry: 3, fill: `url(#ol${id})` }, svg), gl = E('ellipse', { rx: 6, ry: 2, fill: '#fff', opacity: 0 }, svg);
  const bt = E('g', {}, svg); H(bt, shade(id, '<circle r="18"/><rect x="10" y="-6" width="24" height="12" rx="5"/>', 10, 14, .22) + `<circle r="18" fill="#F4B92E" opacity=".9"/><circle r="12" fill="#FFE08A" opacity=".8"/><rect x="12" y="-6" width="20" height="12" rx="5" fill="#2F7D57"/><path d="M-10 -10A14 14 0 0 1 4 -16" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>`);
  const drip = E('ellipse', { rx: 3, ry: 2.2, fill: '#FFD26A', opacity: 0 }, svg);
  const T = 3.6;
  function frame(t, emit) { t %= T; const k = t < .4 ? 0 : t < 2.6 ? eOut((t - .4) / 2.2) : 1, fade = t > 3.2 ? 1 - (t - 3.2) / .4 : 1;
    bt.setAttribute('transform', `translate(${(108 + (t > .2 && t < 2.8 ? 4 : 0)).toFixed(0)} 54) rotate(40)`);
    pool.setAttribute('rx', (4 + k * 46).toFixed(1)); pool.setAttribute('ry', (3 + k * 34).toFixed(1)); pool.setAttribute('opacity', fade.toFixed(2));
    gl.setAttribute('cx', (pan.cx - 20 - k * 10).toFixed(1)); gl.setAttribute('cy', (pan.cy - 14 - k * 6).toFixed(1)); gl.setAttribute('rx', (4 + k * 14).toFixed(1)); gl.setAttribute('opacity', (k * .5 * fade).toFixed(2));
    drip.setAttribute('cx', 140); drip.setAttribute('cy', 82); drip.setAttribute('opacity', t > .4 && t < 2.6 ? .95 : 0); pan.shine(t); emit && emit(t > .4 && t < 2.6 ? 'oil' : 'oil-stop') }
  return sc0(id, svg, frame, T, 'Масло', 'налейте на сковороду', 'oil') }

/* довести до кипения: пузырей всё больше, пар гуще, горелка светится по краю */
function bringBoil(kind = 'voda') {
  const { id, svg } = scene(); defs(svg, metalDefs(id) + `<radialGradient id="fl${id}"><stop offset=".78" stop-color="#FF7A1A" stop-opacity="0"/><stop offset=".9" stop-color="#FF8A2A" stop-opacity=".55"/><stop offset="1" stop-color="#4F7BFF" stop-opacity="0"/></radialGradient>`);
  const glow = E('circle', { cx: 170, cy: 90, r: 92, fill: `url(#fl${id})`, opacity: 0 }, svg);
  const pot = potTop(svg, id, 170, 90, 76), fl = brothTop(pot, id, kind), rg = rings(pot.inner, 14);
  const bub = [...Array(22)].map((_, i) => ({ c: E('circle', { r: 0, fill: `url(#bub${id})` }, pot.inner), s: i, life: R(i, .6, 1.2), off: R(i + 5, 0, 2), r: R(i + 9, 2, 6.5), th: i / 22 }));
  const st = steamUp(svg, id, 9, pot.cx, pot.cy - 8, 46), T = 5;
  function frame(t, emit) { t %= T; const heat = clamp(t / (T * .8)); glow.setAttribute('opacity', (.5 + Math.sin(t * 7) * .1).toFixed(2));
    bub.forEach(b => { const on = b.th < heat; const k = ((t + b.off) % b.life) / b.life, cyc = Math.floor((t + b.off) / b.life), a = R(b.s * 13 + cyc, 0, 6.283), r = Math.sqrt(R(b.s * 7 + cyc, .03, .85)) * pot.r, x = pot.cx + Math.cos(a) * r, y = pot.cy + Math.sin(a) * r;
      if (on && k < .8) { b.c.setAttribute('cx', x.toFixed(1)); b.c.setAttribute('cy', y.toFixed(1)); b.c.setAttribute('r', (b.r * eOut(k / .8) * (.6 + heat * .6)).toFixed(2)); b.c.setAttribute('opacity', 1) } else { b.c.setAttribute('opacity', 0); if (on && b._c !== cyc) { b._c = cyc; rg.at(x, y, t, b.r / 10); emit && emit('bubble') } } });
    rg.frame(t); fl(t); st(t * (.4 + heat)) }
  return sc0(id, svg, frame, T, 'Довести до кипения', 'на сильном огне', 'bubble') }

/* тушить под крышкой: стеклянная крышка с ручкой, конденсат, пар пробивается у края, крышка чуть подрагивает */
function simmer(kind = 'borsch') {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['towel']);
  const pot = potTop(svg, id, 176, 92, 74), fl = brothTop(pot, id, kind), lid = E('g', {}, svg);
  H(lid, `<circle r="${pot.r + 2}" fill="#fff" opacity=".28"/><circle r="${pot.r + 2}" fill="none" stroke="url(#rim${id})" stroke-width="4"/>${[...Array(40)].map((_, i) => `<circle cx="${(Math.cos(i * 2.4) * R(i, 8, pot.r - 6)).toFixed(1)}" cy="${(Math.sin(i * 2.4) * R(i, 8, pot.r - 6)).toFixed(1)}" r="${R(i + 2, .6, 1.6).toFixed(1)}" fill="#fff" opacity=".55"/>`).join('')}
   ${shade(id, '<circle r="10"/>', 3, 4, .3)}<circle r="10" fill="url(#khd${id})"/><circle cx="-3" cy="-3" r="3" fill="#fff" opacity=".25"/><path d="M${-pot.r + 6} -14A${pot.r - 6} ${pot.r - 6} 0 0 1 -14 ${-pot.r + 6}" stroke="#fff" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>`);
  const st = steamUp(svg, id, 5, pot.cx + 46, pot.cy - 40, 10), T = 4;
  function frame(t, emit) { t %= T; const j = Math.max(0, Math.sin(t * 11)) * (t % 2 < .5 ? .8 : 0); lid.setAttribute('transform', `translate(${pot.cx} ${(pot.cy - j).toFixed(2)}) rotate(${(j * 1.5).toFixed(2)})`);
    if (j > .7 && frame._j !== Math.floor(t / 2)) { frame._j = Math.floor(t / 2); emit && emit('lid') } fl(t); st(t); emit && emit('simmer') }
  return sc0(id, svg, frame, T, 'Тушить под крышкой', 'на слабом огне', 'simmer') }

/* запекать: противень в духовке сверху, по краям тёплое свечение, кусочки румянятся */
function bake(items = ['kartofel', 'kur']) {
  const { id, svg } = scene(); defs(svg, metalDefs(id) + `<radialGradient id="ov${id}" cx=".5" cy=".5" r=".7"><stop offset=".55" stop-color="#FF9A3C" stop-opacity="0"/><stop offset="1" stop-color="#FF7A1A" stop-opacity=".55"/></radialGradient>`);
  E('rect', { x: -10, y: -10, width: 360, height: 200, fill: '#3A2E26' }, svg); const glow = E('rect', { x: -10, y: -10, width: 360, height: 200, fill: `url(#ov${id})` }, svg);
  H(svg, `${shade(id, '<rect x="70" y="26" width="200" height="128" rx="10"/>', 6, 8, .5)}<rect x="70" y="26" width="200" height="128" rx="10" fill="url(#castr${id})"/><rect x="78" y="34" width="184" height="112" rx="7" fill="#2A2C2F"/>${[...Array(8)].map((_, i) => `<path d="M70 ${40 + i * 15}H270" stroke="#4A4F54" stroke-width=".6" opacity=".4"/>`).join('')}`);
  const c = { cx: 170, cy: 90, r: 52 }, P = piecesIn(svg, id, c, items, 12), brown = E('g', {}, svg);
  P.forEach(q => E('circle', { cx: q.x, cy: q.y, r: 8, fill: '#7A3E10', opacity: 0, class: 'br' }, brown));
  const T = 5;
  function frame(t, emit) { t %= T; glow.setAttribute('opacity', (.7 + Math.sin(t * 2.4) * .2).toFixed(2)); const b = clamp(t / (T * .8)) * .35 * (t > T - .5 ? (T - t) / .5 : 1);
    brown.querySelectorAll('.br').forEach(e => e.setAttribute('opacity', b.toFixed(2))); P.forEach(q => { q.body.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`); q.shd.setAttribute('transform', `translate(${(q.x + 1.6).toFixed(1)} ${(q.y + 2.2).toFixed(1)})`) }); emit && emit('oven') }
  return sc0(id, svg, frame, T, 'Запекать', 'в духовке до румяной корочки', 'oven') }

/* взбить: венчик ходит по кругу в миске, яйца пенятся */
function whisk() {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['salt']);
  const b = bowlTop(svg, id, 176, 92, 72); E('circle', { cx: b.cx, cy: b.cy, r: b.r, fill: '#F7C948' }, b.inner);
  const foam = [...Array(40)].map((_, i) => ({ e: E('circle', { r: R(i, 1, 3), fill: '#FFF6D6', opacity: 0 }, b.inner), a: R(i, 0, 6.283), r: Math.sqrt(R(i + 4, .05, .9)) * b.r }));
  const wsh = E('g', { filter: `url(#sb${id})`, opacity: .25 }, svg); E('ellipse', { rx: 22, ry: 14, fill: '#000' }, wsh);
  const wh = E('g', {}, svg); H(wh, `${[0, 1, 2, 3].map(i => `<ellipse rx="${22 - i * 2}" ry="${14 - i * 3}" fill="none" stroke="#C3CAD1" stroke-width="1.4" transform="rotate(${i * 45})"/>`).join('')}<rect x="-4" y="12" width="8" height="64" rx="4" fill="url(#emh${id})"/><circle r="3" fill="#8E979F"/>`);
  const T = 2.4, W = 2 * Math.PI / .6;
  function frame(t, emit) { t %= T; const a = t * W, x = b.cx + Math.cos(a) * 22, y = b.cy + Math.sin(a) * 16; wh.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(-30 + Math.sin(a) * 10).toFixed(1)})`); wsh.setAttribute('transform', `translate(${(x + 6).toFixed(1)} ${(y + 8).toFixed(1)})`);
    const k = clamp(t / (T * .8)); foam.forEach((f, i) => { const aa = f.a + t * 3; f.e.setAttribute('cx', (b.cx + Math.cos(aa) * f.r).toFixed(1)); f.e.setAttribute('cy', (b.cy + Math.sin(aa) * f.r).toFixed(1)); f.e.setAttribute('opacity', (i / foam.length < k ? .85 : 0) * (t > T - .3 ? (T - t) / .3 : 1)) });
    if (Math.floor(t / .3) !== frame._w) { frame._w = Math.floor(t / .3); emit && emit('whisk') } }
  return sc0(id, svg, frame, T, 'Взбить', 'яйца венчиком до пены', 'whisk') }

/* сформовать котлеты: шарик фарша приплющивается в котлету, ряд растёт */
function form(f = 'kur') {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); boardTop(svg, id); decor(svg, id, ['dill']);
  const pat = [...Array(5)].map((_, i) => { const w = E('g', { opacity: 0 }, svg); H(w, shade(id, '<ellipse rx="17" ry="14"/>', 3, 4, .3) + `<ellipse rx="17" ry="14" fill="url(#chk${id})"/>${[...Array(8)].map((_, j) => `<circle cx="${R(i * 9 + j, -12, 12).toFixed(1)}" cy="${R(i * 9 + j + 3, -9, 9).toFixed(1)}" r="1" fill="#C98A45" opacity=".6"/>`).join('')}<ellipse cx="-5" cy="-5" rx="6" ry="3" fill="#fff" opacity=".35"/>`); return { w, x: 92 + i * 40, y: 90 + (i % 2) * 6 } });
  const T = 5, per = T / 5;
  function frame(t, emit) { t %= T; pat.forEach((p, i) => { const k = (t - i * per) / per; if (k < 0) { p.w.setAttribute('opacity', 0); return } const q = clamp(k * 1.6), sq = k < 1 ? eOut(q) : 1;
    p.w.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${lerp(.6, 1, sq).toFixed(3)} ${lerp(.75, 1, sq).toFixed(3)})`); p.w.setAttribute('opacity', (t > T - .3 ? (T - t) / .3 : 1).toFixed(2));
    if (k > .2 && k < .3 && p._e !== Math.floor(t / T)) { p._e = Math.floor(t / T); emit && emit('pat') } }) }
  return sc0(id, svg, frame, T, 'Сформовать', 'котлеты мокрыми руками', 'pat') }

/* раскатать: скалка ходит вверх-вниз, пласт теста растёт, мука пылит */
function roll() {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); boardTop(svg, id);
  H(svg, [...Array(50)].map((_, i) => `<circle cx="${R(i, 60, 290).toFixed(0)}" cy="${R(i + 3, 36, 146).toFixed(0)}" r="${R(i + 5, .6, 1.6).toFixed(1)}" fill="#fff" opacity=".55"/>`).join(''));
  const dough = E('ellipse', { cx: 170, cy: 90, rx: 30, ry: 26, fill: '#F6E3B8', stroke: '#E3C98E', 'stroke-width': 1 }, svg), dHi = E('ellipse', { cx: 160, cy: 82, rx: 14, ry: 6, fill: '#fff', opacity: .4 }, svg);
  const pin = E('g', {}, svg); H(pin, shade(id, '<rect x="-80" y="-9" width="160" height="18" rx="9"/>', 5, 7, .3) + `<rect x="-62" y="-10" width="124" height="20" rx="10" fill="url(#spat${id})"/><rect x="-90" y="-5" width="30" height="10" rx="5" fill="#C98F55"/><rect x="60" y="-5" width="30" height="10" rx="5" fill="#C98F55"/><path d="M-58 -5H58" stroke="#fff" stroke-width="1.4" opacity=".5"/>`);
  const T = 3.6;
  function frame(t, emit) { t %= T; const k = clamp(t / (T * .85)), g = t > T - .4 ? 1 - (t - (T - .4)) / .4 : 1; dough.setAttribute('rx', (30 + k * 52 * g).toFixed(1)); dough.setAttribute('ry', (26 + k * 30 * g).toFixed(1));
    const y = 90 + Math.sin(t * 2 * Math.PI / .9) * (18 + k * 20); pin.setAttribute('transform', `translate(170 ${y.toFixed(1)})`);
    if (Math.floor(t / .45) !== frame._r) { frame._r = Math.floor(t / .45); emit && emit('roll') } }
  return sc0(id, svg, frame, T, 'Раскатать', 'тесто скалкой в тонкий пласт', 'roll') }

/* налить тесто: половник над сковородой, круг теста растекается, по краю пузырьки */
function batter() {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['towel']);
  const pan = panTop(svg, id, 150, 88, 76), bt = E('circle', { cx: pan.cx, cy: pan.cy, r: 4, fill: '#F7DFA0' }, svg), bh = E('circle', { cx: pan.cx - 12, cy: pan.cy - 12, r: 3, fill: '#fff', opacity: .3 }, svg);
  const pores = [...Array(26)].map((_, i) => E('circle', { r: R(i, .8, 1.8), fill: '#E2BE6E', opacity: 0, cx: pan.cx + Math.cos(i * 2.4) * R(i, 10, 52), cy: pan.cy + Math.sin(i * 2.4) * R(i, 10, 52) }, svg));
  const ld = E('g', {}, svg); H(ld, shade(id, '<circle r="16"/>', 9, 12, .22) + `<circle r="16" fill="url(#rim${id})"/><circle r="12" fill="#F7DFA0"/><rect x="12" y="-3" width="70" height="6" rx="3" fill="url(#hnd${id})" transform="rotate(-30)"/>`);
  const T = 4;
  function frame(t, emit) { t %= T; const k = t < .3 ? 0 : t < 2 ? eOut((t - .3) / 1.7) : 1, f = t > 3.6 ? 1 - (t - 3.6) / .4 : 1; bt.setAttribute('r', (4 + k * 54).toFixed(1)); bt.setAttribute('opacity', f.toFixed(2)); bh.setAttribute('r', (3 + k * 14).toFixed(1)); bh.setAttribute('opacity', (.3 * f).toFixed(2));
    ld.setAttribute('transform', `translate(${(pan.cx - 4 + (t < 2 ? Math.sin(t * 3) * 6 : 30)).toFixed(1)} ${(pan.cy - 6 - (t < 2 ? 0 : 40)).toFixed(1)}) scale(${(t < 2 ? 1 : .9).toFixed(2)})`); ld.setAttribute('opacity', t < 2.4 ? 1 : 0);
    pores.forEach((p, i) => p.setAttribute('opacity', t > 2.2 + i * .04 ? (.7 * f).toFixed(2) : 0)); emit && emit(t < 2 ? 'pourThick' : 'sizzle') }
  return sc0(id, svg, frame, T, 'Налить тесто', 'половник на сковороду, тонким слоем', 'sizzle') }

/* выложить на тарелку: порция ложится и оседает, сверху — веточка зелени */
function plateUp(items = ['grechka', 'kur']) {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['towel', 'dill']);
  H(svg, shade(id, '<circle cx="176" cy="90" r="74"/>', 6, 8, .3) + `<circle cx="176" cy="90" r="74" fill="url(#emw${id})"/><circle cx="176" cy="90" r="54" fill="#FFFFFF"/><circle cx="176" cy="90" r="54" fill="none" stroke="#E5EAE7" stroke-width="1.2"/><circle cx="176" cy="90" r="70" fill="none" stroke="#10B981" stroke-width="1.6" opacity=".7"/>`);
  const por = E('g', {}, svg); const c = { cx: 176, cy: 90, r: 36 }; [...Array(70)].forEach((_, i) => { const a = R(i, 0, 6.283), r = Math.sqrt(R(i + 3, 0, 1)) * 30, w = E('g', {}, por); top(w, items[0], KIND[items[0]], .9, i, id); w.setAttribute('transform', `translate(${(164 + Math.cos(a) * r).toFixed(1)} ${(92 + Math.sin(a) * r * .8).toFixed(1)})`) });
  const side = E('g', {}, svg); [0, 1, 2, 3].forEach(i => { const w = E('g', {}, side); top(w, items[1] || 'kur', KIND[items[1] || 'kur'], 1.2, i, id); w.setAttribute('transform', `translate(${198 + (i % 2) * 14} ${76 + i * 10})`) });
  const T = 4;
  function frame(t, emit) { t %= T; const a = clamp((t - .2) / .6), b = clamp((t - 1) / .6), f = t > 3.6 ? 1 - (t - 3.6) / .4 : 1;
    por.setAttribute('transform', `translate(0 ${((1 - eOut(a)) * -10).toFixed(1)}) scale(1)`); por.setAttribute('opacity', (a * f).toFixed(2)); side.setAttribute('transform', `translate(${((1 - eOut(b)) * 14).toFixed(1)} ${((1 - eOut(b)) * -8).toFixed(1)})`); side.setAttribute('opacity', (b * f).toFixed(2));
    if (a > 0 && a < .1 && frame._p !== Math.floor(t)) { frame._p = Math.floor(t); emit && emit('plate') } }
  return sc0(id, svg, frame, T, 'Выложить на тарелку', 'и подать', 'plate') }

/* настоять: накрытая кастрюля, полотенце сверху, лёгкий пар, тонкое кольцо времени */
function rest(kind = 'grechka') {
  const { id, svg } = scene(); defs(svg, metalDefs(id));
  const pot = potTop(svg, id, 170, 90, 72); brothTop(pot, id, kind);
  H(svg, `<g transform="translate(170 90) rotate(-12)">${shade(id, '<rect x="-60" y="-52" width="120" height="104" rx="10"/>', 4, 6, .25)}<rect x="-60" y="-52" width="120" height="104" rx="10" fill="#F4FBF8"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${-60 + i * 17 + 4}" y="-52" width="8" height="104" fill="#10B981" opacity=".22"/><rect x="-60" y="${-52 + i * 15 + 4}" width="120" height="7" fill="#10B981" opacity=".22"/>`).join('')}</g>`);
  const ring = E('circle', { cx: 286, cy: 34, r: 14, fill: 'none', stroke: '#10B981', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': 88, transform: 'rotate(-90 286 34)' }, svg); E('circle', { cx: 286, cy: 34, r: 14, fill: 'none', stroke: '#10B981', 'stroke-width': 3, opacity: .18 }, svg);
  const st = steamUp(svg, id, 4, 170, 50, 30), T = 6;
  function frame(t, emit) { t %= T; ring.setAttribute('stroke-dashoffset', (88 * (1 - t / T)).toFixed(1)); st(t * .6) }
  return sc0(id, svg, frame, T, 'Настоять', 'под крышкой и полотенцем', null) }


/* ---------- привязка шага к анимации: слова шага → действие, продукт — первый из состава, названный в шаге ---------- */
const PROD = { morkov: 'morkov', luk: 'luk', kur_grudka: 'kur', kur_bedro: 'kur', indeyka: 'kur', farsh_kur: 'kur', svekla: 'svekla', kapusta: 'kapusta', kartofel: 'kartofel', grechka: 'grechka' };
const RULES = [['grate', /натр[иеё]|тёрк|терк/], ['peel', /очист|почист|снимите кожур/], ['pound', /отбе[йт]|отбить/], ['whisk', /взбе|взбит|венчик/], ['roll', /раскат/],
  ['batter', /тесто.*(половник|налейте|вылейте)|(половник|налейте|вылейте).*тесто|блин|оладь/], ['form', /сформ|слеп|скатайте|котлет|тефтел|шарик/], ['rinse', /промой|перебер.*промой|промыть/],
  ['oil', /(налейте|разогрейте|смажьте).{0,20}масл/], ['pepper', /поперч|перцем/], ['bringBoil', /доведите до кипения|до кипения/], ['simmer', /туши|под крышкой/], ['bake', /запек|духовк/],
  ['cut', /нарежьте|нареж|порежьте|покрошите|нашинкуйте|разрежьте|измельчите/], ['salt', /посолите|посол|соли/], ['fry', /обжар|жарьте|поджар|жарь/], ['stir', /перемеш|помешив|смешайте/],
  ['pour', /залейте|налейте|долейте|влейте/], ['boil', /варите|отвар|кипят|кипени|бульон|сварите/], ['plateUp', /выложите|подайте|подавайте|разложите|посыпьте|полейте|украсьте|сбрызните/], ['rest', /настаи|постоят|оставьте|остуд|снимите с огня|накройте/],
  ['oil', /растоп/], ['fry', /подрумян|румян|сковород[аеу]?,? [^.]*огон/], ['whisk', /блендер/], ['form', /сверните|заверните/], ['rest', /разморо|холодильник/], ['stir', /добавьте|разомните|вмешайте|соедините|заправьте|разберите/]];
function forStep(text, ing) { const t = text.toLowerCase(), names = ing.map(([id, n]) => [id, n.toLowerCase().split(/[ (]/)[0].slice(0, 4)]),
  inStep = names.filter(([, st]) => st.length > 2 && t.includes(st)).map(([id]) => id), prodIn = inStep.map(id => PROD[id]).filter(Boolean), all = ing.map(([id]) => PROD[id]).filter(Boolean);
  const kind = all.includes('svekla') ? 'borsch' : /греч/.test(t) || ing.some(([id]) => id === 'grechka') ? 'grechka' : 'voda';
  const r = RULES.find(([, re]) => re.test(t)); if (!r) return { act: null };
  const a = r[0], p = prodIn[0] || all[0], fryItems = [...new Set((prodIn.length ? prodIn : all).filter(x => ['kur', 'morkov', 'luk', 'kartofel'].includes(x)))].slice(0, 3);
  const make = { cut: () => cut(['morkov', 'luk', 'kur'].includes(p) ? p : 'morkov'), grate: () => grate(p === 'luk' ? 'luk' : 'morkov'), peel: () => peel(p === 'morkov' ? 'morkov' : 'kartofel'), pound: () => pound('kur'),
    whisk: () => whisk(), roll: () => roll(), batter: () => batter(), form: () => form('kur'), rinse: () => rinse(kind === 'grechka' ? 'grechka' : 'grechka'), oil: () => oil(), pepper: () => pepper(kind), bringBoil: () => bringBoil(kind),
    simmer: () => simmer(kind), bake: () => bake(fryItems.length ? fryItems : ['kartofel', 'kur']), salt: () => salt(kind === 'borsch' ? 'borsch' : 'grechka'), fry: () => fry(fryItems.length ? fryItems : ['kur', 'morkov', 'luk']),
    stir: () => stir(fryItems.length ? fryItems : ['luk', 'morkov']), pour: () => pour(), boil: () => boil(kind === 'voda' ? 'grechka' : kind), plateUp: () => plateUp([all.includes('grechka') ? 'grechka' : 'grechka', all.includes('kur') ? 'kur' : 'morkov']), rest: () => rest(kind === 'voda' ? 'grechka' : kind) };
  return { act: a, prod: p, make: make[a] } }

/* ---------- рисунки продуктов для плиток «Всё на столе» (64×64): тот же свет слева сверху, мягкая тень, без эмодзи ---------- */
function icon(k) { const id = ++UID, sh = `<ellipse cx="32" cy="56" rx="20" ry="4" fill="#000" opacity=".12"/>`, w = b => `<svg viewBox="0 0 64 64" aria-hidden="true">${b}</svg>`;
  const lg = (n, a, b, c, v = 1) => `<linearGradient id="${n}${id}" x1="0" y1="0" x2="${v ? 0 : 1}" y2="${v ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
  const rg = (n, a, b, c) => `<radialGradient id="${n}${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
  switch (k) {
    case 'morkov': return w(`<defs>${lg('a', '#FFB45C', '#F2871F', '#C2600F', 0)}</defs>${sh}<g transform="rotate(-38 32 32)"><path d="M22 22Q32 19 42 22L35 56Q32 60 29 56Z" fill="url(#a${id})"/>${[30, 36, 42, 48].map((y, i) => `<path d="M${25 + i * 1.6} ${y}q${6 - i} 1.4 ${12 - i * 3} 0" stroke="#A9520D" stroke-width=".8" fill="none" opacity=".4"/>`).join('')}<path d="M26 24L31 52" stroke="#fff" stroke-width="1.6" opacity=".45" stroke-linecap="round"/>
      <path d="M32 21Q28 10 22 6M32 21Q33 9 32 3M32 21Q37 11 43 7" stroke="#3F8A2E" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M32 21Q30 12 27 8M32 21Q35 12 38 9" stroke="#7BC05A" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`);
    case 'luk': return w(`<defs>${rg('a', '#FBEFD0', '#E8C98A', '#B98447')}</defs>${sh}<path d="M32 12Q34 18 40 22Q52 30 50 42Q48 54 32 55Q16 54 14 42Q12 30 24 22Q30 18 32 12Z" fill="url(#a${id})"/>
      ${[-9, -3, 3, 9].map(x => `<path d="M32 14Q${32 + x * 1.6} 30 ${32 + x * .8} 54" stroke="#A8743A" stroke-width=".8" fill="none" opacity=".45"/>`).join('')}<path d="M24 30Q26 24 32 21" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/><path d="M32 12q-1-5 2-8" stroke="#9C6A32" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M28 55q4 3 8 0" stroke="#C9B38C" stroke-width="1.6" fill="none"/>`);
    case 'kur': return w(`<defs>${rg('a', '#FFF3E4', '#F2D3AE', '#D6A777')}</defs>${sh}<path d="M10 38Q8 26 20 22Q34 17 48 22Q58 27 54 38Q50 50 32 50Q14 50 10 38Z" fill="url(#a${id})"/><path d="M16 30Q30 22 46 26" stroke="#fff" stroke-width="2.2" fill="none" opacity=".65" stroke-linecap="round"/>
      ${[0, 1, 2].map(i => `<path d="M${20 + i * 9} ${34 + i}q6 3 12 1" stroke="#D9A97A" stroke-width=".9" fill="none" opacity=".6"/>`).join('')}`);
    case 'grechka': return w(`<defs>${lg('a', '#F7F3EC', '#E3DACB', '#C9BCA6')}</defs>${sh}<path d="M8 32H56Q54 52 32 53Q10 52 8 32Z" fill="url(#a${id})"/><ellipse cx="32" cy="32" rx="24" ry="7" fill="#EFE8DC"/>
      <ellipse cx="32" cy="31" rx="21" ry="5.4" fill="#8A5A2B"/>${[...Array(22)].map((_, i) => `<ellipse cx="${(14 + R(i, 0, 36)).toFixed(1)}" cy="${(28 + R(i + 3, 0, 5.5)).toFixed(1)}" rx="1.8" ry="1.2" fill="${['#A06A35', '#B07A42', '#7A4C22'][i % 3]}" transform="rotate(${R(i, 0, 180).toFixed(0)} ${(14 + R(i, 0, 36)).toFixed(1)} ${(28 + R(i + 3, 0, 5.5)).toFixed(1)})"/>`).join('')}<path d="M12 36Q14 46 24 50" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>`);
    case 'maslo': return w(`<defs>${lg('a', '#FFE08A', '#F4B92E', '#C98A0E', 0)}${lg('b', '#2F7D57', '#1F6B45', '#14513A', 0)}</defs>${sh}<path d="M27 6H37V14Q46 20 46 30V50Q46 56 40 56H24Q18 56 18 50V30Q18 20 27 14Z" fill="url(#a${id})" opacity=".95"/><rect x="26" y="3" width="12" height="6" rx="2" fill="url(#b${id})"/>
      <rect x="20" y="32" width="24" height="14" rx="3" fill="#fff" opacity=".9"/><circle cx="32" cy="39" r="4" fill="#F4B92E"/><path d="M22 22Q22 18 26 16V52" stroke="#fff" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`);
    case 'voda': return w(`<defs>${lg('a', '#BFE6FB', '#6BC0EE', '#3A93D0')}</defs>${sh}<path d="M16 12H48L44 54Q44 56 42 56H22Q20 56 20 54Z" fill="#fff" opacity=".35" stroke="#C9E4F4" stroke-width="1.4"/><path d="M18.6 26H45.4L44 54Q44 56 42 56H22Q20 56 20 54Z" fill="url(#a${id})" opacity=".9"/>
      <ellipse cx="32" cy="26" rx="13.4" ry="2.6" fill="#D6F0FD"/><path d="M22 16L24 52" stroke="#fff" stroke-width="2.4" opacity=".7" stroke-linecap="round"/>`);
    case 'sol': return w(`<defs>${lg('a', '#F4F6F8', '#D5DBE0', '#AEB7BF', 0)}</defs>${sh}<path d="M12 40Q12 52 32 52Q52 52 52 40Z" fill="url(#a${id})"/><ellipse cx="32" cy="40" rx="20" ry="5.5" fill="#E9EDF0"/>
      <path d="M17 40Q22 28 32 27Q42 28 47 40Q32 44 17 40Z" fill="#fff"/>${[...Array(12)].map((_, i) => `<rect x="${(18 + R(i, 0, 26)).toFixed(1)}" y="${(31 + R(i + 2, 0, 9)).toFixed(1)}" width="1.6" height="1.6" rx=".3" fill="#DDE3E8"/>`).join('')}<path d="M24 33Q28 29 33 29" stroke="#E4E9ED" stroke-width="1.4" fill="none"/>`);
  } return w(sh) }

/* ---------- звук: синтез Web Audio, тихо; непрерывные звуки (вода, шкворчание) — шум через фильтры ---------- */
let AC = null, ON = false, noiseBuf = null, loops = {};
function ac() { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); const n = AC.sampleRate * 2; noiseBuf = AC.createBuffer(1, n, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++)d[i] = Math.random() * 2 - 1 } return AC }
function noise(dur, f1, f2, vol, t0 = 0) { const a = ac(), s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(), n = a.currentTime + t0; s.buffer = noiseBuf; bp.type = 'bandpass'; bp.frequency.value = f1; bp.Q.value = f2;
  g.gain.setValueAtTime(vol, n); g.gain.exponentialRampToValueAtTime(.0001, n + dur); s.connect(bp); bp.connect(g); g.connect(a.destination); s.start(n, Math.random()); s.stop(n + dur + .02) }
function tone(f0, f1, dur, vol) { const a = ac(), o = a.createOscillator(), g = a.createGain(), n = a.currentTime; o.frequency.setValueAtTime(f0, n); o.frequency.exponentialRampToValueAtTime(f1, n + dur); g.gain.setValueAtTime(vol, n); g.gain.exponentialRampToValueAtTime(.0001, n + dur); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n + dur + .02) }
function loop(name, f, q, vol, hp) { if (loops[name]) return; const a = ac(), s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(); s.buffer = noiseBuf; s.loop = true; bp.type = hp ? 'highpass' : 'bandpass'; bp.frequency.value = f; bp.Q.value = q; g.gain.value = 0;
  g.gain.linearRampToValueAtTime(vol, a.currentTime + .25); s.connect(bp); bp.connect(g); g.connect(a.destination); s.start(); loops[name] = { s, g } }
function unloop(name) { const l = loops[name]; if (!l) return; l.g.gain.linearRampToValueAtTime(0, ac().currentTime + .25); l.s.stop(ac().currentTime + .3); delete loops[name] }
/* настоящие записи CC0 (BigSoundBank, docs/zvuki-istochniki.md): короткие mp3 в snd/, грузятся при включении звука; пока не загрузились — синтез */
const SAMP = {}, SND = ['nozh-1', 'nozh-2', 'nozh-3', 'nozh-4', 'hrust-1', 'hrust-2', 'hrust-3'];
function loadSamples() { SND.forEach(n => { if (SAMP[n]) return; SAMP[n] = 'loading'; fetch(BASE + 'snd/' + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => ac().decodeAudioData(b)).then(buf => SAMP[n] = buf).catch(() => delete SAMP[n]) }) }
function play(n, vol = .8, delay = 0, rate = 1) { const b = SAMP[n]; if (!b || b === 'loading') return false; const a = ac(), s = a.createBufferSource(), g = a.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g); g.connect(a.destination); s.start(a.currentTime + delay); return true }
const pick = (p, n) => p + (1 + Math.floor(Math.random() * n));
function sfx(ev, arg) { if (!ON) return;
  // нож: стук по доске в момент касания лезвия + хруст продукта (морковь звонче, лук тише и выше, мясо — без хруста)
  if (ev === 'chop') { if (play(pick('nozh-', 4), .75, 0, .96 + Math.random() * .08)) { if (arg === 'morkov') play(pick('hrust-', 3), .5, .004); else if (arg === 'luk') play(pick('hrust-', 3), .28, .004, 1.18) } else { noise(.05, 2200, .8, .28); tone(170, 90, .07, .22) } }
  else if (ev === 'rattle') { for (let i = 0; i < 5; i++)noise(.018, 5200, 2, .06, i * .02) }
  else if (ev === 'pourSalt') noise(.2, 6500, 1.4, .025); else if (ev === 'grain') noise(.012, 7000, 3, .02);
  else if (ev === 'bubble') { if (Math.random() < .7) tone(R(Math.random() * 99, 240, 380), R(Math.random() * 99, 520, 900), .07, .05) }
  else if (ev === 'pour') loop('pour', 900, .7, .09); else if (ev === 'pour-stop') unloop('pour');
  else if (ev === 'sizzle') { loop('sizzle', 3400, .4, .045, true); if (Math.random() < .2) noise(.02, 6000, 3, .05) }
  else if (ev === 'scrape') { loop('sizzle', 3400, .4, .025, true); if (Math.random() < .04) noise(.16, 1200, 1.2, .05) } }
function stopAll() { Object.keys(loops).forEach(unloop) }

/* ---------- запуск: общий цикл кадров, вне экрана сцены стоят; «уменьшить движение» — один кадр ---------- */
const scenes = new Set(); let raf = 0, SRC = null;
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => e.target._sc && (e.target._sc.vis = e.isIntersecting)), { threshold: .2 }) : null;
function mount(el, sc, opts = {}) { el.innerHTML = ''; el.appendChild(sc.svg); sc.el = el; sc.vis = true; sc.t0 = performance.now() - (opts.offset || 0) * 1000; el._sc = sc; scenes.add(sc); io && io.observe(el);
  if (RM) { sc.frame(sc.T * .45); return sc } if (!raf) raf = requestAnimationFrame(tick); return sc }
function unmount(el) { const sc = el._sc; if (!sc) return; scenes.delete(sc); io && io.unobserve(el); if (SRC === sc) { SRC = null; stopAll() } el._sc = null }
function tick(now) { raf = requestAnimationFrame(tick); const br = (1 + .005 * (1 - Math.cos(now / 6000 * 2 * Math.PI))).toFixed(4); scenes.forEach(sc => { if (!sc.vis) return; sc.svg.style.transform = `scale(${br})`; sc.frame((now - sc.t0) / 1000, SRC === sc ? sfx : null) }) }
window.CA = { cut, pour, salt, fry, boil, stir, grate, rinse, peel, pound, pepper, oil, bringBoil, simmer, bake, whisk, form, roll, batter, plateUp, rest, forStep, RULES, mount, unmount, F, icon,
  sound(on) { ON = on; if (on) { ac().resume(); loadSamples() } else stopAll(); return ON }, source(sc) { if (SRC !== sc) stopAll(); SRC = sc }, get on() { return ON } };
})();
