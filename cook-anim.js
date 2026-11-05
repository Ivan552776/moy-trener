/* Анимации шагов «Поварской книги»: вид строго сверху (как у Kitchen Stories), сцены SVG, кадр считает код (requestAnimationFrame, только transform/opacity и пара атрибутов).
   Сцена — шаблон действия, параметры — содержимое шага: что режем (форма и цвет из продукта), что в кастрюле, что на сковороде.
   Звуки синтезирует Web Audio прямо в браузере — без файлов и чужих лицензий (docs/zvuki-istochniki.md). По умолчанию выключены.
   CA.mount(el, CA.cut('morkov')) — сцена в элемент; CA.sound(true) — звук; «уменьшить движение» — статичный кадр. */
(function () {
const BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/[^/]*$/, ''); // рядом лежит папка snd/
const SQ = ((document.currentScript && document.currentScript.src) || '').replace(/^[^?]*/, ''); // версия звуков = версия скрипта (обход кэша)
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
  const P = F[f] || { c: '#D9D2C0', l: '#F2EEE4', d: '#A89E86' }, g = E('g', {}, p);
  if (GEN[kind] && !KEEP_OLD(f, kind)) { H(g, GEN[kind](P, s, seed)); return g }
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
/* ---------- все 105 продуктов корзины + добавки (вода, соль, перец, лавр…): название, форма рисунка, вид кусочков, цвета (кусочек c/l/d, кожура s) ---------- */
// [название, форма рисунка, вид кусочков, c, l, d, s(кожура/упаковка), доп.]
const CAT = {
  grechka: ['гречка', 'bowl', 'grain', '#93602F', '#C58E56', '#5E3A18'], ris: ['рис', 'bowl', 'rice', '#F7F4EC', '#FFFFFF', '#A99C7E'], ovsyanka: ['овсяные хлопья', 'bowl', 'flake', '#E6D2A2', '#F7ECCF', '#B99A5C'],
  makarony: ['макароны', 'bowl', 'tube', '#F0C964', '#FBE3A0', '#C2922A'], perlovka: ['перловка', 'bowl', 'rice', '#E4D5B2', '#F4ECD8', '#B3A079'], psheno: ['пшено', 'bowl', 'seed', '#F1C33C', '#FBE08A', '#C4901A'],
  chechevitsa: ['чечевица', 'bowl', 'lentil', '#E8803A', '#F6A866', '#B5581C'], fasol: ['фасоль', 'can', 'bean', '#9E3B2A', '#C9614A', '#6B2216', '#C24A32'], kartofel: ['картофель', 'round', 'cube', '#F0D58F', '#FFF1C8', '#C79C4A', '#C99556', 'potato'],
  kapusta: ['капуста', 'cabbage', 'strip', '#DDEDC0', '#F4FAE8', '#A2C477', '#B9DA8E'], morkov: ['морковь', 'carrot', 'coin', '#F2871F', '#FFB45C', '#B8560F'], luk: ['лук', 'onion', 'cube', '#F7EED6', '#FFFBF0', '#D9C391'],
  svekla: ['свёкла', 'round', 'stick', '#8E1B3A', '#C2456A', '#56091F', '#7A1A33', 'beet'], chesnok: ['чеснок', 'garlic', 'crumb', '#F6EFD9', '#FFFDF5', '#D8CBA6'], ogurets: ['огурец', 'long', 'coin', '#CFE6A8', '#EEF7DC', '#5E9A3A', '#3F8A2E', 'bumps'],
  pomidor: ['помидор', 'round', 'cube', '#E5402E', '#FF7B5E', '#A92314', '#E5402E', 'tomato'], perets: ['сладкий перец', 'bell', 'strip', '#E23B2B', '#FF7A5C', '#A01F12'], kabachok: ['кабачок', 'long', 'coin', '#EEF1C8', '#FBFCEA', '#7FA650', '#6B9A3E'],
  ovoshchi: ['овощная смесь', 'bowl', 'mix', '#F2871F', '#7BC05A', '#F2C640'], brokkoli: ['брокколи', 'floret', 'floret', '#4E8F3A', '#79B35A', '#2F6522'], ukrop: ['укроп', 'herb', 'speck', '#5FA641', '#8BCB6A', '#3D7A28'],
  yabloko: ['яблоко', 'round', 'slice', '#F6E7B8', '#FFF8DE', '#D5B96F', '#D63B30', 'apple'], banan: ['банан', 'banana', 'coin', '#F7EBC0', '#FFF8E0', '#D9C278', '#F5CD3A'], yagody: ['ягоды', 'bowl', 'berry', '#7E2C4E', '#B7547A', '#4A1229'],
  kur_grudka: ['куриное филе', 'meat', 'chunk', '#F1D7B6', '#FFF0DE', '#C79A6A', '', 'kur'], kur_bedro: ['куриное бедро', 'meat', 'chunk', '#EDC9A6', '#FBE6CF', '#C08B5B', '', 'kur'], farsh_kur: ['куриный фарш', 'mince', 'ball', '#F0CDB0', '#FBE6D3', '#C9936A'],
  farsh: ['фарш', 'mince', 'ball', '#C9645A', '#E58B80', '#8E3A32'], govyadina: ['говядина', 'meat', 'chunk', '#A8322E', '#D0564C', '#6E1A17', '', 'marble'], indeyka: ['индейка', 'meat', 'chunk', '#F2D6BE', '#FFF0E2', '#C99E7A', '', 'kur'],
  pechen: ['печень', 'meat', 'chunk', '#6E1F22', '#9A3A3A', '#3E0C0F', '', 'gloss'], mintay: ['минтай', 'fillet', 'chunk', '#F6EEE6', '#FFFFFF', '#D9C9BA'], tunets: ['тунец', 'can', 'flake', '#C9A07A', '#E2C4A4', '#93704E', '#2F7FB8'],
  egg: ['яйца', 'egg', 'egg', '#FFFFFF', '#FFFFFF', '#E8E2D6', '#F1DCC0'], tvorog: ['творог', 'tub', 'crumb', '#FBF8F0', '#FFFFFF', '#E3DBC8', '#3E8ED0'], kefir: ['кефир', 'carton', 'drop', '#FBFAF6', '#FFFFFF', '#E2DED4', '#2F9E6A'],
  moloko: ['молоко', 'carton', 'drop', '#FDFDFB', '#FFFFFF', '#E3E6EA', '#3E8ED0'], smetana: ['сметана', 'tub', 'drop', '#FBF6EA', '#FFFFFF', '#E6DCC4', '#E9A23B'], syr: ['сыр', 'cheese', 'crumb', '#F6D266', '#FDE7A0', '#D2A52E'],
  maslo_rast: ['подсолнечное масло', 'oil', 'drop', '#F4B92E', '#FFE08A', '#C98A0E'], maslo_sliv: ['сливочное масло', 'butter', 'cube', '#FBE7A6', '#FFF6D6', '#E2C470'], muka: ['мука', 'bag', 'powder', '#FBF8F2', '#FFFFFF', '#E5DFD2', '#D9C29A'],
  myod: ['мёд', 'jar', 'drop', '#E8A21E', '#FFC95A', '#B06F0A'], hleb: ['ржаной хлеб', 'bread', 'cube', '#6E4428', '#8E5E3A', '#3E2414', '#5A3418', 'rye'], lavash: ['лаваш', 'lavash', 'strip', '#F2E2BE', '#FBF2DC', '#D2B582'],
  tomat: ['томатная паста', 'jar', 'drop', '#C8321F', '#E8604A', '#8A1D10'], orehi: ['грецкий орех', 'nut', 'nut', '#B98A55', '#D9B07C', '#7E5630'], svinina: ['свинина', 'meat', 'chunk', '#E7A59A', '#F6C8BE', '#B9746A', '', 'fat'],
  gorbusha: ['горбуша', 'fillet', 'chunk', '#F2936C', '#FFB896', '#C2633F'], seld: ['сельдь', 'fish', 'chunk', '#D9B6AE', '#EFD6D0', '#9E7A72', '#8FA3B4'], nut: ['нут', 'bowl', 'bean', '#E3BE7E', '#F4D9A6', '#B48E4E'],
  goroh: ['горох', 'bowl', 'lentil', '#F0C850', '#FBE08A', '#C59A22'], manka: ['манка', 'bowl', 'powder', '#F8EFD6', '#FFFBEF', '#E2D2A8'], kukuruz_krupa: ['кукурузная крупа', 'bowl', 'powder', '#F6CB4A', '#FDE38E', '#D2A120'],
  tykva: ['тыква', 'pumpkin', 'cube', '#F28A2B', '#FFB15E', '#C25E10'], baklazhan: ['баклажан', 'long', 'cube', '#F1E8C8', '#FBF6E4', '#C9B98A', '#4B2350', 'aub'], cv_kapusta: ['цветная капуста', 'floret', 'floret', '#F4EEDC', '#FFFDF4', '#D6C9A4'],
  shampinony: ['шампиньоны', 'mushroom', 'mush', '#EFE6D8', '#FFFFFF', '#C9B8A0'], goroshek: ['зелёный горошек', 'can', 'pea', '#7DBA48', '#A6D676', '#4F8A24', '#3F8A2E'], kukuruza: ['кукуруза', 'can', 'pea', '#F6CB3A', '#FDE38E', '#C99A10', '#2F7FB8'],
  ogurtsy_sol: ['солёные огурцы', 'long', 'coin', '#B9C778', '#D9E3A6', '#6E7E2E', '#5E6E22', 'bumps'], kv_kapusta: ['квашеная капуста', 'bowl', 'strip', '#EDEBC4', '#FAF9E4', '#C3C080'], luk_zel: ['зелёный лук', 'herb', 'ring', '#5FAE3E', '#9AD676', '#3B7A22', '', 'stalk'],
  petrushka: ['петрушка', 'herb', 'speck', '#3F9A3A', '#6DC060', '#26701F', '', 'flat'], limon: ['лимон', 'round', 'coin', '#F8E06A', '#FFF3B0', '#D8B21E', '#F2D22E', 'lemon'], apelsin: ['апельсин', 'round', 'coin', '#F7962E', '#FFC07A', '#C9680E', '#F38B1F', 'pores'],
  grusha: ['груша', 'pear', 'slice', '#F4EBC4', '#FFFAE4', '#D2C07E', '#C9C24A'], izyum: ['изюм', 'bowl', 'berry', '#5A2E1E', '#8A5236', '#2E140A'], yogurt: ['йогурт', 'tub', 'drop', '#FBF9F3', '#FFFFFF', '#E4DFD2', '#7E5AA8'],
  ryazhenka: ['ряженка', 'carton', 'drop', '#F2DEC4', '#FBEFDF', '#D6B994', '#C9662E'], brynza: ['брынза', 'cheese', 'cube', '#FBFAF4', '#FFFFFF', '#E3E0D2', '', 'white'], mayonez: ['майонез', 'tub', 'drop', '#FBF2D2', '#FFFBEA', '#E3D3A0', '#2F7FB8'],
  sahar: ['сахар', 'bowl', 'seed', '#FFFFFF', '#FFFFFF', '#DCE2E8'], indeyka_farsh: ['фарш индейки', 'mince', 'ball', '#F0C9AE', '#FBE3D2', '#C68F6A'], kur_okor: ['куриные окорочка', 'drum', 'chunk', '#EFCDA8', '#FBE6CF', '#C08B5B', '', 'kur'],
  treska: ['треска', 'fillet', 'chunk', '#F8F1EA', '#FFFFFF', '#DCCBBC'], skumbriya: ['скумбрия', 'fish', 'chunk', '#D9B9A8', '#EFD9CC', '#9E7A66', '#3E6E7E', 'stripes'], kalmar: ['кальмар', 'squid', 'ring', '#F6EEEA', '#FFFFFF', '#D9C6BE'],
  krevetki: ['креветки', 'shrimp', 'shrimp', '#F49A7A', '#FFC3AA', '#C9654A'], krab_pal: ['крабовые палочки', 'crab', 'stick', '#FFFFFF', '#FFFFFF', '#E0DCD6', '#E2452E'], baranina: ['баранина', 'meat', 'chunk', '#B4483E', '#D46A5E', '#7A2620', '', 'fat'],
  kur_goleni: ['куриные голени', 'drum', 'chunk', '#EFCDA8', '#FBE6CF', '#C08B5B', '', 'kur'], bulgur: ['булгур', 'bowl', 'seed', '#D9AE62', '#ECCB8A', '#A97E34'], kuskus: ['кускус', 'bowl', 'seed', '#F1D58A', '#FBEAB8', '#C9A752'],
  shpinat: ['шпинат', 'leaf', 'leaf', '#3E8A36', '#66B05A', '#25601E'], fasol_str: ['стручковая фасоль', 'pods', 'stick', '#5FA641', '#8BCB6A', '#3D7A28'], redis: ['редис', 'round', 'coin', '#FBF6F4', '#FFFFFF', '#E3B8C0', '#D2304E', 'radish'],
  salat_list: ['листья салата', 'leaf', 'leaf', '#8CC85A', '#B9E08E', '#5E9A36', '', 'light'], kivi: ['киви', 'round', 'coin', '#8DBE3A', '#C3E07A', '#5E8A1E', '#8A6236', 'kiwi'], mandarin: ['мандарин', 'round', 'coin', '#F8A23A', '#FFC882', '#D2741A', '#F7962E', 'pores'],
  chernosliv: ['чернослив', 'bowl', 'berry', '#2E1A22', '#5A3646', '#140A0E'], kuraga: ['курага', 'bowl', 'berry', '#F29A3A', '#FFC07A', '#C4681A'], semechki: ['семечки', 'bowl', 'seed', '#B9B4A6', '#D9D4C6', '#7E7A6E'],
  arahis: ['арахис', 'bowl', 'bean', '#D9A866', '#F0CB92', '#A97A3A'], maslo_ol: ['оливковое масло', 'oil', 'drop', '#B9B33A', '#DCD67A', '#7E7A1A', '#6E8A2E'], hleb_zern: ['цельнозерновой хлеб', 'bread', 'cube', '#9A6A3E', '#C08E5E', '#5E3E1E', '#8A5A2E', 'seeds'],
  baton: ['батон', 'bread', 'cube', '#F3DFB6', '#FFF3D8', '#D4B67E', '#D99A4E', 'baton'], hlebcy: ['хлебцы', 'crisp', 'crumb', '#C8955A', '#E0B884', '#8E6230'], masliny: ['маслины', 'jar', 'ring', '#2E2A30', '#5A5460', '#121014', '', 'olives'],
  soy_sous: ['соевый соус', 'bottle', 'drop', '#3A1E12', '#6E3E22', '#1A0C06', '#C8321F'], ketchup: ['кетчуп', 'bottle', 'drop', '#C8321F', '#E8604A', '#8A1D10', '#C8321F'], gorchica: ['горчица', 'jar', 'drop', '#D9A81E', '#F2CB5A', '#9E760A'],
  cheese_ady: ['адыгейский сыр', 'cheese', 'cube', '#FBF8EC', '#FFFFFF', '#E6DFC8', '', 'white'], smetana20: ['сметана', 'tub', 'drop', '#FBF4E2', '#FFFFFF', '#E6D8B6', '#E9A23B'], tvorog9: ['творог', 'tub', 'crumb', '#FBF6EA', '#FFFFFF', '#E3D8C0', '#3E8ED0'],
  // добавки из рецептов (не из корзины)
  voda: ['вода', 'water', 'drop', '#9FDAF7', '#D6F0FD', '#3E93CC'], sol: ['соль', 'salt', 'seed', '#FFFFFF', '#FFFFFF', '#C9D0D6'], perec_ch: ['чёрный перец', 'peppercorn', 'seed', '#3A2A1E', '#6E5644', '#1A120A'],
  paprika: ['паприка', 'bowl', 'powder', '#C8321F', '#E8604A', '#8A1D10'], travy: ['сушёные травы', 'bowl', 'speck', '#6E8A3A', '#9AB25E', '#4A6222'],
  lavr: ['лавровый лист', 'bay', 'leaf', '#6E8A3A', '#9AB25E', '#4A6222'], zira: ['зира', 'bowl', 'seed', '#9E7A4A', '#C29E6E', '#6E5230'], uksus: ['уксус', 'bottle', 'drop', '#EEF4F2', '#FFFFFF', '#C9D6D2', '#E8EEEC'],
  soda: ['сода', 'box', 'powder', '#FFFFFF', '#FFFFFF', '#DCE2E8', '#E2452E'], lim_sok: ['лимонный сок', 'round', 'drop', '#F8E06A', '#FFF3B0', '#D8B21E', '#F2D22E', 'lemon'],
};
// продукт → его цвета для сцен (F) и вид кусочков (KIND); у старых сцен свои ключи (kur — общий вид курицы)
for (const k in CAT) { const [n, , pc, c, l, d, s] = CAT[k]; if (!F[k]) F[k] = { c, l, d, n, s: s || c, cut: pc }; else Object.assign(F[k], { n, s: s || F[k].c }); if (!KIND[k]) KIND[k] = pc }
['kur_grudka', 'kur_bedro', 'indeyka', 'kur_okor', 'kur_goleni'].forEach(k => KIND[k] = 'chunk');
const IS_KUR = k => /^(kur|kur_grudka|kur_bedro|indeyka|kur_okor|kur_goleni)$/.test(k);

/* ---------- узнать продукт в тексте шага: основы слов; сначала точные (зелёный лук, томатная паста), потом общие ---------- */
const B = '(?<![а-яё])';
const STEM = [
  ['luk_zel', `зелён[а-я]* лук|лук[а-я]* зелён|перь[а-я]* лук`], ['kv_kapusta', `квашен[а-я]* капуст`], ['cv_kapusta', `цветн[а-я]* капуст`], ['ogurtsy_sol', `солён[а-я]* огур|маринован[а-я]* огур|огур[а-я]* солён`],
  ['tomat', `томатн[а-я]* паст|томат-паст|${B}паст[уаыо]?${B.replace('<', '')}`], ['kukuruz_krupa', `кукурузн[а-я]* круп|полент`], ['fasol_str', `стручк`], ['indeyka_farsh', `фарш[а-я]* индейк|индюшин[а-я]* фарш`], ['farsh_kur', `курин[а-я]* фарш|фарш[а-я]* курин`],
  ['maslo_sliv', `сливочн[а-я]* масл`], ['maslo_ol', `оливков[а-я]* масл`], ['maslo_rast', `подсолнечн[а-я]* масл|растительн[а-я]* масл`], ['soy_sous', `соев`], ['lim_sok', `лимонн[а-я]* сок|сок[а-я]* лимон`], ['salat_list', `лист[а-я]* салат|салатн[а-я]* лист|листов[а-я]* салат`],
  ['hleb_zern', `цельнозерн`], ['cheese_ady', `адыгейск`], ['krab_pal', `крабов`], ['ovoshchi', `овощн[а-я]* смес|замороженн[а-я]* овощ`], ['perec_ch', `чёрн[а-я]* перц|перц[а-я]* чёрн|перец чёрн|чёрный перец|молот[а-я]* перц|перец молот|горошк[а-я]* перц|перц[а-я]* горошк`],
  ['grechka', `греч`], ['ris', `${B}рис(?:а|у|ом|е|ов[а-я]*)?(?![а-яё])`], ['ovsyanka', `овсян|хлопь`], ['makarony', `макарон|спагетти|рожк|${B}перь(?:я|ев)(?! лук)`], ['perlovka', `перлов`], ['psheno', `пшен`], ['chechevitsa', `чечевиц`],
  ['fasol', `фасол`], ['kartofel', `картоф|картош|клубн`], ['kapusta', `капуст`], ['morkov', `морков|морк(?:ви|овь)`], ['luk', `${B}лук(?![а-яё]*овиц[а-я]* чеснок)|луковиц`], ['svekla', `свёкл|свекл`], ['chesnok', `чеснок|чесноч|зубч`],
  ['ogurets', `огур`], ['pomidor', `помидор|томат(?!н)|черри`], ['perets', `сладк[а-я]* пер[ец]|болгарск|${B}пер(?:ец|ца|цы|цу|цем)(?![а-яё])`], ['kabachok', `кабач|цукин`], ['brokkoli', `брокколи`], ['ukrop', `укроп`], ['petrushka', `петрушк`],
  ['yabloko', `яблок`], ['banan', `банан`], ['yagody', `ягод`], ['limon', `лимон`], ['apelsin', `апельсин`], ['grusha', `груш`], ['kivi', `киви`], ['mandarin', `мандарин`], ['izyum', `изюм`], ['chernosliv', `черносл`], ['kuraga', `кураг`],
  ['farsh', `фарш|голубц|пельмен|тефтел|котлет|фрикадел|биточ|зраз`], ['kur_okor', `окороч`], ['kur_goleni', `голен`], ['kur_bedro', `бедр`], ['kur_grudka', `грудк|филе`], ['indeyka', `индейк|индюш`], ['kur', `куриц|курин|курочк|${B}кур(?:а|у)?${B.replace('<', '')}`],
  ['myaso', `${B}мяс(?:о|а|у|ом|е)(?![а-яё])|отбивн|стейк`], ['govyadina', `говядин|говяж`], ['svinina', `свинин|свин(?!о-)`], ['baranina', `баранин`], ['pechen', `печен[ьиюе](?![а-яё])|печенк`], ['mintay', `минта`], ['treska', `треск`], ['gorbusha', `горбуш`], ['seld', `сельд|селёд`], ['skumbriya', `скумбри`],
  ['tunets', `тунц|тунец`], ['fish', `рыб`], ['kalmar', `кальмар`], ['krevetki', `кревет`], ['egg', `яйц|яиц|яйк|желтк|белк(?:и|ов|ами)`], ['tvorog', `творог|творож|сырник`], ['kefir', `кефир`], ['moloko', `молок|молочн`], ['smetana', `сметан`],
  ['brynza', `брынз`], ['syr', `${B}сыр(?!ник)`], ['yogurt', `йогурт`], ['ryazhenka', `ряженк`], ['mayonez', `майонез`], ['maslo', `${B}масл`], ['muka', `${B}мук`], ['myod', `мёд|${B}мед(?:а|ом|у)(?![а-яё])`], ['sahar', `сахар`], ['baton', `батон`], ['hlebcy', `хлебц`],
  ['hleb', `хлеб|гренк|сухар`], ['lavash', `лаваш`], ['orehi', `орех`], ['arahis', `арахис`], ['semechki', `семечк|семен`], ['shampinony', `шампиньон|гриб`], ['tykva', `тыкв`], ['baklazhan', `баклажан`], ['goroshek', `горош(?:ек|ка|ком|ку)`], ['kukuruza', `кукуруз`],
  ['nut', `${B}нут`], ['goroh', `горох`], ['manka', `манк|манн`], ['bulgur', `булгур`], ['kuskus', `кускус`], ['shpinat', `шпинат`], ['redis', `редис`], ['masliny', `маслин|оливк`], ['ketchup', `кетчуп`], ['gorchica', `горчиц`],
  ['paprika', `паприк`], ['travy', `трав|орегано|базилик|прованс`], ['lavr', `лавров`], ['zira', `зир|кумин`], ['uksus', `уксус`], ['soda', `${B}сод`], ['sol', `${B}сол(?:ь|и|ью)(?![а-яё])`], ['voda', `${B}вод(?:а|ы|у|ой|е)(?![а-яё])|кипят`],
].map(([k, s]) => [k, new RegExp(s, 'g')]);
// общие слова → конкретный продукт из состава блюда
const GROUP = { myaso: ['govyadina', 'svinina', 'baranina', 'kur_grudka', 'kur_bedro', 'indeyka', 'kur_okor', 'kur_goleni', 'pechen', 'farsh', 'farsh_kur', 'indeyka_farsh'], kur: ['kur_grudka', 'kur_bedro', 'kur_okor', 'kur_goleni', 'indeyka', 'farsh_kur'], farsh: ['farsh', 'farsh_kur', 'indeyka_farsh'], fish: ['mintay', 'treska', 'gorbusha', 'seld', 'skumbriya', 'tunets'],
  maslo: ['maslo_rast', 'maslo_ol', 'maslo_sliv'], tvorog: ['tvorog', 'tvorog9'], smetana: ['smetana', 'smetana20'], syr: ['syr', 'brynza', 'cheese_ady'], hleb: ['hleb', 'hleb_zern', 'baton', 'hlebcy'], kur_grudka: ['kur_grudka', 'indeyka', 'kur_bedro'],
  pomidor: ['pomidor', 'tomat'], egg: ['egg'], kapusta: ['kapusta', 'kv_kapusta', 'cv_kapusta'], limon: ['limon', 'lim_sok'] };
const FREE = new Set(['voda', 'sol', 'perec_ch', 'lavr', 'zira', 'uksus', 'soda', 'lim_sok', 'paprika', 'travy']); // добавки: не нужны в составе
// продукты в тексте: [{k, at}] по порядку; найденный кусок закрывается, чтобы «зелёный лук» не дал ещё и «лук»
function prodsIn(text, ing) { const have = new Set(ing.map(x => x[0])); let t = text.toLowerCase().replace(/ё/g, 'ё'); const out = [];
  for (const [k, re] of STEM) { re.lastIndex = 0; let m; while ((m = re.exec(t))) { let id = null;
      if (GROUP[k]) id = GROUP[k].find(x => have.has(x)) || (have.has(k) ? k : null); else if (have.has(k) || FREE.has(k)) id = k;
      if (k === 'farsh' && !id && /голубц|пельмен|тефтел|котлет|фрикадел|биточ|зраз/.test(m[0])) id = GROUP.kur.find(x => have.has(x)) || GROUP.fish.find(x => have.has(x)) || (have.has('tvorog') ? 'tvorog' : null);
      if (k === 'perets' && /^пер/.test(m[0]) && !have.has('perets')) id = 'perec_ch';
      if (id) out.push({ k: id, at: m.index, end: m.index + m[0].length });
      t = t.slice(0, m.index) + ' '.repeat(m[0].length) + t.slice(m.index + m[0].length); re.lastIndex = m.index + m[0].length } }
  return out.sort((a, b) => a.at - b.at) }

/* ---------- глагол шага → действие (берётся первый глагол шага; существительные вроде «котлеты» действие не задают) ---------- */
const VERB = [
  ['cut', 'нарежьте|нарезайте|разрежьте|порубите|нашинкуйте|вырежьте|срежьте|отрежьте|разрубите|измельчите|покрошите|порежьте|разделайте|нареж[а-я]*'], ['tear', 'порвите|разорвите|разберите'],
  ['grate', 'натрите|натирайте|трите|прокрутите|выдавите|раздавите'], ['peel', 'очистите|почистите|чистите|снимите кожу|снимите кожуру|удалите|освободите|выпотрошите'],
  ['rinse', 'промойте|вымойте|переберите|ополосните|промыть'], ['soak', 'замочите|замачивайте'], ['dry', 'обсушите|подсушите|сушите|промокните'], ['crack', 'вбейте|разбейте|разбивайте|пробейте'],
  ['whisk', 'взбейте|взбивайте'], ['pound', 'отбейте|отбить'], ['knead', 'вымесите|замесите|вымешивайте|вымешайте'], ['roll', 'раскатайте|разровняйте|раскатывайте'],
  ['form', 'сформуйте|сформируйте|слепите|скатайте|сверните|заверните|защипните|подверните|воткните|наполните'], ['coat', 'обваляйте|обмакивайте|панируйте'], ['spread', 'намажьте|смажьте'],
  ['oil', 'разогрейте|растопите|налейте масло'], ['bringBoil', 'доведите|вскипятите'], ['boil', 'варите|сварите|отварите|уварите|проварите'], ['fry', 'обжарьте|обжаривайте|жарьте|поджарьте|подрумяньте|прогрейте|прогревайте|подогрейте|переверните|переворачивайте'],
  ['simmer', 'тушите|потушите|томите|накройте|убавьте'], ['bake', 'запекайте|запеките|выпекайте|испеките|поставьте в духовку|включите'], ['batter', 'налейте тесто|выливайте тесто'],
  ['pour', 'залейте|влейте|налейте|подлейте|долейте|отлейте|вылейте|разведите|полейте|сбрызните'], ['salt', 'посолите|подсолите'], ['pepper', 'поперчите'],
  ['add', 'добавьте|положите|всыпьте|опустите|сложите|верните|высыпьте|насыпьте|прибавьте|переложите|выкладывайте|уложите|соберите|застелите'],
  ['stir', 'разрыхлите|взрыхлите|перемешайте|смешайте|помешайте|размешайте|помешивайте|заправьте|соедините|разомните|перемешивайте|встряхните'], ['drain', 'слейте|откиньте|стряхните|отожмите|выжмите|процедите'],
  ['plateUp', 'выложите|подайте|подавайте|разложите|посыпьте|украсьте|присыпьте|ешьте|съешьте'], ['lift', 'выньте|достаньте|извлеките|уберите|выбросьте'],
  ['rest', 'дайте|остудите|оставьте|держите|подержите|отложите|разморозьте|размораживайте|снимите|выключите|храните|настаивайте'], ['show', 'проверьте|отмерьте|откройте|разделите|сделайте|проколите|готовьте|попробуйте|поставьте|отделите|выберите|повторите'],
].map(([a, s]) => [a, new RegExp(`${B}(?:${s})(?![а-яё])`, 'g')]);
const VESSEL_ACT = new Set(['boil', 'bringBoil', 'simmer', 'salt', 'pepper', 'rest', 'pour', 'add']);
function verbs(t) { const out = []; for (const [a, re] of VERB) { re.lastIndex = 0; let m; while ((m = re.exec(t))) out.push({ a, at: m.index, w: m[0] }) } return out.sort((x, y) => x.at - y.at) }


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
  const CX = 196, CY = 90, prod = E('g', { id: `art${id}` }, E('defs', {}, svg));
  if (f === 'morkov') H(prod, `<g stroke-linecap="round" fill="none">${[['#2F6B22', 4, 'M88 88Q72 80 60 70'], ['#3F8A2E', 3.4, 'M88 86Q76 70 76 54'], ['#5FA641', 3, 'M87 92Q70 96 56 96'], ['#7BC05A', 2.4, 'M89 84Q86 68 94 56'], ['#4E9A38', 2.6, 'M88 94Q74 106 64 114']].map(([c, w, d]) => `<path d="${d}" stroke="${c}" stroke-width="${w}"/>`).join('')}
     <path d="M76 54q-6-4-4-10M94 56q-3-6 3-10M60 70q-8-2-10-8M56 96q-8 0-12-6M64 114q-6 3-12 0" stroke="#7BC05A" stroke-width="2"/></g>
     <path d="M100 76.5C130 76 166 80 ${CX} 82L${CX} 98C166 100 130 104.5 100 104C90 103 86 97 86 90C86 83 90 77.5 100 76.5Z" fill="url(#car${id})"/>
     ${[...Array(9)].map((_, i) => { const x = 104 + i * 10.2, h = lerp(26, 16, i / 9); return `<path d="M${x} ${90 - h / 2}q1.8 ${h / 2} 0 ${h}" stroke="${P.d}" stroke-width=".8" fill="none" opacity="${R(i, .22, .4).toFixed(2)}"/>` }).join('')}
     <path d="M96 80C130 79 166 82.5 ${CX - 4} 84.5" stroke="#fff" stroke-width="2.6" fill="none" opacity=".5" stroke-linecap="round"/>`);
  else if (f === 'luk') { const ox = CX - 42, oy = CY, L = ox - 42;
    defs(svg, `<radialGradient id="pearl${id}" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#FFFEFA"/><stop offset=".7" stop-color="#F7F0DE"/><stop offset="1" stop-color="#EADBB8"/></radialGradient>
     <linearGradient id="skin${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8BE78"/><stop offset=".6" stop-color="#C98C3E"/><stop offset="1" stop-color="#9C6528"/></linearGradient><clipPath id="oc${id}"><rect x="0" y="0" width="${CX + 1}" height="200"/></clipPath>`);
    const og = E('g', { 'clip-path': `url(#oc${id})` }, prod);
    H(og, `<ellipse cx="${ox}" cy="${oy}" rx="45" ry="33" fill="url(#skin${id})"/><ellipse cx="${ox}" cy="${oy}" rx="42" ry="30.5" fill="url(#pearl${id})"/>
     ${[.82, .66, .5, .34, .2].map(k => `<ellipse cx="${(L + 42 * k).toFixed(1)}" cy="${oy}" rx="${(42 * k).toFixed(1)}" ry="${(30.5 * k).toFixed(1)}" fill="none" stroke="#E2D1A9" stroke-width="1.1"/>`).join('')}
     <path d="M${L + 1} ${oy - 4}q-6 -1 -9 -5M${L + 1} ${oy}h-10M${L + 1} ${oy + 4}q-6 1 -9 5" stroke="#8E6232" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="${L + 3}" cy="${oy}" rx="3" ry="4.5" fill="#B9874A"/>
     <path d="M${ox - 24} ${oy - 20}Q${ox} ${oy - 30} ${ox + 22} ${oy - 22}" stroke="#fff" stroke-width="2.4" fill="none" opacity=".75" stroke-linecap="round"/>
     <path d="M${ox + 30} ${oy - 22}Q${ox + 44} ${oy - 8} ${ox + 42} ${oy + 10}" stroke="#7E4E1E" stroke-width="1" fill="none" opacity=".45"/>`) }
  else if (f !== 'kur' && !IS_KUR(f)) H(prod, artAt(f, 82, 32, 116).replace(/<ellipse cx="32" cy="56" rx="[\d.]+" ry="4" fill="#000" opacity=".12"\/>/, ''));
  else H(prod, `<path d="M88 72Q130 64 ${CX} 74L${CX} 106Q130 116 88 108Q74 90 88 72Z" fill="url(#chk${id})"/>`);
  // нож сверху: клинок поперёк продукта, рукоять к зрителю (вниз)
  const KS = E('g', {}), ksh = E('g', { filter: `url(#sb${id})` }, KS), ksp = E('path', { d: 'M3 -74Q6 -68 7 -58L8 24L-16 24Q-17 -12 -6 -50Q-1 -66 3 -74Z', fill: '#000' }, ksh);
  const knife = E('g', {}, KS);
  H(knife, `<path d="M3 -74Q6 -68 7 -58L8 24L-16 24Q-17 -12 -6 -50Q-1 -66 3 -74Z" fill="url(#bld${id})"/>
   <path d="M3 -74Q-1 -66 -6 -50Q-17 -12 -16 24" stroke="#fff" stroke-width="1.3" fill="none" opacity=".95"/><path d="M1 -66Q-4 -52 -9 -34Q-13 -12 -12 22" stroke="#B9C1C8" stroke-width="2.2" fill="none" opacity=".8"/>
   <path d="M6 -58L7 22" stroke="#5E666E" stroke-width="1.6" opacity=".85"/><path d="M-2 -40Q-5 -12 -4 18" stroke="#fff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
   <path d="M-17 23H9V30H-17Z" fill="#C9D0D6"/><path d="M-17 29H9" stroke="#8E979F" stroke-width="1"/><path d="M-9 30H6Q8 30 8 33V78Q8 85 -0.5 85Q-9 85 -9 78V33Q-9 30 -7 30Z" fill="url(#khd${id})"/>
   <circle cx="-.5" cy="44" r="2" fill="#D7DDE2"/><circle cx="-.5" cy="58" r="2" fill="#D7DDE2"/><circle cx="-.5" cy="72" r="2" fill="#D7DDE2"/><path d="M-6 35V80" stroke="#fff" stroke-width=".9" opacity=".25"/>`);
  /* продукт по-настоящему укорачивается: каждый удар отрезает ломтик от правого края.
     Рисунок продукта один (в defs), на доске — его копия, обрезанная по линии реза; ломтик — та же копия, обрезанная полоской
     [рез; рез + толщина]: он отделяется от продукта в месте удара, выходит из-под ножа, ложится в горку и опрокидывается срезом вверх.
     Между ударами продукт подвигается под нож на толщину ломтика. Когда продукт кончается — огрызок и горка уходят, появляется целый. */
  const kd = KIND[f] || 'chunk', N = 8, STEP = .55, T0 = .5, T = T0 + N * STEP + .55 + .45, FL = P.core || mixc(P.l, '#ffffff', .25);
  defs(svg, `<filter id="fl${id}" x="-5%" y="-5%" width="110%" height="110%"><feFlood flood-color="${FL}"/><feComposite in2="SourceAlpha" operator="in"/></filter>
   <filter id="ps${id}" x="-20%" y="-30%" width="140%" height="160%"><feFlood flood-color="#000"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="2.2"/></filter>
   <clipPath id="cp${id}" clipPathUnits="userSpaceOnUse"><rect x="-400" y="-400" width="1200" height="1000"/></clipPath><clipPath id="cf${id}" clipPathUnits="userSpaceOnUse"><rect x="0" y="-400" width="0" height="1000"/></clipPath>` +
   [...Array(N)].map((_, k) => `<clipPath id="cs${id}_${k}" clipPathUnits="userSpaceOnUse"><rect x="0" y="-400" width="0" height="1000"/></clipPath>`).join(''));
  const cpR = svg.querySelector(`#cp${id} rect`), cfR = svg.querySelector(`#cf${id} rect`), use = (p, a = {}) => E('use', Object.assign({ href: `#art${id}` }, a), p);
  const board = E('g', { 'data-probe': 'prod' }, svg), pg = E('g', { 'clip-path': `url(#cp${id})` }, board), fg = E('g', { 'clip-path': `url(#cf${id})` }, board), sh0 = use(pg, { filter: `url(#ps${id})`, opacity: .3, transform: 'translate(4 6)' }), pu = use(pg);
  use(fg, { filter: `url(#fl${id})`, opacity: .95 });
  const pile = E('g', {}, svg), per = kd === 'cube' ? 2 : 1, spots = [...Array(N * per)].map((_, j) => { const a = R(j + 3, -1, 1), r = Math.sqrt(R(j + 11, 0, 1));
    return { x: 252 + a * 26 * r + R(j, -4, 4), y: 92 + (R(j + 7, -1, 1)) * 26 * r } });
  const sl = [...Array(N)].map((_, k) => { const o = E('g', { opacity: 0 }, pile), ic = E('g', { 'clip-path': `url(#cs${id}_${k})` }, o); use(ic, { filter: `url(#ps${id})`, opacity: .3, transform: 'translate(1.5 2.5)' }); use(ic);
    const pcs = [...Array(per)].map((_, q) => { const w = E('g', { opacity: 0 }, pile), j = k * per + q; H(w, shade(id, kd === 'coin' ? '<circle r="7.6"/>' : kd === 'cube' ? '<rect x="-4.4" y="-4.4" width="8.8" height="8.8" rx="2"/>' : '<circle r="7"/>', 1.6, 2.2, .3).replace(`filter="url(#sb${id})"`, `filter="url(#sbs${id})"`)); top(w, f, kd, 1, j, id); return { w, s: spots[j] } });
    return { o, r: svg.querySelector(`#cs${id}_${k} rect`), pcs } });
  svg.appendChild(KS);
  let L = 0, Rb = 0, W = 8, last = -1;
  const measure = () => { if (W && Rb) return; try { const bb = pu.getBBox(); if (bb.width > 4) { L = f === 'morkov' ? 86 : bb.x; Rb = bb.x + bb.width } } catch (e) {}
    if (!Rb) { L = f === 'morkov' ? 86 : 96; Rb = f === 'morkov' || f === 'luk' || f === 'kur' || IS_KUR(f) ? CX : 187 }
    W = clamp((Rb - L) * .74 / N, 5.5, 11) };
  function frame(t, emit) {
    measure(); t %= T; const tc = t - T0, i = Math.floor(tc / STEP), ph = tc - i * STEP, B = CX + W - Rb;
    // подъём (замедляется) — пауза — быстрый удар — отскок; «выше» = ближе к камере: крупнее, тень дальше и мягче
    let up = 0;
    if (tc >= 0 && i < N) { up = ph < .24 ? eOut(ph / .24) : ph < .31 ? 1 : ph < .4 ? 1 - eIn((ph - .31) / .09) : ph < .47 ? .1 * Math.sin((ph - .4) / .07 * Math.PI) : 0;
      if (ph >= .4 && i !== last) { last = i; emit && emit('chop', f) } }
    else if (tc >= N * STEP) up = .6 * Math.sin(clamp((tc - N * STEP) / 1.2) * Math.PI);
    if (t < T0) last = -1;
    const cuts = tc < 0 ? 0 : Math.min(N, i + (ph >= .4 ? 1 : 0)), edge = Rb - cuts * W;   // правый край продукта (в рисунке)
    const push = eIO(clamp((ph - .04) / .24)), fx = B + (tc < 0 || i < 1 ? 0 : i >= N ? N - 1 : i - 1 + push) * W;   // между ударами продукт подвигается под нож
    cpR.setAttribute('width', (edge + 400).toFixed(2)); cfR.setAttribute('x', (edge - 4).toFixed(2)); cfR.setAttribute('width', cuts ? 4 : 0);
    const fin = t < T0 ? eOut(clamp(t / (T0 * .8))) : 1, fout = t > T - .45 ? 1 - eIO(clamp((t - (T - .45)) / .4)) : 1;
    board.setAttribute('transform', `translate(${fx.toFixed(2)} 0)`); board.setAttribute('opacity', (fin * fout).toFixed(2));
    const kx = CX + 17, ky = CY;
    knife.setAttribute('transform', `translate(${kx.toFixed(1)} ${(ky - up * 3).toFixed(1)}) scale(${(1 + up * .07).toFixed(3)}) rotate(${(up * -3).toFixed(1)})`);
    ksh.setAttribute('transform', `translate(${(kx + 3 + up * 9).toFixed(1)} ${(ky + 4 + up * 11).toFixed(1)})`); ksh.setAttribute('opacity', (.32 - up * .14).toFixed(2));
    sl.forEach((s, k) => { const ts = tc - (k * STEP + .4), x0 = Rb - (k + 1) * W;
      s.r.setAttribute('x', x0.toFixed(2)); s.r.setAttribute('width', (W + .4).toFixed(2));
      if (ts < 0) { s.o.setAttribute('opacity', 0); s.pcs.forEach(q => q.w.setAttribute('opacity', 0)); return }
      // ломтик: в момент удара — на месте отреза, затем выходит из-под ножа вправо и опрокидывается в горку
      const at = B + k * W, sx = at + x0 + W / 2, sy = CY, tgt = s.pcs[0].s, mv = eOut(clamp((ts - .03) / .42)), tip = clamp((ts - .3) / .18);
      const x = lerp(sx, tgt.x, mv), y = lerp(sy, tgt.y, mv) - Math.sin(mv * Math.PI) * 4;
      s.o.setAttribute('transform', `translate(${(x - sx).toFixed(2)} ${(y - sy).toFixed(2)}) translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${(mv * R(k, -25, 25)).toFixed(1)}) translate(${(-sx).toFixed(1)} ${(-sy).toFixed(1)}) translate(${at.toFixed(2)} 0)`);
      s.o.setAttribute('opacity', ((1 - tip) * fout).toFixed(2));
      s.pcs.forEach((q, n) => { const qx = lerp(x, q.s.x, eOut(clamp((ts - .3) / .25))), qy = lerp(y, q.s.y, eOut(clamp((ts - .3) / .25)));
        q.w.setAttribute('transform', `translate(${qx.toFixed(1)} ${qy.toFixed(1)}) scale(${lerp(.35, 1, eOut(tip)).toFixed(3)} 1)`); q.w.setAttribute('opacity', (tip * fout).toFixed(2)) }) })
  }
  // замер для проверки (tools): видимая длина продукта и сколько кусочков на доске
  const probe = () => ({ size: +cpR.getAttribute('width') - 400 - L, pieces: sl.filter(q => q.pcs.some(z => +z.w.getAttribute('opacity') > .5)).length })
  return { svg, frame, T, probe, title: 'Нарезать', sub: `${P.n} — ${P.cut === 'coin' ? 'кружками' : P.cut === 'cube' ? 'кубиком' : 'кусочками'}`, sound: 'chop' }
}

/* ---------- 2. Налить воду (сверху): струя бьёт в точку, круги расходятся, гладь растёт к стенкам ---------- */
function pour(liq = 'voda', items = []) {
  const LQ = liq === 'voda' || !F[liq] ? ['#9FDAF7', '#5DB4E6', '#3E93CC'] : [F[liq].l, F[liq].c, F[liq].d];
  const { id, svg } = scene(['towel']);
  defs(svg, metalDefs(id) + `<radialGradient id="wat${id}" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${LQ[0]}"/><stop offset=".7" stop-color="${LQ[1]}"/><stop offset="1" stop-color="${LQ[2]}"/></radialGradient>
   <radialGradient id="jug${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".6" stop-color="#E6F3FA" stop-opacity=".35"/><stop offset="1" stop-color="#BFDCEB" stop-opacity=".55"/></radialGradient>`);
  const pot = potTop(svg, id, 196, 92, 74); fillPieces(pot.inner, id, { cx: pot.cx, cy: pot.cy, r: pot.r * .85 }, items);
  const wat = E('circle', { cx: pot.cx, cy: pot.cy, r: pot.r, fill: `url(#wat${id})`, opacity: 0 }, pot.inner), cres = E('path', { d: `M${pot.cx - pot.r * .78} ${pot.cy - pot.r * .1}A${pot.r * .8} ${pot.r * .8} 0 0 1 ${pot.cx + pot.r * .1} ${pot.cy - pot.r * .78}A${pot.r * .95} ${pot.r * .95} 0 0 0 ${pot.cx - pot.r * .78} ${pot.cy - pot.r * .1}Z`, fill: '#fff', opacity: 0 }, pot.inner), glint = E('ellipse', { rx: 18, ry: 5, fill: '#fff', opacity: .28, transform: `rotate(-30 ${pot.cx - 18} ${pot.cy - 20})` }, pot.inner);
  const rg = rings(pot.inner, 7), splash = E('circle', { r: 5, fill: '#E6F6FF', opacity: 0 }, pot.inner), drops = [...Array(8)].map(() => E('circle', { r: 1.6, fill: '#E6F6FF', opacity: 0 }, pot.inner));
  // кувшин сверху: горловина-капля с носиком, ручка-петля; вода внутри смещается к носику при наклоне; тень отходит
  // кувшин сверху: белая эмаль с изумрудной полосой (как кастрюля), открытое горло с водой, явный носик к кастрюле, ручка-петля сзади
  const JD = 'M-28 -12Q-26 -28 -6 -30Q18 -32 28 -16L50 -4Q54 0 50 4L28 16Q18 32 -6 30Q-26 28 -28 12Z';
  defs(svg, `<clipPath id="jc${id}"><ellipse rx="21" ry="20" cx="-2"/></clipPath>`);
  const jsh = E('g', { filter: `url(#sb${id})` }, svg); E('path', { d: JD, fill: '#000' }, jsh); E('path', { d: 'M-26 -10Q-54 -16 -54 0Q-54 16 -26 10', stroke: '#000', 'stroke-width': 8, fill: 'none' }, jsh);
  const jug = E('g', {}, svg);
  H(jug, `<path d="M-26 -10Q-54 -16 -54 0Q-54 16 -26 10" stroke="url(#emh${id})" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-27 -9Q-50 -13 -50 0" stroke="#34D399" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>
   <path d="${JD}" fill="url(#emw${id})" stroke="#CDD6D1" stroke-width="1"/><path d="M-27 -9Q-25 -25 -6 -27Q16 -29 26 -14" stroke="#10B981" stroke-width="3" fill="none" opacity=".85"/>
   <path d="M30 -9L49 -2Q51 0 49 2L30 9" fill="#F4F7F5" stroke="#B7C2BC" stroke-width="1"/><ellipse rx="22" ry="21" cx="-2" fill="#E9EEEB"/>`);
  const jw = E('g', { 'clip-path': `url(#jc${id})` }, jug), jwat = E('ellipse', { rx: 22, ry: 20, fill: LQ[1], opacity: .9 }, jw); E('ellipse', { rx: 8, ry: 4, cx: -8, cy: -8, fill: '#fff', opacity: .45 }, jw);
  H(jug, `<ellipse rx="22" ry="21" cx="-2" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M-20 -12A20 20 0 0 1 2 -21" stroke="#fff" stroke-width="2.4" fill="none" opacity=".9" stroke-linecap="round"/>`);
  // струя сверху: короткий яркий «столб» у носика (вода уходит от камеры вниз) и пятно удара с брызгами
  const stream = E('path', { fill: '#BFE6FB', opacity: 0 }, svg), core = E('ellipse', { rx: 3, ry: 2, fill: '#fff', opacity: 0 }, svg);
  const T = 5.6, JX = 126, JY = 62, JA = 36, JR = JA * Math.PI / 180;
  function frame(t, emit) {
    t %= T;
    const tilt = t < .6 ? eIO(t / .6) : t < 3.6 ? 1 : 1 - eIO(clamp((t - 3.6) / .5)), flow = t > .5 && t < 3.75, fk = clamp((t - .5) / .15) * (1 - clamp((t - 3.6) / .15));
    // наклон сверху: кувшин чуть сжимается вдоль оси наклона, вода в нём уходит к носику, тень отходит дальше
    jug.setAttribute('transform', offT(t, T, -170, -120) + `translate(${JX} ${JY}) rotate(${JA}) scale(${(1 - tilt * .1).toFixed(3)} 1)`);
    jsh.setAttribute('transform', offT(t, T, -170, -120) + `translate(${(JX + 9 + tilt * 6).toFixed(1)} ${(JY + 12 + tilt * 6).toFixed(1)}) rotate(${JA}) scale(${(1 - tilt * .1).toFixed(3)} 1)`); jsh.setAttribute('opacity', (.24 - tilt * .06).toFixed(2));
    const empty = clamp((t - .6) / 3.1);
    jwat.setAttribute('transform', `translate(${(tilt * 12 + empty * 6).toFixed(1)} 0) scale(${(1 - empty * .5).toFixed(3)} ${(1 - empty * .35).toFixed(3)})`);
    const fill = t < .6 ? 0 : t < 3.7 ? eIO((t - .6) / 3.1) : 1, wout = t > T - .3 ? 1 - eIO((t - (T - .3)) / .3) : 1;   // вода набирается и держится до конца цикла
    wat.setAttribute('opacity', (lerp(.22, .92, fill * wout)).toFixed(2)); cres.setAttribute('opacity', (fill * wout * .38).toFixed(2));
    glint.setAttribute('cx', (pot.cx - 18).toFixed(1)); glint.setAttribute('cy', (pot.cy - 20).toFixed(1)); glint.setAttribute('opacity', (.12 + fill * .2).toFixed(2));
    const sx = JX + Math.cos(JR) * 50 * (1 - tilt * .1), sy = JY + Math.sin(JR) * 50, ex = sx + 13 + wob(t, 2) * .8, ey = sy + 15 + wob(t, 5) * .6;   // струя заметной длины: от носика к воде
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
function brothOf(items) { const it = items.filter(k => F[k]), so = it.filter(solid); let c0 = '#A9DCF5', c1 = '#4E9ED6';
  if (it.includes('svekla')) [c0, c1] = ['#C9465F', '#8E1B36']; else if (it.some(k => /^(tomat|ketchup|pomidor)$/.test(k))) [c0, c1] = ['#E0674A', '#A8321F'];
  else if (it.some(k => /^(moloko|kefir|ryazhenka|smetana|smetana20|yogurt)$/.test(k))) [c0, c1] = ['#FDFBF4', '#E9E1CE']; else { const g = it.find(k => GRAINY.has(KIND[k])); if (g) [c0, c1] = [mixc(F[g].c, '#ffffff', .25), mixc(F[g].c, '#5a3a1a', .2)] }
  return { c0, c1, items: so.map(k => [k, Math.max(3, Math.round(countOf(k) / Math.max(1, so.length * .6))), scaleOf(k)]) } }
function brothTop(pot, id, kind) {
  const B = Array.isArray(kind) ? brothOf(kind) : BROTH[kind] || BROTH.voda; defs(pot.inner.ownerSVGElement, `<radialGradient id="br${id}" cx=".4" cy=".36" r=".72"><stop offset="0" stop-color="${B.c0}"/><stop offset="1" stop-color="${B.c1}"/></radialGradient>`);
  E('circle', { cx: pot.cx, cy: pot.cy, r: pot.r, fill: `url(#br${id})` }, pot.inner);
  const g = E('g', {}, pot.inner), list = []; let s = 0;
  B.items.forEach(([f, n, sc]) => { for (let i = 0; i < n; i++, s++) { const a = R(s, 0, 6.283), r = Math.sqrt(R(s + 40, .01, .96)) * pot.r * .94, w = E('g', {}, g); top(w, f, f === 'morkov' ? 'stick' : f === 'egg' ? 'eggW' : KIND[f], sc, s, id); list.push({ w, x: pot.cx + Math.cos(a) * r, y: pot.cy + Math.sin(a) * r, s }) } });
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
    sp.setAttribute('transform', offT(t, T, 150, -110) + `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) rotate(${(-8 - tilt * 10 + wob(t * 2, 2)).toFixed(1)}) scale(1 ${(1 - tilt * .3).toFixed(3)})`);
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
  const list = []; items = items.filter(solid); if (!items.length) return list; if (items.every(k => GRAINY.has(KIND[k]))) n = 90;
  for (let i = 0; i < n; i++) { const f = items[i % items.length], a = R(i + 3, 0, 6.283), r = Math.sqrt(R(i + 17, .02, .9)) * c.r, w = E('g', {}, svg), shd = E('g', { filter: `url(#sbs${id})`, opacity: .45 }, w), body = E('g', {}, w);
    const k = KIND[f], sm = GRAINY.has(k); H(shd, sm ? '' : k === 'coin' ? '<circle r="7.6" fill="#000"/>' : k === 'cube' ? '<rect x="-4.4" y="-4.4" width="8.8" height="8.8" rx="2" fill="#000"/>' : '<circle r="8" fill="#000"/>');
    top(body, f, k, sm ? .95 : f === 'kur' || IS_KUR(f) ? 1.25 : 1.05, i, id); list.push({ w, shd, body, x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r, a, r, s: i }) }
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
      const q = P.length ? P[i % P.length] : { x: pan.cx + R(i, -30, 30), y: pan.cy + R(i + 2, -30, 30) }, a = R(i + 4, 0, 6.283), d = 4 + k * R(i + 5, 18, 34); e.setAttribute('cx', (q.x + Math.cos(a) * d).toFixed(1)); e.setAttribute('cy', (q.y + Math.sin(a) * d).toFixed(1)); e.setAttribute('r', (R(i, 1, 1.9) * (1 + Math.sin(k * Math.PI) * .5)).toFixed(2)); e.setAttribute('opacity', ((1 - k) * .9).toFixed(2)) });
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
function stir(items = ['luk', 'morkov'], vessel = 'pan') {
  const { id, svg } = scene(['salt']);
  defs(svg, metalDefs(id));
  const pan = vessel === 'bowl' ? Object.assign(bowlTop(svg, id, 160, 88, 76), { shine() {} }) : panTop(svg, id, 150, 88, 76), P = piecesIn(svg, id, pan, items, 18), st = steamUp(svg, id, 4, pan.cx, pan.cy - 6, 36);
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
// инструмент в руке за кадром: входит из-за края в начале цикла и уходит туда же в конце (не висит и не появляется из воздуха)
const away = (t, T, a = .45) => (1 - eOut(clamp(t / a))) + eIn(clamp((t - (T - a)) / a));
const offT = (t, T, dx, dy, a) => { const k = away(t, T, a); return `translate(${(dx * k).toFixed(1)} ${(dy * k).toFixed(1)}) ` };
function hit(ph, per = .55) { const p = ph % per; return p < .24 ? eOut(p / .24) : p < .31 ? 1 : p < .4 ? 1 - eIn((p - .31) / .09) : p < .47 ? .1 * Math.sin((p - .4) / .07 * Math.PI) : 0 }
const sc0 = (id, svg, frame, T, title, sub, sound) => ({ svg, frame, T, title, sub, sound });

/* натереть на тёрке: продукт ходит вверх-вниз по тёрке и с каждым проходом становится короче (нижний край — свежий срез),
   стружка выходит из-под тёрки и копится горкой; когда остаётся огрызок — он уходит, появляется целый продукт */
function grate(f = 'morkov') {
  const { id, svg } = scene(), P = F[f]; defs(svg, metalDefs(id) + `<linearGradient id="gp${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.l}"/><stop offset=".55" stop-color="${P.c}"/><stop offset="1" stop-color="${P.d}"/></linearGradient>`); boardTop(svg, id); decor(svg, id, ['dill']);
  const SK = f === 'morkov' ? null : P.s && P.s !== P.c ? P.s : null; // у продуктов с кожурой (свёкла, кабачок) бока — кожура, срез — мякоть
  // горка стружки под тёркой: основание растёт, стружки крупные и ложатся от центра к краям — видно, сколько натёрто
  const pile = E('g', {}, svg), mound = E('ellipse', { cx: 178, cy: 136, rx: 2, ry: 1, fill: P.d, opacity: 0 }, pile), N = 64, sh = [...Array(N)].map((_, i) => { const w = E('g', { opacity: 0 }, pile); H(w, `<path d="M-7 0Q0 -3 7 0" stroke="${i % 3 ? P.c : P.d}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M-4.5 -.8Q0 -2.2 4.5 -.8" stroke="${P.l}" stroke-width="1" fill="none"/>`);
    const q = i / N, a = R(i, 0, 6.283), r = Math.sqrt(q) * R(i + 3, .55, 1); return { w, x: 178 + Math.cos(a) * r * 34, y: 136 + Math.sin(a) * r * 11 - (1 - q) * 3, r: R(i, 0, 180) } });
  H(svg, shade(id, '<rect x="150" y="30" width="56" height="96" rx="8"/>', 5, 7, .3) + `<rect x="150" y="30" width="56" height="96" rx="8" fill="url(#rim${id})"/><rect x="156" y="36" width="44" height="84" rx="5" fill="#B9C1C8"/>
   ${[...Array(9)].map((_, r) => [...Array(5)].map((_, c) => `<path d="M${161 + c * 8 + (r % 2) * 4} ${42 + r * 8.6}q3 -2 6 0" stroke="#5E666E" stroke-width="1.6" fill="none"/>`).join('')).join('')}<path d="M152 36V120" stroke="#fff" stroke-width="1.6" opacity=".6"/><rect x="160" y="18" width="36" height="12" rx="6" fill="url(#khd${id})"/>`);
  const pr = E('g', { 'data-probe': 'prod' }, svg), L0 = 46, L1 = 16, top0 = -24;
  const shd = E('rect', { x: -10, y: top0, width: 20, height: L0, rx: 9, fill: '#000', opacity: .3, filter: `url(#sb${id})`, transform: 'translate(5 7)' }, pr);
  const body = E('rect', { x: -10, y: top0, width: 20, height: L0, rx: 9, fill: SK ? SK : `url(#gp${id})` }, pr);
  H(pr, `<path d="M-5 -18V-2" stroke="#fff" stroke-width="2" opacity=".45" stroke-linecap="round"/><path d="M-9 -14q9 2 18 0" stroke="${P.d}" stroke-width=".7" fill="none" opacity=".4"/>`);
  const face = E('ellipse', { cx: 0, rx: 9.6, ry: 3.2, fill: P.core || mixc(P.l, '#ffffff', .2), stroke: P.c, 'stroke-width': 1 }, pr);   // свежий срез — мякоть
  const fly = [...Array(10)].map(() => E('path', { d: 'M-4 0Q0 -2 4 0', stroke: P.c, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round', opacity: 0 }, svg));
  const T = 4.4, GR = T * .84;
  function frame(t, emit) { t %= T; const k = (t % .62) / .62, used = eIO(clamp(t / GR)), L = lerp(L0, L1, used), osc = Math.sin(k * 2 * Math.PI) * 22, tilt = Math.cos(k * 2 * Math.PI) * 8;
    const y = 74 + osc + (L0 - L) * .6, rub = t < GR;   // рука держит за верх: с укорачиванием продукт опускается, низ трётся о тёрку
    const fin = eOut(clamp(t / .35)), fout = t > GR + .25 ? 1 - eIO(clamp((t - GR - .25) / .4)) : 1;
    body.setAttribute('height', L.toFixed(1)); shd.setAttribute('height', L.toFixed(1)); face.setAttribute('cy', (top0 + L - 3).toFixed(1)); face.setAttribute('opacity', clamp(t / .5).toFixed(2));
    pr.setAttribute('transform', `translate(178 ${(rub ? y : y - eIO(clamp((t - GR) / .5)) * 30).toFixed(1)}) rotate(${(rub ? tilt : 0).toFixed(1)})`); pr.setAttribute('opacity', (fin * fout).toFixed(2));
    if (rub && Math.floor(t / .31) !== frame._g) { frame._g = Math.floor(t / .31); emit && emit('grate') }
    fly.forEach((e, i) => { const q = ((t * 2.2 + i / fly.length) % 1); e.setAttribute('transform', `translate(${(178 + R(i, -14, 14) * q).toFixed(1)} ${(122 + q * 12).toFixed(1)}) rotate(${(i * 40 + q * 200).toFixed(0)})`); e.setAttribute('opacity', (rub && t > .2 ? Math.sin(q * Math.PI) * .9 : 0).toFixed(2)) });
    const n = Math.floor(used * N); mound.setAttribute('rx', (2 + used * 34).toFixed(1)); mound.setAttribute('ry', (1 + used * 11).toFixed(1)); mound.setAttribute('opacity', (used * .45 * fout).toFixed(2)); sh.forEach((s, i) => { s.w.setAttribute('opacity', i < n ? fout.toFixed(2) : 0); s.w.setAttribute('transform', `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.r.toFixed(0)})`) }) }
  return Object.assign(sc0(id, svg, frame, T, 'Натереть', `${P.n} — на тёрке`, 'grate'), { probe: () => ({ size: +body.getAttribute('height'), pieces: sh.filter(q => +q.w.getAttribute('opacity') > .5).length }) }) }

/* промыть: в миске вода кружит крупу, сверху льётся вода, круги */
function rinse(f) {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['towel']); const kd = f ? KIND[f] : null, many = f && GRAINY.has(kd);
  const b = bowlTop(svg, id, 186, 92, 72); E('circle', { cx: b.cx, cy: b.cy, r: b.r, fill: '#9FD6F2', opacity: .55 }, b.inner);
  const g = E('g', {}, b.inner), N = !f ? 0 : many ? 110 : Math.min(14, countOf(f)), list = [...Array(N)].map((_, i) => { const w = E('g', {}, g); top(w, f, kd, many ? .9 : scaleOf(f), i, id); return { w, a: R(i, 0, 6.283), r: Math.sqrt(R(i + 4, .02, .95)) * b.r * (many ? .9 : .7) } });
  const murk = E('circle', { cx: b.cx, cy: b.cy, r: b.r, fill: many ? '#E8DCC2' : '#CFE3D4', opacity: .5 }, b.inner);
  const rg = rings(b.inner, 6), col = E('circle', { r: 4, fill: '#E6F6FF', opacity: .9 }, b.inner);
  const T = 4;
  function frame(t, emit) { t %= T; list.forEach(q => { const a = q.a + t * (2 * Math.PI / T) * (1.2 - q.r / b.r); q.w.setAttribute('transform', `translate(${(b.cx + Math.cos(a) * q.r).toFixed(1)} ${(b.cy + Math.sin(a) * q.r).toFixed(1)})`) });
    murk.setAttribute('opacity', (.5 * (1 - eIO(clamp(t / (T * .85))))).toFixed(2));
    const ix = b.cx - 18 + wob(t, 2), iy = b.cy - 16; col.setAttribute('cx', ix); col.setAttribute('cy', iy); col.setAttribute('r', (4 + wob(t * 3, 1)).toFixed(1));
    if (Math.floor(t / .3) !== frame._r) { frame._r = Math.floor(t / .3); rg.at(ix, iy, t, 1.2) } rg.frame(t); emit && emit('pour', .5) }
  return sc0(id, svg, frame, T, 'Промыть', f ? `${nameOf(f)} — до прозрачной воды` : 'под водой', 'pour') }

/* очистить: овальная картофелина с коричневой кожурой и глазками; овощечистка идёт вдоль, под ней — светлая влажная полоса;
   длинная лента кожуры закручивается спиралью и падает к очисткам */
function peel(f = 'kartofel') {
  const { id, svg } = scene(), P = F[f], SK = P.s || P.c, LONG = ['long', 'carrot', 'banana', 'pods'].includes((CAT[f] || [])[1]), SX = LONG ? 1.3 : 1, SY = LONG ? .62 : 1; defs(svg, metalDefs(id) + `<radialGradient id="skn${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${mixc(SK, '#ffffff', .3)}"/><stop offset=".6" stop-color="${SK}"/><stop offset="1" stop-color="${shade2(SK)}"/></radialGradient>
   <linearGradient id="flesh${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mixc(P.l, '#ffffff', .3)}"/><stop offset=".5" stop-color="${P.l}"/><stop offset="1" stop-color="${P.c}"/></linearGradient><clipPath id="pk${id}"><ellipse cx="0" cy="0" rx="46" ry="30"/></clipPath>`);
  boardTop(svg, id); decor(svg, id, ['salt']);
  const CX = 140, CY = 88, pot = E('g', { transform: `translate(${CX} ${CY}) rotate(-8) scale(${SX} ${SY})` }, svg);
  H(pot, shade(id, '<ellipse rx="46" ry="30"/>', 5, 7, .32) + `<ellipse rx="46" ry="30" fill="url(#skn${id})"/>${f === 'kartofel' ? [[-22, -8], [6, -16], [24, 6], [-8, 14], [30, -12]].map(([x, y]) => `<path d="M${x - 2.4} ${y}q2.4 -2 4.8 0" stroke="#5E3A18" stroke-width="1.2" fill="none"/><circle cx="${x}" cy="${y + .8}" r=".9" fill="#5E3A18"/>`).join('') : ''}
   <ellipse cx="-14" cy="-14" rx="14" ry="5" fill="#fff" opacity=".22"/>`);
  const bandsG = E('g', { 'clip-path': `url(#pk${id})` }, pot), NB = 4, bands = [...Array(NB)].map((_, i) => { const y = -22 + i * 14.5, g = E('g', {}, bandsG); E('rect', { x: -48, y: y - 7, width: 96, height: 14, rx: 6, fill: `url(#flesh${id})` }, g); E('path', { d: `M-40 ${y - 3}H40`, stroke: '#fff', 'stroke-width': 1.4, opacity: .6, 'stroke-linecap': 'round' }, g); return { g, y } });
  const peeler = E('g', {}, svg); H(peeler, shade(id, '<rect x="-6" y="-6" width="12" height="52" rx="5"/>', 4, 6, .3) + `<rect x="-11" y="-10" width="22" height="12" rx="4" fill="url(#rim${id})"/><path d="M-8 -4H8" stroke="#5E666E" stroke-width="1.3"/><rect x="-6" y="2" width="12" height="46" rx="5" fill="url(#emh${id})"/><path d="M-3 8V42" stroke="#fff" stroke-width="1" opacity=".4"/>`);
  // кожура снимается с продукта: за овощечисткой тянется лента кожуры (снаружи кожура, по краю видна светлая изнанка), чуть приподнятая над мякотью;
  // в конце прохода лента отрывается, сминается и ложится в очистки. Когда очищено всё — продукт уходит, появляется новый, в кожуре.
  const a8 = -8 * Math.PI / 180, toS = (lx, ly) => [CX + Math.cos(a8) * lx * SX - Math.sin(a8) * ly * SY, CY + Math.sin(a8) * lx * SX + Math.cos(a8) * ly * SY];
  const ribG = E('g', {}, svg), ribO = E('path', { stroke: shade2(SK), 'stroke-width': 13 * SY + 1.6, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ribG),
    ribS = E('path', { stroke: `url(#skn${id})`, 'stroke-width': 13 * SY, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ribG),
    ribI = E('path', { stroke: P.l, 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round', opacity: .95 }, ribG);
  const wav = n => { let d = ''; for (let j = 0; j <= n; j++) { const x = -20 + j * 40 / n, y = Math.sin(j * 1.7) * 3.4; d += (j ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) } return d };
  const pileP = [...Array(NB)].map((_, i) => { const w = E('g', { opacity: 0 }, svg); H(w, `<path d="${wav(10)}" stroke="${shade2(SK)}" stroke-width="${(10 * SY + 2).toFixed(1)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${wav(10)}" stroke="${SK}" stroke-width="${(10 * SY).toFixed(1)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${wav(10)}" stroke="${P.l}" stroke-width="2" fill="none" transform="translate(0 ${(3.4 * SY).toFixed(1)})" opacity=".9"/>`);
    return { w, x: 252 + (i % 2) * 18 + R(i, -4, 4), y: 66 + i * 17 + R(i + 2, -3, 3), r: R(i, -25, 25) } });
  svg.appendChild(peeler);
  const T = 5.2, T0 = .4, PASS = (T - T0) * .86 / NB;
  function frame(t, emit) { t %= T; const tp = t - T0, pi = clamp(Math.floor(tp / PASS), 0, NB - 1), pk = tp < 0 ? 0 : clamp((tp - pi * PASS) / (PASS * .78)), drop = tp < 0 ? 0 : clamp((tp - pi * PASS - PASS * .78) / (PASS * .22));
    const fin = eOut(clamp(t / T0)), fout = t > T - .4 ? 1 - eIO(clamp((t - (T - .4)) / .4)) : 1, end = tp > NB * PASS;
    pot.setAttribute('opacity', (fin * fout).toFixed(2));
    const by = bands[pi].y, hw = 46 * Math.sqrt(Math.max(.2, 1 - (by / 31) ** 2)) - 2, lx = -hw + eIO(pk) * 2 * hw, [px, py] = toS(end ? hw + 12 : lx, by);
    bands.forEach((b, i) => { const s = tp < 0 ? 0 : i < pi || end ? 1 : i === pi ? clamp((lx + 48) / 96) * (pk > 0) : 0; b.g.setAttribute('transform', `translate(-48 0) scale(${s.toFixed(3)} 1) translate(48 0)`) });
    peeler.setAttribute('transform', `translate(${px.toFixed(1)} ${(py - 4).toFixed(1)}) rotate(-80)`); peeler.setAttribute('opacity', (fin * fout).toFixed(2));
    if (tp >= 0 && pk > .02 && pk < .2 && frame._p !== pi) { frame._p = pi; emit && emit('peel') } if (tp < 0) frame._p = -1;
    // лента: от начала полосы до овощечистки, приподнята (сдвиг вверх растёт к началу — там она уже закручивается)
    if (tp >= 0 && !end && pk > .01) { let d = ''; const n = 12, x1 = lx; for (let j = 0; j <= n; j++) { const lxj = lerp(-hw, x1, j / n), lift = (1 - j / n) * (2 + pk * 5), [sx, sy] = toS(lxj, by - lift + Math.sin(j * 1.3 + pi) * 1.2); d += (j ? 'L' : 'M') + sx.toFixed(1) + ' ' + sy.toFixed(1) }
      [ribO, ribS].forEach(e => e.setAttribute('d', d)); ribI.setAttribute('d', d); ribI.setAttribute('transform', `translate(0 ${(4.2 * SY).toFixed(1)})`);
      const pp = pileP[pi], [cx0, cy0] = toS(0, by), g = eIO(drop), sc = 1 - g * .55;
      ribG.setAttribute('transform', `translate(${lerp(0, pp.x - cx0, g).toFixed(1)} ${(lerp(0, pp.y - cy0, g) - Math.sin(g * Math.PI) * 8).toFixed(1)}) translate(${cx0.toFixed(1)} ${cy0.toFixed(1)}) scale(${sc.toFixed(3)}) rotate(${(g * pp.r).toFixed(1)}) translate(${(-cx0).toFixed(1)} ${(-cy0).toFixed(1)})`);
      ribG.setAttribute('opacity', (1 - clamp((drop - .6) / .4)).toFixed(2)) } else ribG.setAttribute('opacity', 0);
    pileP.forEach((p, i) => { p.w.setAttribute('opacity', (tp < 0 ? 0 : (i < pi || end ? 1 : i === pi ? clamp((drop - .55) / .45) : 0) * fout).toFixed(2)); p.w.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(0)})`) }) }
  return Object.assign(sc0(id, svg, frame, T, 'Очистить', `${P.n} — овощечисткой`, 'peel'), { probe: () => ({ size: NB - bands.reduce((a, b) => a + (+(b.g.getAttribute('transform') || '').match(/scale\(([\d.]+)/)?.[1] || 0), 0), pieces: pileP.filter(q => +q.w.getAttribute('opacity') > .5).length + (+ribG.getAttribute('opacity') > .3 ? 1 : 0) }) }) }

/* отбить: молоток вверх-вниз (тень), кусок мяса с каждым ударом шире */
const MEAT = (f, id) => (!f || f === 'kur' || IS_KUR(f)) ? `url(#chk${id})` : F[f] ? F[f].c : '#E7A59A';
function pound(f = 'kur') {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); boardTop(svg, id); decor(svg, id, ['pepper']);
  const meat = E('g', {}, svg); H(meat, shade(id, '<path d="M-46 0Q-44 -26 0 -28Q46 -26 46 0Q44 26 0 28Q-44 26 -46 0Z"/>', 4, 6, .3) + `<path d="M-46 0Q-44 -26 0 -28Q46 -26 46 0Q44 26 0 28Q-44 26 -46 0Z" fill="${MEAT(f, id)}"/><path d="M-30 -12Q0 -24 30 -12" stroke="#fff" stroke-width="2.4" fill="none" opacity=".5" stroke-linecap="round"/>`);
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
  function frame(t, emit) { t %= T; const tw = Math.sin(t * 9) * 25 * (t < 2.6 ? 1 : 0); mill.setAttribute('transform', offT(t, T, -60, -130) + 'translate(132 60)'); cap.setAttribute('transform', `rotate(${tw.toFixed(1)})`);
    if (t < 2.6 && Math.floor(t / .25) !== frame._m) { frame._m = Math.floor(t / .25); emit && emit('grind') }
    specks.forEach(s => s.e.setAttribute('cx', s.x.toFixed(1)) || s.e.setAttribute('cy', s.y.toFixed(1)) || s.e.setAttribute('opacity', t > s.st ? (t > T - .4 ? (T - t) / .4 : 1).toFixed(2) : 0)); fl(t) }
  return sc0(id, svg, frame, T, 'Поперчить', 'щепоть молотого перца', 'grind') }

/* налить масло: бутылка над сковородой, золотое пятно растекается и бликует */
function oil() {
  const { id, svg } = scene(); defs(svg, metalDefs(id) + `<radialGradient id="ol${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#FFFBEA" stop-opacity=".42"/><stop offset=".45" stop-color="#FFE9A6" stop-opacity=".16"/><stop offset=".9" stop-color="#FFDE80" stop-opacity=".1"/><stop offset="1" stop-color="#FFF3C8" stop-opacity=".85"/></radialGradient>`); decor(svg, id, ['dill']);
  const pan = panTop(svg, id, 150, 88, 76), pool = E('ellipse', { cx: pan.cx - 6, cy: pan.cy - 4, rx: 4, ry: 3, fill: `url(#ol${id})`, stroke: '#FFE9A8', 'stroke-width': 1.2, 'stroke-opacity': .7 }, svg), gl = E('ellipse', { rx: 6, ry: 2, fill: '#fff', opacity: 0 }, svg), gl2 = E('ellipse', { rx: 3, ry: 1.2, fill: '#fff', opacity: 0 }, svg); const arc = E('path', { stroke: '#fff', 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round', opacity: 0 }, svg);   // масло — тонкая прозрачная плёнка с бликами, а не мутное пятно
  const bt = E('g', {}, svg); H(bt, shade(id, '<circle r="18"/><rect x="10" y="-6" width="24" height="12" rx="5"/>', 10, 14, .22) + `<circle r="18" fill="#F4B92E" opacity=".9"/><circle r="12" fill="#FFE08A" opacity=".8"/><rect x="12" y="-6" width="20" height="12" rx="5" fill="#2F7D57"/><path d="M-10 -10A14 14 0 0 1 4 -16" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>`);
  const drip = E('ellipse', { rx: 3, ry: 2.2, fill: '#FFD26A', opacity: 0 }, svg);
  const T = 3.6;
  function frame(t, emit) { t %= T; const k = t < .4 ? 0 : t < 2.6 ? eOut((t - .4) / 2.2) : 1, fade = t > T - .3 ? 1 - eIO((t - (T - .3)) / .3) : 1;
    bt.setAttribute('transform', offT(t, T, -150, -110) + `translate(${(108 + (t > .2 && t < 2.8 ? 4 : 0)).toFixed(0)} 54) rotate(40)`);
    pool.setAttribute('rx', (4 + k * 46).toFixed(1)); pool.setAttribute('ry', (3 + k * 34).toFixed(1)); pool.setAttribute('opacity', (clamp((t - .4) / .12) * fade).toFixed(2));   // масло появляется, только когда потекло из бутылки
    gl.setAttribute('cx', (pan.cx - 20 - k * 10).toFixed(1)); gl.setAttribute('cy', (pan.cy - 14 - k * 6).toFixed(1)); gl.setAttribute('rx', (4 + k * 14).toFixed(1)); gl.setAttribute('opacity', (k * .75 * fade).toFixed(2)); { const rx = 4 + k * 46, ry = 3 + k * 34, cx = pan.cx - 6, cy = pan.cy - 4; arc.setAttribute('d', `M${(cx - rx * .8).toFixed(1)} ${(cy - ry * .25).toFixed(1)}A${(rx * .85).toFixed(1)} ${(ry * .85).toFixed(1)} 0 0 1 ${(cx - rx * .1).toFixed(1)} ${(cy - ry * .82).toFixed(1)}`); arc.setAttribute('opacity', (k * .6 * fade).toFixed(2)) } gl2.setAttribute('cx', (pan.cx + 14 + k * 8).toFixed(1)); gl2.setAttribute('cy', (pan.cy + 12 + k * 6).toFixed(1)); gl2.setAttribute('rx', (2 + k * 6).toFixed(1)); gl2.setAttribute('opacity', (k * .45 * fade * (.8 + Math.sin(t * 3) * .2)).toFixed(2));
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
function whisk(items = []) { const W0 = items.find(k => F[k] && k !== 'sol') || 'egg', WC = W0 === 'egg' ? '#F7C948' : F[W0].c;
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['salt']);
  const b = bowlTop(svg, id, 176, 92, 72); E('circle', { cx: b.cx, cy: b.cy, r: b.r, fill: WC }, b.inner);
  const foam = [...Array(40)].map((_, i) => ({ e: E('circle', { r: R(i, 1, 3), fill: '#FFF6D6', opacity: 0 }, b.inner), a: R(i, 0, 6.283), r: Math.sqrt(R(i + 4, .05, .9)) * b.r }));
  const wsh = E('g', { filter: `url(#sb${id})`, opacity: .25 }, svg); E('ellipse', { rx: 22, ry: 14, fill: '#000' }, wsh);
  const wh = E('g', {}, svg); H(wh, `${[0, 1, 2, 3].map(i => `<ellipse rx="${22 - i * 2}" ry="${14 - i * 3}" fill="none" stroke="#C3CAD1" stroke-width="1.4" transform="rotate(${i * 45})"/>`).join('')}<rect x="-4" y="12" width="8" height="64" rx="4" fill="url(#emh${id})"/><circle r="3" fill="#8E979F"/>`);
  const T = 2.4, W = 2 * Math.PI / .6;
  function frame(t, emit) { t %= T; const a = t * W, x = b.cx + Math.cos(a) * 22, y = b.cy + Math.sin(a) * 16; wh.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(-30 + Math.sin(a) * 10).toFixed(1)})`); wsh.setAttribute('transform', `translate(${(x + 6).toFixed(1)} ${(y + 8).toFixed(1)})`);
    const k = clamp(t / (T * .8)); foam.forEach((f, i) => { const aa = f.a + t * 3; f.e.setAttribute('cx', (b.cx + Math.cos(aa) * f.r).toFixed(1)); f.e.setAttribute('cy', (b.cy + Math.sin(aa) * f.r).toFixed(1)); f.e.setAttribute('opacity', (i / foam.length < k ? .85 : 0) * (t > T - .3 ? (T - t) / .3 : 1)) });
    if (Math.floor(t / .3) !== frame._w) { frame._w = Math.floor(t / .3); emit && emit('whisk') } }
  return sc0(id, svg, frame, T, 'Взбить', 'яйца венчиком до пены', 'whisk') }

/* сформовать котлеты: шарик фарша приплющивается в котлету, ряд растёт */
function form(f = 'kur', balls = false) { if (!f) f = 'kur';
  // слева горка фарша: каждая котлета/шарик берётся из неё (горка убывает), формуется по дороге и ложится в ряд; в конце всё уходит, появляется новая горка
  const { id, svg } = scene(); defs(svg, metalDefs(id)); boardTop(svg, id); decor(svg, id, ['dill']);
  const specks = (n, sx, sy, s0) => [...Array(n)].map((_, j) => `<circle cx="${R(s0 + j, -sx, sx).toFixed(1)}" cy="${R(s0 + j + 3, -sy, sy).toFixed(1)}" r="1" fill="#C98A45" opacity=".6"/>`).join('');
  const heap = E('g', {}, svg); H(heap, shade(id, '<path d="M-26 6Q-28 -14 -8 -20Q10 -26 24 -12Q32 4 18 16Q0 26 -16 18Q-26 14 -26 6Z"/>', 3, 5, .3) + `<path d="M-26 6Q-28 -14 -8 -20Q10 -26 24 -12Q32 4 18 16Q0 26 -16 18Q-26 14 -26 6Z" fill="${MEAT(f, id)}"/>${specks(22, 20, 15, 77)}<ellipse cx="-6" cy="-10" rx="9" ry="4" fill="#fff" opacity=".3"/>`);
  const pat = [...Array(5)].map((_, i) => { const w = E('g', { opacity: 0 }, svg); const rx = balls ? 11 : 17, ry = balls ? 11 : 14; H(w, shade(id, `<ellipse rx="${rx}" ry="${ry}"/>`, 3, 4, .3) + `<ellipse rx="${rx}" ry="${ry}" fill="${MEAT(f, id)}"/>${specks(8, 12, 9, i * 9)}<ellipse cx="-5" cy="-5" rx="6" ry="3" fill="#fff" opacity=".35"/>`); return { w, x: 124 + i * 36, y: 88 + (i % 2) * 8 } });
  const HX = 74, HY = 90, T = 5.4, per = (T - .7) / 5;
  function frame(t, emit) { t %= T; const fin = eOut(clamp(t / .3)), fout = t > T - .35 ? 1 - eIO((t - (T - .35)) / .35) : 1, taken = clamp((t - .3) / (per * 5));
    heap.setAttribute('transform', `translate(${HX} ${HY}) scale(${lerp(1, .18, taken).toFixed(3)})`); heap.setAttribute('opacity', (fin * (taken > .98 ? 0 : 1) * fout).toFixed(2));
    pat.forEach((p, i) => { const k = (t - .3 - i * per) / per; if (k < 0) { p.w.setAttribute('opacity', 0); return }
      const mv = eIO(clamp(k / .7)), sq = eOut(clamp((k - .55) / .35)), x = lerp(HX + 8, p.x, mv), y = lerp(HY - 4, p.y, mv) - Math.sin(mv * Math.PI) * 6, sc = lerp(.45, 1, mv);
      p.w.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(sc * lerp(.92, 1, sq)).toFixed(3)} ${(sc * lerp(1.08, 1, sq)).toFixed(3)})`); p.w.setAttribute('opacity', fout.toFixed(2));
      if (k > .6 && k < .75 && p._e !== Math.floor(t / T)) { p._e = Math.floor(t / T); emit && emit('pat') } }) }
  return sc0(id, svg, frame, T, 'Сформовать', balls ? 'шарики мокрыми руками' : 'котлеты мокрыми руками', 'pat') }

/* раскатать: скалка ходит вверх-вниз, пласт теста растёт, мука пылит */
function roll() {
  const { id, svg } = scene(); defs(svg, metalDefs(id)); boardTop(svg, id);
  H(svg, [...Array(50)].map((_, i) => `<circle cx="${R(i, 60, 290).toFixed(0)}" cy="${R(i + 3, 36, 146).toFixed(0)}" r="${R(i + 5, .6, 1.6).toFixed(1)}" fill="#fff" opacity=".55"/>`).join(''));
  const dough = E('ellipse', { cx: 170, cy: 90, rx: 30, ry: 26, fill: '#F6E3B8', stroke: '#E3C98E', 'stroke-width': 1 }, svg), dHi = E('ellipse', { cx: 160, cy: 82, rx: 14, ry: 6, fill: '#fff', opacity: .4 }, svg);
  const pin = E('g', {}, svg); H(pin, shade(id, '<rect x="-80" y="-9" width="160" height="18" rx="9"/>', 5, 7, .3) + `<rect x="-62" y="-10" width="124" height="20" rx="10" fill="url(#spat${id})"/><rect x="-90" y="-5" width="30" height="10" rx="5" fill="#C98F55"/><rect x="60" y="-5" width="30" height="10" rx="5" fill="#C98F55"/><path d="M-58 -5H58" stroke="#fff" stroke-width="1.4" opacity=".5"/>`);
  const T = 3.6;
  function frame(t, emit) { t %= T; const k = clamp(t / (T * .85)), g = (t > T - .4 ? 1 - eIO((t - (T - .4)) / .4) : 1) * eOut(clamp(t / .3)); dough.setAttribute('rx', (30 + k * 52).toFixed(1)); dough.setAttribute('ry', (26 + k * 30).toFixed(1)); dough.setAttribute('opacity', g.toFixed(2)); dHi.setAttribute('opacity', (.4 * g).toFixed(2));
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
  function frame(t, emit) { t %= T; const k = t < .3 ? 0 : t < 2 ? eOut((t - .3) / 1.7) : 1, f = 1, br = clamp((t - 2.2) / 1.2), out = eIn(clamp((t - 3.55) / .45)); bt.setAttribute('r', (4 + k * 54).toFixed(1)); bt.setAttribute('opacity', clamp((t - .3) / .1).toFixed(2)); bt.setAttribute('fill', mixc('#F7DFA0', '#F2C66B', br)); bt.setAttribute('stroke', '#D99A3E'); bt.setAttribute('stroke-width', (br * 3.2).toFixed(2)); bt.setAttribute('stroke-opacity', (br * .8).toFixed(2));
    [bt, bh, ...pores].forEach(e => e.setAttribute('transform', `translate(${(out * 200).toFixed(1)} ${(-out * 30).toFixed(1)})`));   // готовый блин золотистый с румяным краем, в конце уезжает на тарелку за кадр bh.setAttribute('r', (3 + k * 14).toFixed(1)); bh.setAttribute('opacity', (.3 * f * clamp((t - .3) / .1)).toFixed(2));
    ld.setAttribute('transform', `translate(${(pan.cx - 4 + (t < 2 ? Math.sin(t * 3) * 6 : 30)).toFixed(1)} ${(pan.cy - 6 - (t < 2 ? 0 : 40)).toFixed(1)}) scale(${(t < 2 ? 1 : .9).toFixed(2)})`); ld.setAttribute('transform', `translate(${(eIn(clamp((t - 2) / .5)) * 170 + (1 - eOut(clamp(t / .3))) * 170).toFixed(1)} ${(-eIn(clamp((t - 2) / .5)) * 150 - (1 - eOut(clamp(t / .3))) * 150).toFixed(1)}) ` + ld.getAttribute('transform')); ld.setAttribute('opacity', 1);   // половник приходит из-за кадра и уходит туда же
    pores.forEach((p, i) => p.setAttribute('opacity', t > 2.2 + i * .04 ? (.7 * f).toFixed(2) : 0)); emit && emit(t < 2 ? 'pourThick' : 'sizzle') }
  return sc0(id, svg, frame, T, 'Налить тесто', 'половник на сковороду, тонким слоем', 'sizzle') }

/* выложить на тарелку: порция ложится и оседает, сверху — веточка зелени */
function plateUp(items = ['grechka', 'kur']) {
  items = items.filter(solid); if (!items.length) return show([]);
  const { id, svg } = scene(); defs(svg, metalDefs(id)); decor(svg, id, ['towel', 'dill']);
  H(svg, shade(id, '<circle cx="176" cy="90" r="74"/>', 6, 8, .3) + `<circle cx="176" cy="90" r="74" fill="url(#emw${id})"/><circle cx="176" cy="90" r="54" fill="#FFFFFF"/><circle cx="176" cy="90" r="54" fill="none" stroke="#E5EAE7" stroke-width="1.2"/><circle cx="176" cy="90" r="70" fill="none" stroke="#10B981" stroke-width="1.6" opacity=".7"/>`);
  const por = E('g', {}, svg); const c = { cx: 176, cy: 90, r: 36 }; [...Array(Math.min(70, countOf(items[0]) * 2))].forEach((_, i) => { const a = R(i, 0, 6.283), r = Math.sqrt(R(i + 3, 0, 1)) * 30, w = E('g', {}, por); top(w, items[0], KIND[items[0]], GRAINY.has(KIND[items[0]]) ? .9 : 1.1, i, id); w.setAttribute('transform', `translate(${(164 + Math.cos(a) * r).toFixed(1)} ${(92 + Math.sin(a) * r * .8).toFixed(1)})`) });
  const side = E('g', {}, svg); (items[1] ? [0, 1, 2, 3] : []).forEach(i => { const w = E('g', {}, side); top(w, items[1], KIND[items[1]], 1.2, i, id); w.setAttribute('transform', `translate(${198 + (i % 2) * 14} ${76 + i * 10})`) });
  // порцию приносит ложка из-за кадра справа сверху: еда в ложке, ложка наклоняется — еда ложится и расправляется, ложка уходит за следующей
  const spoon = E('g', {}, svg); H(spoon, shade(id, '<ellipse rx="26" ry="19"/><path d="M20 -12L96 -64" stroke="#000" stroke-width="7"/>', 5, 8, .25) + `<path d="M18 -10L96 -64" stroke="url(#hnd${id})" stroke-width="7" stroke-linecap="round"/><ellipse rx="26" ry="19" fill="url(#rim${id})"/><ellipse rx="22" ry="15.5" fill="url(#wal${id})"/><path d="M-18 -6Q-10 -14 4 -14" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>`);
  svg.insertBefore(spoon, por);   // еда лежит в ложке (поверх неё)
  const T = 4.4, PX = 166, PY = 90, SX2 = 206, SY2 = 84;
  const carry = (t, t0, x, y) => { const k = clamp((t - t0) / .55), d = clamp((t - t0 - .55) / .3), o = clamp((t - t0 - .85) / .45); return { k, d, o, sx: lerp(x + 150, x, eOut(k)) + eIn(o) * 160, sy: lerp(y - 110, y, eOut(k)) - eIn(o) * 120 } };
  function frame(t, emit) { t %= T; const A = carry(t, .05, PX, PY), Bq = carry(t, 1.5, SX2, SY2), f = t > T - .4 ? 1 - (t - (T - .4)) / .4 : 1, two = !!items[1];
    // порция: пока в ложке — едет с ней и сжата; после опускания — на тарелке, расправляется
    const pa = A.d > 0 ? 1 : .5, ax = A.d > 0 ? 0 : A.sx - PX, ay = A.d > 0 ? 0 : A.sy - PY;
    por.setAttribute('transform', `translate(${(PX + ax).toFixed(1)} ${(PY + ay).toFixed(1)}) scale(${lerp(.5, 1, eOut(A.d)).toFixed(3)}) translate(${-PX} ${-PY})`); por.setAttribute('opacity', (A.k > 0 ? f : 0).toFixed(2));
    const bx = Bq.d > 0 ? 0 : Bq.sx - SX2, by2 = Bq.d > 0 ? 0 : Bq.sy - SY2;
    side.setAttribute('transform', `translate(${(SX2 + bx).toFixed(1)} ${(SY2 + by2).toFixed(1)}) scale(${lerp(.7, 1, eOut(Bq.d)).toFixed(3)}) translate(${-SX2 - 6} ${-SY2 - 10})`); side.setAttribute('opacity', (two && Bq.k > 0 ? f : 0).toFixed(2));
    const S = t < 1.5 || !two ? A : Bq, tilt = Math.sin(clamp(S.d) * Math.PI) * 18; spoon.setAttribute('transform', `translate(${S.sx.toFixed(1)} ${S.sy.toFixed(1)}) rotate(${tilt.toFixed(1)})`);
    spoon.setAttribute('opacity', (t < 1.5 || two ? (S.o >= 1 ? 0 : 1) : (A.o >= 1 ? 0 : 1)));
    if (A.d > 0 && !frame._p) { frame._p = 1; emit && emit('plate') } if (A.d === 0) frame._p = 0;
    if (two && Bq.d > 0 && !frame._q) { frame._q = 1; emit && emit('plate') } if (Bq.d === 0) frame._q = 0 }
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


/* ---------- кусочки любых продуктов сверху (центр 0,0): цвета берутся из каталога ---------- */
const MIXC = ['#F2871F', '#7BC05A', '#F2C640', '#E23B2B', '#4E8F3A'];
const GEN = {
  eggW: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><ellipse rx="${7 * s}" ry="${5.4 * s}" fill="#EFD9BC" stroke="#D2B894" stroke-width=".7"/><ellipse cx="${-2 * s}" cy="${-1.6 * s}" rx="${2.6 * s}" ry="${1.4 * s}" fill="#fff" opacity=".6"/></g>`,
  coin: (P, s, r) => `<circle r="${7.4 * s}" fill="${P.c}"/><circle r="${7.4 * s}" fill="none" stroke="${P.s || P.d}" stroke-width="${1.3 * s}"/><circle r="${4.2 * s}" fill="${P.l}" opacity=".75"/>${[0, 1, 2, 3, 4, 5].map(i => { const a = i * 1.047 + r; return `<circle cx="${(Math.cos(a) * 3.2 * s).toFixed(1)}" cy="${(Math.sin(a) * 3.2 * s).toFixed(1)}" r="${.55 * s}" fill="${P.d}" opacity=".55"/>` }).join('')}<path d="M${-4.6 * s} ${-3 * s}A${5.6 * s} ${5.6 * s} 0 0 1 ${1.6 * s} ${-5.6 * s}" stroke="#fff" stroke-width="1.1" fill="none" opacity=".55" stroke-linecap="round"/>`,
  chunk: (P, s, r) => { const q = i => (R(r * 7 + i, .78, 1.1) * 8.2 * s).toFixed(1); return `<g transform="rotate(${R(r, 0, 180).toFixed(0)})"><path d="M${-q(1)} 0Q${-q(2)} ${-q(3) * .8} 0 ${-q(4) * .85}Q${q(5)} ${-q(6) * .8} ${q(7)} 0Q${q(8)} ${q(1) * .8} 0 ${q(2) * .85}Q${-q(3)} ${q(4) * .75} ${-q(1)} 0Z" fill="${P.c}" stroke="${P.d}" stroke-width=".9"/>
    <path d="M${-q(2) * .5} ${-q(3) * .3}Q0 ${-q(4) * .6} ${q(5) * .5} ${-q(6) * .3}" stroke="${P.l}" stroke-width="1.6" fill="none" opacity=".8" stroke-linecap="round"/><path d="M${-q(1) * .4} ${q(2) * .2}Q0 ${q(3) * .35} ${q(4) * .4} ${q(5) * .1}" stroke="${P.d}" stroke-width=".7" fill="none" opacity=".45"/></g>` },
  grain: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><path d="M0 ${-3 * s}C${2.4 * s} ${-2.2 * s} ${2.5 * s} ${1.5 * s} 0 ${2.8 * s}C${-2.5 * s} ${1.5 * s} ${-2.4 * s} ${-2.2 * s} 0 ${-3 * s}Z" fill="${[P.c, P.d, P.l][r % 3]}"/></g>`,
  rice: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><ellipse rx="${1.35 * s}" ry="${3.3 * s}" fill="${P.c}" stroke="${P.d}" stroke-width=".35"/><ellipse cx="${-.4 * s}" cy="${-1 * s}" rx="${.45 * s}" ry="${1.4 * s}" fill="#fff" opacity=".8"/></g>`,
  seed: (P, s, r) => `<circle r="${1.7 * s}" fill="${[P.c, P.l, P.d][r % 3]}"/><circle cx="${-.5 * s}" cy="${-.5 * s}" r="${.5 * s}" fill="#fff" opacity=".6"/>`,
  lentil: (P, s, r) => `<ellipse rx="${2.6 * s}" ry="${2.2 * s}" fill="${P.c}" stroke="${P.d}" stroke-width=".4" transform="rotate(${R(r, 0, 180).toFixed(0)})"/><circle cx="${-.7 * s}" cy="${-.7 * s}" r="${.7 * s}" fill="${P.l}"/>`,
  bean: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><path d="M${-4.2 * s} 0C${-4.2 * s} ${-3 * s} ${4.2 * s} ${-3.2 * s} ${4.2 * s} 0C${4.2 * s} ${2.4 * s} ${1 * s} ${2.6 * s} 0 ${1.4 * s}C${-1 * s} ${2.6 * s} ${-4.2 * s} ${2.4 * s} ${-4.2 * s} 0Z" fill="${P.c}" stroke="${P.d}" stroke-width=".5"/><path d="M${-2.6 * s} ${-1 * s}Q0 ${-2.2 * s} ${2.6 * s} ${-1 * s}" stroke="${P.l}" stroke-width=".9" fill="none"/></g>`,
  pea: (P, s, r) => `<circle r="${3 * s}" fill="${P.d}"/><circle cx="${-.3 * s}" cy="${-.3 * s}" r="${2.6 * s}" fill="${P.c}"/><circle cx="${-1 * s}" cy="${-1 * s}" r="${.9 * s}" fill="${P.l}"/>`,
  berry: (P, s, r) => `<circle r="${3.8 * s}" fill="${P.d}"/><circle cx="${-.4 * s}" cy="${-.4 * s}" r="${3.3 * s}" fill="${P.c}"/><circle cx="${-1.4 * s}" cy="${-1.4 * s}" r="${1 * s}" fill="${P.l}" opacity=".9"/>`,
  floret: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><rect x="${-1.4 * s}" y="${2 * s}" width="${2.8 * s}" height="${5 * s}" rx="${1.2 * s}" fill="${P.l}"/>${[[-3, -1], [3, -1], [0, -4], [-1.6, 2], [1.8, 1.8], [0, 0]].map(([x, y], i) => `<circle cx="${x * s}" cy="${y * s}" r="${3 * s}" fill="${i % 2 ? P.c : P.d}"/><circle cx="${(x - .8) * s}" cy="${(y - .8) * s}" r="${1 * s}" fill="${P.l}" opacity=".7"/>`).join('')}</g>`,
  ring: (P, s, r) => `<circle r="${5.6 * s}" fill="none" stroke="${P.d}" stroke-width="${3.2 * s}"/><circle r="${5.6 * s}" fill="none" stroke="${P.c}" stroke-width="${2.4 * s}"/><path d="M${-4 * s} ${-3 * s}A${5 * s} ${5 * s} 0 0 1 ${1 * s} ${-5.4 * s}" stroke="${P.l}" stroke-width=".9" fill="none"/>`,
  slice: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><path d="M${-8 * s} 0A${8 * s} ${8 * s} 0 0 1 ${8 * s} 0Z" fill="${P.c}" stroke="${P.s || P.d}" stroke-width="${1.6 * s}" stroke-linejoin="round"/><path d="M${-5 * s} ${-1 * s}A${5 * s} ${4 * s} 0 0 1 ${5 * s} ${-1 * s}" stroke="${P.l}" stroke-width="1" fill="none"/></g>`,
  mix: (P, s, r) => `<rect x="${-3.4 * s}" y="${-3.4 * s}" width="${6.8 * s}" height="${6.8 * s}" rx="${1.4 * s}" fill="${MIXC[r % 5]}" transform="rotate(${R(r, -40, 40).toFixed(0)})"/><rect x="${-2.4 * s}" y="${-2.6 * s}" width="${3 * s}" height="${1.2 * s}" rx=".6" fill="#fff" opacity=".45"/>`,
  leaf: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><path d="M${-9 * s} 0Q0 ${-7 * s} ${9 * s} 0Q0 ${7 * s} ${-9 * s} 0Z" fill="${P.c}" stroke="${P.d}" stroke-width=".6"/><path d="M${-8 * s} 0H${8 * s}" stroke="${P.l}" stroke-width=".9"/></g>`,
  egg: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><ellipse rx="${8 * s}" ry="${6 * s}" fill="#FFFFFF" stroke="#E2DCCF" stroke-width=".8"/><circle cx="${.6 * s}" r="${3.3 * s}" fill="#F6B92E"/><circle cx="${-.4 * s}" cy="${-1 * s}" r="${1 * s}" fill="#FFE08A"/></g>`,
  crumb: (P, s, r) => `<path d="M${-2.4 * s} ${-1 * s}Q${-1 * s} ${-2.8 * s} ${1.6 * s} ${-1.8 * s}Q${3 * s} 0 ${1.2 * s} ${2 * s}Q${-1.4 * s} ${2.6 * s} ${-2.4 * s} ${-1 * s}Z" fill="${P.c}" stroke="${P.d}" stroke-width=".4" transform="rotate(${R(r, 0, 360).toFixed(0)})"/>`,
  drop: (P, s, r) => `<path d="M${-7 * s} 0Q${-6 * s} ${-6 * s} 0 ${-6 * s}Q${7 * s} ${-5 * s} ${6.6 * s} ${.8 * s}Q${5 * s} ${6.4 * s} ${-1 * s} ${6 * s}Q${-7.4 * s} ${5 * s} ${-7 * s} 0Z" fill="${P.c}" stroke="${P.d}" stroke-width=".6" opacity=".95"/><ellipse cx="${-2.4 * s}" cy="${-2.4 * s}" rx="${2.4 * s}" ry="${1.2 * s}" fill="#fff" opacity=".55"/>`,
  powder: (P, s, r) => `<circle r="${5 * s}" fill="${P.c}" opacity=".9"/><circle cx="${-1 * s}" cy="${-1 * s}" r="${2.8 * s}" fill="${P.l}" opacity=".9"/>`,
  tube: (P, s, r) => `<g transform="rotate(${R(r, 0, 180).toFixed(0)})"><rect x="${-5.4 * s}" y="${-2.3 * s}" width="${10.8 * s}" height="${4.6 * s}" rx="${1.6 * s}" fill="${P.c}" stroke="${P.d}" stroke-width=".5"/>${[-3, -1, 1, 3].map(x => `<path d="M${x * s} ${-2 * s}V${2 * s}" stroke="${P.d}" stroke-width=".4" opacity=".6"/>`).join('')}<path d="M${-4.4 * s} ${-1.2 * s}H${4.4 * s}" stroke="${P.l}" stroke-width=".9"/></g>`,
  flake: (P, s, r) => `<path d="M${-4.6 * s} ${-1 * s}Q${-3 * s} ${-3.6 * s} ${1 * s} ${-3.2 * s}Q${4.8 * s} ${-2 * s} ${4.2 * s} ${1.4 * s}Q${2 * s} ${3.6 * s} ${-2 * s} ${3 * s}Q${-5 * s} ${2 * s} ${-4.6 * s} ${-1 * s}Z" fill="${P.c}" stroke="${P.d}" stroke-width=".4" transform="rotate(${R(r, 0, 360).toFixed(0)})"/>`,
  ball: (P, s, r) => `<circle r="${7.4 * s}" fill="${P.d}"/><circle cx="${-.6 * s}" cy="${-.6 * s}" r="${6.6 * s}" fill="${P.c}"/>${[...Array(7)].map((_, i) => `<circle cx="${R(r * 9 + i, -4.5, 4.5).toFixed(1) * s}" cy="${R(r * 9 + i + 3, -4.5, 4.5).toFixed(1) * s}" r="${.7 * s}" fill="${i % 2 ? P.d : P.l}" opacity=".7"/>`).join('')}<ellipse cx="${-2.6 * s}" cy="${-2.8 * s}" rx="${2.4 * s}" ry="${1.3 * s}" fill="#fff" opacity=".4"/>`,
  shrimp: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><path d="M${5 * s} ${-3 * s}A${5.4 * s} ${5.4 * s} 0 1 0 ${4 * s} ${4 * s}" stroke="${P.d}" stroke-width="${4.6 * s}" fill="none" stroke-linecap="round"/><path d="M${5 * s} ${-3 * s}A${5.4 * s} ${5.4 * s} 0 1 0 ${4 * s} ${4 * s}" stroke="${P.c}" stroke-width="${3.6 * s}" fill="none" stroke-linecap="round"/><path d="M${-3 * s} ${-4 * s}A${5 * s} ${5 * s} 0 0 0 ${-5 * s} ${1 * s}" stroke="${P.l}" stroke-width="1" fill="none"/></g>`,
  nut: (P, s, r) => `<g transform="rotate(${R(r, 0, 360).toFixed(0)})"><path d="M${-5.6 * s} 0Q${-5 * s} ${-4.6 * s} 0 ${-4.4 * s}Q${5.4 * s} ${-4.4 * s} ${5.6 * s} 0Q${5 * s} ${4.4 * s} 0 ${4.4 * s}Q${-5.4 * s} ${4.4 * s} ${-5.6 * s} 0Z" fill="${P.c}" stroke="${P.d}" stroke-width=".6"/><path d="M0 ${-4 * s}V${4 * s}M${-3.6 * s} ${-1.6 * s}q${1.6 * s} ${1.4 * s} 0 ${3 * s}M${3.6 * s} ${-1.6 * s}q${-1.6 * s} ${1.4 * s} 0 ${3 * s}" stroke="${P.d}" stroke-width=".8" fill="none"/></g>`,
  mush: (P, s, r) => `<g transform="rotate(${R(r, -40, 40).toFixed(0)})"><path d="M${-7 * s} ${-1 * s}Q${-7 * s} ${-7 * s} 0 ${-7 * s}Q${7 * s} ${-7 * s} ${7 * s} ${-1 * s}Q${3 * s} ${-1.6 * s} ${2.4 * s} ${0}V${5 * s}Q0 ${6.4 * s} ${-2.4 * s} ${5 * s}V0Q${-3 * s} ${-1.6 * s} ${-7 * s} ${-1 * s}Z" fill="${P.c}" stroke="${P.d}" stroke-width=".7"/><path d="M${-4.6 * s} ${-3 * s}Q0 ${-5.6 * s} ${4.6 * s} ${-3 * s}" stroke="${P.l}" stroke-width="1" fill="none"/></g>`,
};
const KEEP_OLD = (f, kind) => (kind === 'coin' && f === 'morkov') || (kind === 'chunk' && (f === 'kur' || IS_KUR(f))) || (kind === 'grain' && f === 'grechka') || ['cube', 'stick', 'strip', 'speck'].includes(kind);

/* ---------- рисунки 64×64 для всех продуктов: формы по семействам, цвета продукта, свет слева сверху, мягкая тень ---------- */
function iconGen(k) { const C = CAT[k]; if (!C) return ''; const [, shape, pc, c, l, d, s0, x] = C, s = s0 || c, id = ++UID, P = { c, l, d, s };
  const rg = (n, a, b, cc) => `<radialGradient id="${n}${id}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${cc}"/></radialGradient>`;
  const lg = (n, a, b, cc, v = 1) => `<linearGradient id="${n}${id}" x1="0" y1="0" x2="${v ? 0 : 1}" y2="${v ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${cc}"/></linearGradient>`;
  const sh = (rx = 20) => `<ellipse cx="32" cy="56" rx="${rx}" ry="4" fill="#000" opacity=".12"/>`, hi = (d0, w = 2) => `<path d="${d0}" stroke="#fff" stroke-width="${w}" fill="none" opacity=".6" stroke-linecap="round"/>`;
  const sk = shade2(s), pieces = (n, cx, cy, rx, ry, sc) => [...Array(n)].map((_, i) => `<g transform="translate(${(cx + R(i + k.length, -rx, rx)).toFixed(1)} ${(cy + R(i + 9, -ry, ry)).toFixed(1)})">${GEN[pc] ? GEN[pc](P, sc, i) : GEN.crumb(P, sc, i)}</g>`).join('');
  switch (shape) {
    case 'bowl': return `<defs>${lg('a', '#F7F3EC', '#E3DACB', '#C9BCA6')}</defs>${sh(22)}<path d="M8 32H56Q54 52 32 53Q10 52 8 32Z" fill="url(#a${id})"/><ellipse cx="32" cy="32" rx="24" ry="7" fill="#EFE8DC"/><ellipse cx="32" cy="31" rx="21" ry="5.6" fill="${pc === 'mix' ? '#E9E2D2' : d}"/><ellipse cx="32" cy="30" rx="19" ry="4.6" fill="${c}"/>
      ${pieces(pc === 'powder' ? 0 : 14, 32, 29.5, 15, 3, ['seed', 'rice', 'grain', 'lentil'].includes(pc) ? .8 : .5)}${hi('M12 36Q16 46 26 50', 1.6)}`;
    case 'can': return `<defs>${lg('a', '#E9EDF0', '#BAC3CB', '#8E979F', 0)}</defs>${sh(18)}<rect x="15" y="16" width="34" height="38" rx="4" fill="url(#a${id})"/><rect x="15" y="24" width="34" height="22" fill="${s}"/><ellipse cx="32" cy="16" rx="17" ry="5" fill="#D5DBE0"/><ellipse cx="32" cy="16" rx="13" ry="3.4" fill="none" stroke="#AEB7BF" stroke-width="1"/>
      <circle cx="32" cy="35" r="7" fill="#fff" opacity=".92"/><g transform="translate(32 35)">${GEN[pc] ? GEN[pc](P, .55, 1) : ''}</g>${hi('M19 20V50', 2)}`;
    case 'carton': return `<defs>${lg('a', '#FFFFFF', '#F1F3F4', '#D9DEE2', 0)}</defs>${sh(16)}<path d="M18 20L24 10H40L46 20V54H18Z" fill="url(#a${id})"/><path d="M24 10H40L46 20H18Z" fill="#E9EDF0"/><rect x="18" y="30" width="28" height="14" fill="${s}"/><path d="M18 30Q32 24 46 30" stroke="${s}" stroke-width="3" fill="none"/><rect x="28" y="6" width="8" height="5" rx="1.4" fill="${s}"/>${hi('M21 22V52', 1.6)}`;
    case 'tub': return `<defs>${lg('a', '#FFFFFF', '#F1F3F4', '#D2D8DD', 0)}</defs>${sh(19)}<path d="M13 26H51L47 52Q47 55 44 55H20Q17 55 17 52Z" fill="url(#a${id})"/><rect x="11" y="20" width="42" height="8" rx="3" fill="${s}"/><path d="M15 38H49L48 46H16Z" fill="${s}" opacity=".85"/><ellipse cx="32" cy="20" rx="21" ry="3" fill="#fff" opacity=".6"/>${hi('M18 30L20 50', 1.6)}`;
    case 'jar': return `<defs>${lg('a', l, c, d, 0)}</defs>${sh(17)}<rect x="17" y="18" width="30" height="36" rx="7" fill="url(#a${id})"/><rect x="17" y="18" width="30" height="36" rx="7" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/><rect x="19" y="11" width="26" height="8" rx="2.4" fill="${x === 'olives' ? '#3F8A2E' : '#C9D0D6'}"/>
      ${x === 'olives' ? [...Array(7)].map((_, i) => `<ellipse cx="${23 + (i % 3) * 9}" cy="${28 + Math.floor(i / 3) * 9}" rx="3.6" ry="2.8" fill="#121014"/><circle cx="${22 + (i % 3) * 9}" cy="${27 + Math.floor(i / 3) * 9}" r=".9" fill="#7E7488"/>`).join('') : `<rect x="20" y="30" width="24" height="14" rx="2" fill="#fff" opacity=".85"/><circle cx="32" cy="37" r="4" fill="${c}"/>`}${hi('M21 22V50', 2)}`;
    case 'bottle': case 'oil': return `<defs>${lg('a', l, c, d, 0)}</defs>${sh(14)}<path d="M27 6H37V15Q45 20 45 30V51Q45 56 40 56H24Q19 56 19 51V30Q19 20 27 15Z" fill="url(#a${id})" opacity="${shape === 'oil' ? .95 : 1}"/><rect x="26" y="3" width="12" height="6" rx="2" fill="${shape === 'oil' ? '#1F6B45' : s}"/>
      <rect x="21" y="32" width="22" height="13" rx="2.4" fill="#fff" opacity=".9"/><circle cx="32" cy="38.5" r="3.6" fill="${shape === 'oil' ? '#F4B92E' : s}"/>${hi('M23 22Q23 18 27 16V52', 2)}`;
    case 'round': { const ox = x === 'lemon' ? 22 : x === 'potato' ? 22 : 19, oy = x === 'potato' ? 15 : x === 'lemon' ? 16 : 19;
      return `<defs>${rg('a', mixc(s, '#fff', .45), s, mixc(s, '#000', .18))}</defs>${sh(oy + 2)}<ellipse cx="32" cy="35" rx="${ox}" ry="${oy}" fill="url(#a${id})" transform="rotate(${x === 'potato' ? -12 : 0} 32 35)"/>
      ${x === 'lemon' ? `<path d="M9 35q-3 0-3 0M55 35q3 0 3 0" stroke="${sk}" stroke-width="3" stroke-linecap="round"/>` : ''}${x === 'potato' ? [[-8, -3], [6, -7], [10, 5], [-4, 6]].map(([a, b]) => `<path d="M${30 + a} ${35 + b}q2 -1.6 4 0" stroke="#6E4A22" stroke-width="1.1" fill="none"/>`).join('') : ''}
      ${x === 'tomato' ? `<path d="M32 18l3 -4M32 18l-5 -2M32 18l6 -1M32 18l-3 4M32 18l4 4" stroke="#3F8A2E" stroke-width="2.4" stroke-linecap="round"/>` : ''}${x === 'apple' ? `<path d="M32 18q1 -6 3 -8" stroke="#6E4A22" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M34 13q8 -5 12 -1q-6 5 -12 1Z" fill="#5FA641"/>` : ''}
      ${x === 'beet' || x === 'radish' ? `<path d="M32 17q-2 -8 -6 -12M32 17q1 -9 4 -13M32 17q4 -7 9 -10" stroke="${x === 'beet' ? '#7A1A33' : '#5FA641'}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M32 53q1 5 3 7" stroke="${sk}" stroke-width="1.6" fill="none"/>` : ''}
      ${x === 'pores' ? [...Array(14)].map((_, i) => `<circle cx="${(32 + R(i, -14, 14)).toFixed(1)}" cy="${(35 + R(i + 4, -13, 13)).toFixed(1)}" r=".7" fill="${sk}" opacity=".5"/>`).join('') + `<circle cx="32" cy="17.4" r="1.6" fill="#5E8A2E"/>` : ''}${x === 'kiwi' ? `<ellipse cx="44" cy="41" rx="11" ry="9.4" fill="${c}" stroke="${sk}" stroke-width="2"/><ellipse cx="44" cy="41" rx="3.4" ry="2.6" fill="#F4F7DC"/>${[...Array(10)].map((_, i) => `<circle cx="${(44 + Math.cos(i * .63) * 6).toFixed(1)}" cy="${(41 + Math.sin(i * .63) * 5).toFixed(1)}" r=".7" fill="#1A1A10"/>`).join('')}` : ''}
      ${hi(`M${32 - ox * .6} ${35 - oy * .3}Q${32 - ox * .4} ${35 - oy * .75} ${32 - ox * .05} ${35 - oy * .85}`, 2.4)}` }
    case 'carrot': return '';
    case 'onion': return '';
    case 'cabbage': return `<defs>${rg('a', l, s, d)}</defs>${sh(22)}<circle cx="32" cy="34" r="22" fill="url(#a${id})"/>${[-1, 0, 1].map(i => `<path d="M32 14Q${32 + i * 18} 30 ${32 + i * 12} 55" stroke="${l}" stroke-width="1.6" fill="none" opacity=".9"/>`).join('')}<path d="M12 30Q22 18 32 22Q22 30 12 30Z" fill="${d}" opacity=".45"/><path d="M52 30Q42 18 32 22Q42 30 52 30Z" fill="${d}" opacity=".35"/>${hi('M18 26Q22 18 30 15', 2.4)}`;
    case 'garlic': return `<defs>${rg('a', '#FFFFFF', c, d)}</defs>${sh(18)}<path d="M32 10Q34 18 42 22Q52 30 50 42Q48 54 32 55Q16 54 14 42Q12 30 22 22Q30 18 32 10Z" fill="url(#a${id})"/>${[-8, 0, 8].map(i => `<path d="M32 16Q${32 + i * 1.8} 34 ${32 + i} 54" stroke="#CDBE9A" stroke-width="1" fill="none"/>`).join('')}<path d="M28 55q4 4 8 0" stroke="#B9A57C" stroke-width="1.4" fill="none"/>${hi('M22 30Q25 23 31 20')}`;
    case 'long': { const curve = x === 'aub' ? 'M10 40Q8 26 22 24Q40 22 52 16Q58 14 58 20Q56 34 44 42Q30 52 18 50Q10 48 10 40Z' : 'M8 38Q8 30 18 28L50 24Q58 24 58 31Q58 38 50 39L18 44Q8 46 8 38Z';
      return `<defs>${lg('a', mixc(s, '#fff', .35), s, sk)}</defs>${sh(24)}<path d="${curve}" fill="url(#a${id})"/>${x === 'bumps' ? [...Array(12)].map((_, i) => `<circle cx="${14 + i * 3.6}" cy="${33 + Math.sin(i * 2) * 3.4}" r=".9" fill="${l}" opacity=".85"/>`).join('') : ''}
        ${x === 'aub' ? `<path d="M50 18Q56 10 60 12Q58 16 54 20Z" fill="#3F8A2E"/><path d="M48 16l6 -8" stroke="#2F6522" stroke-width="2.4" stroke-linecap="round"/>` : `<path d="M54 26q4 -2 6 0" stroke="${d}" stroke-width="2.4" stroke-linecap="round"/>`}${hi(x === 'aub' ? 'M16 34Q26 28 44 24' : 'M14 34L48 29', 2.2)}` }
    case 'bell': return `<defs>${rg('a', l, c, d)}</defs>${sh(19)}<path d="M32 18Q20 14 14 24Q8 36 16 48Q24 58 32 52Q40 58 48 48Q56 36 50 24Q44 14 32 18Z" fill="url(#a${id})"/><path d="M32 20V50M22 22Q18 36 24 50M42 22Q46 36 40 50" stroke="${d}" stroke-width="1" fill="none" opacity=".45"/><path d="M32 18q0 -6 4 -9" stroke="#3F8A2E" stroke-width="3.4" fill="none" stroke-linecap="round"/>${hi('M19 28Q22 21 28 20', 2.4)}`;
    case 'floret': return `${sh(20)}<path d="M28 40L26 55H38L36 40Z" fill="${x === 'w' ? '#E3E8C8' : '#8BB86A'}"/>${[[22, 30], [42, 30], [32, 22], [16, 38], [48, 38], [32, 34], [26, 40], [38, 40]].map(([a, b], i) => `<circle cx="${a}" cy="${b}" r="${i < 3 ? 11 : 9}" fill="${i % 2 ? c : d}"/><circle cx="${a - 3}" cy="${b - 3}" r="3.4" fill="${l}" opacity=".7"/>`).join('')}`;
    case 'herb': return `${sh(16)}<g stroke-linecap="round" fill="none">${[-10, -4, 2, 8, 13].map((a, i) => `<path d="M32 56Q${32 + a * .5} 36 ${32 + a} 12" stroke="${x === 'stalk' ? [c, d, l][i % 3] : d}" stroke-width="${x === 'stalk' ? 3.6 : 1.4}"/>`).join('')}
      ${x === 'stalk' ? '' : [...Array(16)].map((_, i) => { const a = [-10, -4, 2, 8, 13][i % 5], y = 14 + Math.floor(i / 5) * 8, xx = 32 + a * (1 - (y - 12) / 44); return x === 'flat' ? `<path d="M${xx} ${y}q${i % 2 ? 6 : -6} -2 ${i % 2 ? 7 : -7} 3q${i % 2 ? -4 : 4} 3 ${i % 2 ? -7 : 7} -3Z" fill="${[c, l][i % 2]}" stroke="none"/>` : `<path d="M${xx} ${y}q${i % 2 ? 6 : -6} -3 ${i % 2 ? 9 : -9} -8M${xx} ${y + 3}q${i % 2 ? 5 : -5} -1 ${i % 2 ? 8 : -8} -4" stroke="${[c, l, d][i % 3]}" stroke-width="1.1"/>` }).join('')}</g><path d="M26 46H38" stroke="#C98F55" stroke-width="3" stroke-linecap="round"/>`;
    case 'leaf': return `${sh(21)}${[[-14, 6, -30], [14, 6, 30], [0, 0, 0], [-6, 12, -12], [8, 12, 14]].map(([a, b, r], i) => `<g transform="translate(${32 + a} ${30 + b}) rotate(${r})"><path d="M0 22Q-16 6 -10 -12Q0 -24 10 -12Q16 6 0 22Z" fill="${[c, d, l, c, d][i]}"/><path d="M0 20V-14" stroke="${l}" stroke-width="1.2"/>${x === 'light' ? `<path d="M-9 -6q4 2 0 6q4 2 0 6" stroke="${l}" stroke-width=".8" fill="none"/>` : ''}</g>`).join('')}`;
    case 'banana': return `<defs>${lg('a', '#FFF0A6', s, '#C9A21E')}</defs>${sh(22)}<path d="M10 22Q14 48 40 50Q52 50 56 44Q44 44 34 38Q20 30 16 18Q12 16 10 22Z" fill="url(#a${id})"/><path d="M12 22Q18 44 44 47" stroke="#C9A21E" stroke-width="1" fill="none" opacity=".6"/><path d="M10 22l-1 -5" stroke="#5E4A22" stroke-width="3" stroke-linecap="round"/><path d="M56 44l3 1" stroke="#3E2E12" stroke-width="3" stroke-linecap="round"/>${hi('M16 26Q20 38 32 43', 2)}`;
    case 'pear': return `<defs>${rg('a', mixc(s, '#fff', .4), s, sk)}</defs>${sh(18)}<path d="M32 14Q24 14 24 26Q24 32 18 38Q14 46 20 52Q26 57 32 56Q38 57 44 52Q50 46 46 38Q40 32 40 26Q40 14 32 14Z" fill="url(#a${id})"/><path d="M32 14q0 -6 3 -9" stroke="#6E4A22" stroke-width="2" fill="none" stroke-linecap="round"/>${hi('M22 40Q22 34 27 30', 2.2)}`;
    case 'pumpkin': return `<defs>${rg('a', l, c, d)}</defs>${sh(22)}${[-14, -5, 5, 14].map(a => `<ellipse cx="${32 + a}" cy="37" rx="12" ry="17" fill="url(#a${id})"/>`).join('')}<ellipse cx="32" cy="37" rx="11" ry="18" fill="url(#a${id})"/><path d="M32 20q1 -7 6 -9" stroke="#5E7A22" stroke-width="3" fill="none" stroke-linecap="round"/>${hi('M20 30Q22 24 27 22', 2)}`;
    case 'meat': return `<defs>${rg('a', l, c, d)}</defs>${sh(22)}<path d="M9 36Q7 24 20 20Q34 15 48 20Q58 25 55 37Q51 50 32 50Q13 50 9 36Z" fill="url(#a${id})"/>${x === 'fat' ? `<path d="M9 36Q7 24 20 20Q34 15 48 20" stroke="#FBF3EA" stroke-width="5" fill="none"/>` : ''}${x === 'marble' ? [0, 1, 2, 3].map(i => `<path d="M${16 + i * 9} ${28 + i * 3}q5 4 10 2" stroke="#F4D6D0" stroke-width="1.2" fill="none" opacity=".8"/>`).join('') : ''}
      ${x === 'gloss' ? `<ellipse cx="26" cy="28" rx="10" ry="3.4" fill="#fff" opacity=".35" transform="rotate(-14 26 28)"/>` : ''}${[0, 1, 2].map(i => `<path d="M${18 + i * 9} ${33 + i}q6 3 12 1" stroke="${d}" stroke-width=".9" fill="none" opacity=".5"/>`).join('')}${hi('M16 28Q30 20 46 24', 2.2)}`;
    case 'drum': return `<defs>${rg('a', mixc(c, '#fff', .2), c, d)}</defs>${sh(20)}<g transform="rotate(-35 32 32)"><path d="M18 22Q18 8 32 8Q46 8 46 22Q46 36 36 40L35 50H29L28 40Q18 36 18 22Z" fill="url(#a${id})"/><rect x="28" y="48" width="8" height="8" rx="3" fill="#F6EFE4"/><circle cx="29" cy="57" r="3.2" fill="#F6EFE4"/><circle cx="35" cy="57" r="3.2" fill="#F6EFE4"/>${hi('M23 18Q26 12 32 11', 2.2)}</g>`;
    case 'mince': return `<defs>${rg('a', l, c, d)}</defs>${sh(22)}<path d="M10 44Q10 28 22 24Q32 18 42 24Q54 28 54 44Q46 50 32 50Q18 50 10 44Z" fill="url(#a${id})"/>${[...Array(30)].map((_, i) => `<path d="M${(14 + R(i, 0, 36)).toFixed(1)} ${(28 + R(i + 3, 0, 18)).toFixed(1)}q2 -2 4 0" stroke="${i % 2 ? d : l}" stroke-width="1.1" fill="none" opacity=".8"/>`).join('')}`;
    case 'fillet': return `<defs>${lg('a', l, c, d)}</defs>${sh(23)}<path d="M8 34Q12 22 30 22Q48 22 56 28Q58 36 50 42Q38 48 24 46Q10 44 8 34Z" fill="url(#a${id})"/>${[...Array(6)].map((_, i) => `<path d="M${16 + i * 6.4} 25Q${12 + i * 6.4} 34 ${18 + i * 6.4} 45" stroke="${d}" stroke-width=".9" fill="none" opacity=".5"/>`).join('')}${hi('M16 28Q30 23 46 26', 2)}`;
    case 'fish': return `<defs>${lg('a', mixc(s, '#fff', .45), s, mixc(s, '#000', .3))}</defs>${sh(24)}<path d="M6 32Q20 18 40 22Q50 25 54 32Q50 39 40 42Q20 46 6 32Z" fill="url(#a${id})"/><path d="M54 32L62 22V42Z" fill="${s}"/><circle cx="14" cy="30" r="2" fill="#1A1A1A"/><circle cx="13.5" cy="29.5" r=".6" fill="#fff"/>
      ${x === 'stripes' ? [...Array(6)].map((_, i) => `<path d="M${22 + i * 5} 23q-3 5 0 8" stroke="#1E3E4A" stroke-width="1.4" fill="none"/>`).join('') : ''}<path d="M20 26Q22 32 20 38" stroke="${mixc(s, '#000', .3)}" stroke-width="1" fill="none"/>${hi('M18 27Q30 22 44 25', 1.8)}`;
    case 'egg': return `<defs>${rg('a', '#FFFAF2', s, '#D9BE9A')}</defs>${sh(22)}<ellipse cx="24" cy="36" rx="12" ry="15" fill="url(#a${id})" transform="rotate(-12 24 36)"/><ellipse cx="42" cy="38" rx="12" ry="15" fill="url(#a${id})" transform="rotate(14 42 38)"/>${hi('M18 28Q20 24 24 23', 2)}${hi('M37 30Q39 26 43 25', 2)}`;
    case 'cheese': return x === 'white' ? `${sh(20)}<path d="M12 30L20 22H52V44L44 52H12Z" fill="${l}"/><path d="M12 30H44V52H12Z" fill="${c}" stroke="${d}" stroke-width="1"/><path d="M44 30L52 22V44L44 52Z" fill="${d}"/>${[...Array(8)].map((_, i) => `<circle cx="${(18 + R(i, 0, 22)).toFixed(1)}" cy="${(35 + R(i + 2, 0, 13)).toFixed(1)}" r=".9" fill="${d}"/>`).join('')}`
      : `${sh(22)}<path d="M8 44L46 18L56 32V48H8Z" fill="${c}"/><path d="M8 44L46 18L56 32L18 50Z" fill="${l}"/><path d="M8 44V50H56V48" fill="${d}"/>${[[30, 38, 3.4], [44, 33, 2.4], [22, 43, 2], [38, 44, 2]].map(([a, b, r]) => `<ellipse cx="${a}" cy="${b}" rx="${r}" ry="${r * .7}" fill="${d}"/>`).join('')}`;
    case 'butter': return `${sh(20)}<path d="M10 30L22 22H54V38L42 46H10Z" fill="#E9EDF0"/><path d="M10 30H42V46H10Z" fill="#D5DBE0"/><path d="M14 24L22 22H40V30H14Z" fill="${c}"/><path d="M22 22H40L46 18V26L40 30Z" fill="${l}"/><path d="M10 34H42" stroke="#2F7FB8" stroke-width="3"/>`;
    case 'bag': return `<defs>${lg('a', '#F4E6CC', s, '#B59A6A', 0)}</defs>${sh(18)}<path d="M16 16H48L50 54H14Z" fill="url(#a${id})"/><path d="M16 16L20 10H44L48 16Z" fill="#E7D5B4"/><rect x="20" y="28" width="24" height="16" rx="2" fill="#fff" opacity=".9"/><path d="M26 40Q32 30 38 40" stroke="#C9A24A" stroke-width="2" fill="none"/>${hi('M19 18V50', 1.6)}`;
    case 'box': return `${sh(16)}<path d="M16 18H48V52H16Z" fill="#fff" stroke="#D5DBE0"/><path d="M16 18L22 12H54L48 18Z" fill="#F1F3F4"/><path d="M48 18L54 12V46L48 52Z" fill="#D5DBE0"/><rect x="16" y="28" width="32" height="12" fill="${s}"/>`;
    case 'bread': return `<defs>${rg('a', mixc(s, '#fff', .3), s, mixc(s, '#000', .16))}</defs>${sh(24)}${x === 'baton' ? `<path d="M6 36Q6 24 20 24H46Q58 24 58 36Q58 46 46 46H20Q6 46 6 36Z" fill="url(#a${id})"/>${[0, 1, 2, 3].map(i => `<path d="M${18 + i * 9} 27l6 16" stroke="${mixc(s, '#fff', .45)}" stroke-width="2.4" stroke-linecap="round"/>`).join('')}`
      : `<path d="M8 50V30Q8 18 32 18Q56 18 56 30V50Z" fill="url(#a${id})"/><path d="M36 50V30Q36 22 46 22" stroke="${mixc(s, '#000', .3)}" stroke-width="1" fill="none"/><path d="M40 50V32Q40 26 48 26H56V50Z" fill="${c}"/>${[...Array(x === 'seeds' ? 14 : 5)].map((_, i) => `<ellipse cx="${(14 + R(i, 0, 36)).toFixed(1)}" cy="${(22 + R(i + 3, 0, 8)).toFixed(1)}" rx="1.4" ry=".8" fill="#E9D3A6"/>`).join('')}`}${hi('M14 28Q20 22 30 21', 2)}`;
    case 'lavash': return `${sh(24)}<path d="M8 26Q20 20 34 24Q48 20 58 28L54 48Q40 44 30 48Q18 52 10 46Z" fill="${c}" stroke="${d}" stroke-width=".8"/><path d="M8 26Q24 34 58 28" stroke="${d}" stroke-width="1" fill="none"/>${[...Array(14)].map((_, i) => `<circle cx="${(14 + R(i, 0, 38)).toFixed(1)}" cy="${(30 + R(i + 3, 0, 14)).toFixed(1)}" r="${R(i + 6, 1, 2.4).toFixed(1)}" fill="#C9A06A" opacity=".55"/>`).join('')}`;
    case 'crisp': return `${sh(20)}${[0, 1, 2].map(i => `<rect x="${12 + i * 4}" y="${18 + i * 6}" width="34" height="22" rx="2" fill="${[d, c, l][i]}" stroke="${d}" stroke-width=".6"/>`).join('')}${[...Array(10)].map((_, i) => `<circle cx="${22 + (i % 5) * 6}" cy="${36 + Math.floor(i / 5) * 6}" r=".9" fill="${d}"/>`).join('')}`;
    case 'nut': return `<defs>${rg('a', l, c, d)}</defs>${sh(18)}<circle cx="32" cy="34" r="19" fill="url(#a${id})"/><path d="M32 15V53" stroke="${d}" stroke-width="1.6"/>${[...Array(8)].map((_, i) => `<path d="M${i < 4 ? 30 : 34} ${20 + (i % 4) * 9}q${i < 4 ? -8 : 8} 2 ${i < 4 ? -12 : 12} -2" stroke="${d}" stroke-width="1.1" fill="none" opacity=".7"/>`).join('')}${hi('M20 26Q22 20 28 18')}`;
    case 'mushroom': return `<defs>${rg('a', '#FFFFFF', c, d)}</defs>${sh(20)}<path d="M26 34H38L40 54H24Z" fill="#F6EFE4" stroke="${d}" stroke-width=".8"/><path d="M8 36Q8 14 32 14Q56 14 56 36Q44 32 32 33Q20 32 8 36Z" fill="url(#a${id})"/>${hi('M16 28Q20 20 30 18', 2.4)}`;
    case 'shrimp': return `${sh(18)}<g transform="translate(32 34) scale(3.2)">${GEN.shrimp(P, 1, 3)}</g>`;
    case 'squid': return `<defs>${lg('a', l, c, d, 0)}</defs>${sh(22)}<path d="M10 30L18 24H46Q54 24 56 32Q54 40 46 40H18L10 34Z" fill="url(#a${id})"/><path d="M10 30L4 26V38L10 34Z" fill="${d}"/><circle cx="46" cy="50" r="6" fill="none" stroke="${c}" stroke-width="3"/><circle cx="32" cy="52" r="5" fill="none" stroke="${d}" stroke-width="2.6"/>${hi('M20 28H44', 1.6)}`;
    case 'crab': return `${sh(22)}${[0, 1, 2].map(i => `<g transform="translate(${12 + i * 3} ${20 + i * 9}) rotate(-6)"><rect width="40" height="9" rx="2" fill="#fff" stroke="#E0DCD6"/><rect width="40" height="4.4" rx="2" fill="${s}"/></g>`).join('')}`;
    case 'pods': return `${sh(22)}${[0, 1, 2, 3].map(i => `<path d="M${10 + i * 3} ${22 + i * 7}Q32 ${16 + i * 7} ${54 - i * 2} ${26 + i * 7}" stroke="${[c, d, l, c][i]}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}`;
    case 'water': return '';
    case 'salt': return '';
    case 'peppercorn': return `${sh(16)}${[...Array(16)].map((_, i) => `<circle cx="${(32 + R(i, -12, 12)).toFixed(1)}" cy="${(42 + R(i + 3, -6, 6)).toFixed(1)}" r="2.6" fill="${c}"/><circle cx="${(31.2 + R(i, -12, 12)).toFixed(1)}" cy="${(41.2 + R(i + 3, -6, 6)).toFixed(1)}" r=".8" fill="${l}"/>`).join('')}`;
    case 'bay': return `${sh(18)}${[[-8, -20], [8, 18]].map(([a, r]) => `<g transform="translate(${32 + a} 34) rotate(${r})"><path d="M0 -20Q11 -6 0 20Q-11 -6 0 -20Z" fill="${a < 0 ? c : d}"/><path d="M0 -18V18" stroke="${l}" stroke-width="1.2"/></g>`).join('')}`;
  } return '' }
function mixc(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), Bc = p(b); return '#' + A.map((v, i) => Math.round(v + (Bc[i] - v) * k).toString(16).padStart(2, '0')).join('') }
function shade2(c) { return mixc(c, '#000000', .32) }

/* ---------- новые сцены: замочить, обсушить, разбить яйцо, добавить/вынуть, откинуть, намазать, «столешница + продукт» ---------- */
const nameOf = k => (F[k] && F[k].n) || (CAT[k] && CAT[k][0]) || '';
const names = list => { const n = [...new Set(list.map(nameOf).filter(Boolean))]; return n.length > 1 ? n.slice(0, -1).join(', ') + ' и ' + n[n.length - 1] : n[0] || '' };
const artAt = (k, x, y, s) => icon(k).replace('<svg ', `<svg x="${x}" y="${y}" width="${s}" height="${s}" `);
const solid = k => !['drop', 'powder'].includes(KIND[k]);
// кусочки продукта в посуде (без бульона): много мелких для круп, несколько крупных для мяса и яиц
function countOf(k) { const kd = KIND[k]; return ['grain', 'rice', 'seed', 'lentil', 'pea', 'flake'].includes(kd) ? 120 : kd === 'tube' ? 40 : kd === 'egg' ? 3 : ['ball', 'chunk', 'nut'].includes(kd) ? 7 : kd === 'crumb' ? 40 : kd === 'berry' ? 24 : 12 }
function scaleOf(k) { const kd = KIND[k]; return ['grain', 'rice', 'seed', 'lentil', 'pea', 'flake'].includes(kd) ? .95 : kd === 'egg' ? 1.5 : ['ball', 'chunk'].includes(kd) ? 1.25 : 1 }
function fillPieces(p, id, c, items, total) { const list = []; let s = 0; const it = items.filter(solid);
  it.forEach(k => { const n = total ? Math.ceil(total / it.length) : Math.ceil(countOf(k) / Math.max(1, it.length * .7)); for (let i = 0; i < n; i++, s++) { const a = R(s, 0, 6.283), r = Math.sqrt(R(s + 40, .01, .92)) * c.r, w = E('g', {}, p); top(w, k, KIND[k], scaleOf(k), s, id); list.push({ w, x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r, s, a, r }) } });
  list.forEach(q => q.w.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`)); return list }

function show(items = []) { const { id, svg } = scene(['towel']); defs(svg, metalDefs(id)); boardTop(svg, id, 60, 30, 232, 120); decor(svg, id, ['dill']);
  const it = [...new Set(items)].slice(0, 3), gs = it.map((k, i) => { const g = E('g', {}, svg), sz = it.length === 1 ? 104 : it.length === 2 ? 86 : 72; H(g, shade(id, `<ellipse cx="${sz / 2}" cy="${sz * .82}" rx="${sz * .34}" ry="${sz * .08}"/>`, 2, 3, .25) + artAt(k, 0, 0, sz)); return { g, sz, x: 176 - (it.length * (sz + 6)) / 2 + i * (sz + 6), y: 90 - sz / 2 } });
  const sweep = E('rect', { x: -60, y: 20, width: 40, height: 150, fill: '#fff', opacity: .0, transform: 'skewX(-18)' }, svg), T = 4;
  function frame(t) { t %= T; gs.forEach((q, i) => { const b = Math.sin((t / T) * 2 * Math.PI + i * 1.3) * 1.6; q.g.setAttribute('transform', `translate(${q.x.toFixed(1)} ${(q.y + b).toFixed(1)})`) });
    const k = (t % T) / T; sweep.setAttribute('x', (40 + k * 300).toFixed(0)); sweep.setAttribute('opacity', (Math.sin(k * Math.PI) * .12).toFixed(2)) }
  return sc0(id, svg, frame, T, 'Подготовить', names(it), null) }

function soak(items = []) { const { id, svg } = scene(['towel']); defs(svg, metalDefs(id));
  const b = bowlTop(svg, id, 180, 90, 74), wat = E('circle', { cx: b.cx, cy: b.cy, r: b.r, fill: '#9FD6F2', opacity: .25 }, b.inner), P = fillPieces(b.inner, id, { cx: b.cx, cy: b.cy, r: b.r * .85 }, items.length ? items : []);
  const bub = [...Array(14)].map((_, i) => E('circle', { r: R(i, 1, 2.4), fill: '#fff', opacity: 0 }, b.inner)), ring = E('circle', { cx: 300, cy: 34, r: 14, fill: 'none', stroke: '#10B981', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': 88, transform: 'rotate(-90 300 34)' }, svg), T = 5;
  function frame(t) { t %= T; const k = clamp(t / (T * .8)); wat.setAttribute('opacity', (.25 + k * .4).toFixed(2)); P.forEach(q => q.w.setAttribute('transform', `translate(${(q.x + wob(t * .4, q.s)).toFixed(1)} ${(q.y + wob(t * .5, q.s + 2)).toFixed(1)}) scale(${(1 + k * .1).toFixed(3)})`));
    bub.forEach((e, i) => { const q = ((t * .5 + i / bub.length) % 1); e.setAttribute('cx', (b.cx + Math.cos(i * 2.2) * R(i, 8, b.r * .8)).toFixed(1)); e.setAttribute('cy', (b.cy + Math.sin(i * 2.2) * R(i, 8, b.r * .8) - q * 6).toFixed(1)); e.setAttribute('opacity', (Math.sin(q * Math.PI) * .6).toFixed(2)) });
    ring.setAttribute('stroke-dashoffset', (88 * (1 - t / T)).toFixed(1)) }
  return sc0(id, svg, frame, T, 'Замочить', names(items) + ' в воде', null) }

function dry(f) { const { id, svg } = scene(); defs(svg, metalDefs(id)); boardTop(svg, id); decor(svg, id, ['salt']);
  const it = f ? [f] : [], prod = E('g', {}, svg); if (f) { if (solid(f) && ['chunk', 'leaf', 'speck', 'floret', 'berry', 'shrimp', 'ring'].includes(KIND[f])) fillPieces(prod, id, { cx: 170, cy: 90, r: 44 }, it, 9); else H(prod, artAt(f, 118, 38, 104)) }
  const tw = E('g', {}, svg); H(tw, shade(id, '<rect x="-46" y="-34" width="92" height="68" rx="6"/>', 4, 6, .25) + `<rect x="-46" y="-34" width="92" height="68" rx="6" fill="#FFFFFF"/>${[...Array(40)].map((_, i) => `<circle cx="${-40 + (i % 8) * 11.4}" cy="${-28 + Math.floor(i / 8) * 13}" r="1.1" fill="#E5E9EC"/>`).join('')}`);
  const wet = [...Array(6)].map((_, i) => E('circle', { r: R(i, 5, 10), fill: '#D9E8F2', opacity: 0 }, tw)), T = 3.2;
  function frame(t, emit) { t %= T; const up = hit(t, 1.05); const io2 = (1 - eOut(clamp(t / .35))) + eIn(clamp((t - (T - .4)) / .4)); tw.setAttribute('transform', `translate(170 ${(88 - up * 4 - io2 * 150).toFixed(1)}) scale(${(1 + up * .06).toFixed(3)}) rotate(-6)`);   // полотенце кладут сверху и убирают вверх
    wet.forEach((e, i) => { e.setAttribute('cx', R(i, -30, 30).toFixed(1)); e.setAttribute('cy', R(i + 4, -20, 20).toFixed(1)); e.setAttribute('opacity', t > .4 + i * .3 && t < T - .4 ? .7 : 0) }) }
  return sc0(id, svg, frame, T, 'Обсушить', names(it) + ' бумажным полотенцем', null) }

function crack(vessel = 'bowl') { const { id, svg } = scene(['towel']); defs(svg, metalDefs(id));
  const v = vessel === 'pan' ? panTop(svg, id, 160, 90, 74) : bowlTop(svg, id, 170, 92, 72), lay = E('g', {}, svg);
  const white = E('path', { fill: '#FFFFFF', opacity: 0, stroke: '#EDE8DC', 'stroke-width': .8 }, lay), yolk = E('circle', { r: 0, fill: '#F6B92E' }, lay), yh = E('circle', { r: 0, fill: '#FFE08A' }, lay);
  const egg = E('g', {}, svg), L = E('g', {}, egg), Rr = E('g', {}, egg);
  defs(svg, `<radialGradient id="sh${id}" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#FFFAF2"/><stop offset=".6" stop-color="#F1DCC0"/><stop offset="1" stop-color="#D9BE9A"/></radialGradient>`);
  H(L, `<path d="M0 -15A12 15 0 0 0 0 15L-2 6L2 0L-2 -6Z" fill="url(#sh${id})"/>`); H(Rr, `<path d="M0 -15A12 15 0 0 1 0 15L-2 6L2 0L-2 -6Z" fill="url(#sh${id})"/>`);
  const T = 3.6, cx = v.cx - 6, cy = v.cy - 4;
  function frame(t, emit) { t %= T; const k = clamp((t - .5) / .4), sp = clamp((t - .9) / 1.2), f = t > T - .4 ? (T - t) / .4 : 1;
    const gone = eIn(clamp((t - 1.05) / .6)); egg.setAttribute('transform', `translate(${cx} ${(lerp(-24, cy - 12, eOut(clamp(t / .5))) - gone * (cy + 30)).toFixed(1)}) scale(${(1.2 - clamp(t / .5) * .2).toFixed(3)})`); egg.setAttribute('opacity', t < 1.7 ? 1 : 0);   // скорлупа приходит сверху и уходит вверх (в руке)
    L.setAttribute('transform', `translate(${(-k * 14).toFixed(1)} 0) rotate(${(-k * 30).toFixed(1)})`); Rr.setAttribute('transform', `translate(${(k * 14).toFixed(1)} 0) rotate(${(k * 30).toFixed(1)})`);
    if (k > 0 && k < .1 && frame._c !== Math.floor(t / T)) { frame._c = Math.floor(t / T); emit && emit('crack') }
    const r = eOut(sp) * 34; white.setAttribute('d', `M${cx - r} ${cy}Q${cx - r} ${cy - r * .9} ${cx} ${cy - r * .85}Q${cx + r * 1.1} ${cy - r * .8} ${cx + r} ${cy + r * .1}Q${cx + r * .8} ${cy + r} ${cx} ${cy + r * .9}Q${cx - r * 1.05} ${cy + r * .8} ${cx - r} ${cy}Z`); white.setAttribute('opacity', (sp > 0 ? .97 * f : 0).toFixed(2));
    yolk.setAttribute('cx', cx + 2); yolk.setAttribute('cy', cy); yolk.setAttribute('r', (sp > 0 ? 9 * f : 0).toFixed(1)); yh.setAttribute('cx', cx - 1); yh.setAttribute('cy', cy - 3); yh.setAttribute('r', (sp > 0 ? 3 * f : 0).toFixed(1)); v.shine && v.shine(t) }
  return sc0(id, svg, frame, T, 'Разбить яйцо', vessel === 'pan' ? 'на сковороду' : 'в миску', 'chop') }

function vesselOf(svg, id, vessel) { return vessel === 'pan' ? panTop(svg, id, 160, 90, 76) : vessel === 'bowl' ? bowlTop(svg, id, 172, 90, 76) : (() => { const p = potTop(svg, id, 172, 90, 76); E('circle', { cx: p.cx, cy: p.cy, r: p.r, fill: '#A9DCF5', opacity: .55 }, p.inner); return p })() }
// добавить: кусочки падают сверху (крупнее и с дальней тенью — ближе к камере) и ложатся; reverse — вынуть: поднимаются, с них капает
function add(items = [], vessel = 'pot', reverse = false) { const { id, svg } = scene(['towel']); defs(svg, metalDefs(id));
  const v = vesselOf(svg, id, vessel), c = { cx: v.cx, cy: v.cy, r: v.r * .8 }, it = items.filter(solid), lay = E('g', {}, svg), drops = [];
  const P = it.length ? fillPieces(lay, id, c, it, Math.min(26, it.reduce((a, k) => a + Math.min(countOf(k), 14), 0))) : [];
  P.forEach(q => { q.d = R(q.s + 11, 0, .9); q.oy = -(q.y + 24) - R(q.s, 0, 30) });   // кусочки входят сверху из-за кадра (из рук), а не из воздуха
  if (!it.length && items.length) { const liq = items[0]; E('circle', { cx: v.cx, cy: v.cy, r: v.r * .6, fill: F[liq] ? F[liq].c : '#fff', opacity: .0, class: 'lq' }, v.inner || svg) }
  for (let i = 0; i < 6; i++) drops.push(E('circle', { r: 1.6, fill: '#E6F6FF', opacity: 0 }, svg));
  const rg = vessel !== 'pan' ? rings(v.inner || svg, 8) : null, sz = vessel === 'pan' ? [...Array(10)].map(() => E('circle', { r: 1.2, fill: '#FFF6D6', opacity: 0 }, svg)) : [];
  const T = 3.6;
  function frame(t, emit) { t %= T; v.shine && v.shine(t);
    P.forEach(q => { let k = clamp((t - q.d) / .7); if (reverse) k = 1 - clamp((t - .4 - q.d) / .9); const e = reverse ? eIO(k) : eIn(k), land = !reverse && k >= 1, bob = land ? (vessel === 'pot' ? Math.sin(t * 2.2 + q.s) * 1.2 : 0) : 0, y = q.y + (1 - e) * q.oy + bob, s = 1 + (1 - e) * .5;   // падает с ускорением, в кастрюле покачивается на воде — стал частью содержимого
      if (!reverse && k >= 1 && q._r !== Math.floor(t / T)) { q._r = Math.floor(t / T); if (rg) rg.at(q.x, q.y, t, .5); else q.sp = t }
      q.w.setAttribute('transform', `translate(${q.x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`); q.w.setAttribute('opacity', (reverse ? (k > .05 ? 1 : 0) : (t > T - .35 ? (T - t) / .35 : k > 0 ? 1 : 0)).toFixed(2));
      if (!reverse && k > .95 && q._l !== Math.floor(t / T) && q.s % 4 === 0) { q._l = Math.floor(t / T); emit && emit(vessel === 'pan' ? 'sizzle' : 'bubble') } });
    rg && rg.frame(t); sz.forEach((e, i) => { const q = P[i % Math.max(1, P.length)]; if (!q || q.sp == null) { e.setAttribute('opacity', 0); return } const k = clamp((t - q.sp) / .5), a = i * 2.4; e.setAttribute('cx', (q.x + Math.cos(a) * (4 + k * 8)).toFixed(1)); e.setAttribute('cy', (q.y + Math.sin(a) * (4 + k * 8)).toFixed(1)); e.setAttribute('opacity', (k > 0 && k < 1 ? (1 - k) * .9 : 0).toFixed(2)) });   // на сковороде — брызги масла
    if (t < .05) P.forEach(q => q.sp = null);
    const lq = svg.querySelector('.lq'); if (lq) lq.setAttribute('opacity', (clamp(t / 1.5) * .8 * (t > T - .35 ? (T - t) / .35 : 1)).toFixed(2));
    drops.forEach((e, i) => { const q = ((t * 1.3 + i / 6) % 1); e.setAttribute('cx', (v.cx - 20 + i * 8).toFixed(1)); e.setAttribute('cy', (v.cy - 40 + q * 30).toFixed(1)); e.setAttribute('opacity', reverse && t > .8 ? (1 - q).toFixed(2) : 0) }) }
  return sc0(id, svg, frame, T, reverse ? 'Вынуть' : 'Добавить', names(items), vessel === 'pan' ? 'sizzle' : 'bubble') }

function drain(items = []) { const { id, svg } = scene(['towel']); defs(svg, metalDefs(id));
  const b = bowlTop(svg, id, 176, 88, 74); H(b.inner, [...Array(60)].map((_, i) => `<circle cx="${(b.cx + Math.cos(i * 2.4) * Math.sqrt(i / 60) * b.r).toFixed(1)}" cy="${(b.cy + Math.sin(i * 2.4) * Math.sqrt(i / 60) * b.r).toFixed(1)}" r="1.3" fill="#C9D0D6"/>`).join(''));
  const P = fillPieces(b.inner, id, { cx: b.cx, cy: b.cy, r: b.r * .82 }, items), drops = [...Array(16)].map(() => E('circle', { r: 1.8, fill: '#9FD6F2', opacity: 0 }, svg)), T = 3;
  function frame(t, emit) { t %= T; const sh = Math.sin(t * 22) * (t % 1.5 < .5 ? 1.6 : 0); P.forEach(q => q.w.setAttribute('transform', `translate(${(q.x + sh).toFixed(1)} ${(q.y + sh * .4).toFixed(1)})`));
    drops.forEach((e, i) => { const q = ((t * .9 + i / drops.length) % 1), a = i * .39; e.setAttribute('cx', (b.cx + Math.cos(a) * (b.r + 8 + q * 16)).toFixed(1)); e.setAttribute('cy', (b.cy + Math.sin(a) * (b.r + 8 + q * 16) + q * 8).toFixed(1)); e.setAttribute('opacity', ((1 - q) * .8).toFixed(2)) }); emit && emit('pour', .3) }
  return sc0(id, svg, frame, T, 'Откинуть', names(items) + ' — дать стечь воде', 'pour') }

function spread(items = []) { const { id, svg } = scene(); defs(svg, metalDefs(id)); boardTop(svg, id); decor(svg, id, ['dill']); const BR = /^(hleb|hleb_zern|baton|hlebcy|lavash)$/, k = items.find(x => F[x] && !BR.test(x)) || 'maslo_sliv', P = F[k] || { c: '#FBE7A6', l: '#FFF6D6', d: '#E2C470' };
  H(svg, shade(id, '<rect x="110" y="40" width="120" height="100" rx="18"/>', 4, 6, .3) + `<rect x="110" y="40" width="120" height="100" rx="18" fill="#B9773E"/><rect x="117" y="47" width="106" height="86" rx="13" fill="#F1D7A6"/>${[...Array(30)].map((_, i) => `<circle cx="${(122 + R(i, 0, 96)).toFixed(1)}" cy="${(52 + R(i + 3, 0, 76)).toFixed(1)}" r="${R(i + 5, .6, 1.4).toFixed(1)}" fill="#D9B07C"/>`).join('')}`);
  defs(svg, `<clipPath id="sp${id}"><rect x="117" y="47" width="106" height="86" rx="13"/></clipPath>`); const lay = E('rect', { x: 117, y: 47, width: 0, height: 86, fill: P.c, opacity: .92, 'clip-path': `url(#sp${id})` }, svg);
  const kn = E('g', {}, svg); H(kn, shade(id, '<rect x="-34" y="-6" width="68" height="12" rx="6"/>', 4, 6, .25) + `<rect x="-34" y="-6" width="52" height="12" rx="6" fill="url(#bld${id})"/><rect x="18" y="-4" width="40" height="8" rx="4" fill="url(#khd${id})"/>`), T = 3.4;
  function frame(t) { t %= T; const k = clamp(t / (T * .8)), f = t > T - .3 ? (T - t) / .3 : 1; lay.setAttribute('width', (106 * eOut(k)).toFixed(1)); lay.setAttribute('opacity', (.92 * f).toFixed(2)); kn.setAttribute('transform', `translate(${(130 + k * 70).toFixed(1)} ${(90 + Math.sin(t * 7) * 26).toFixed(1)}) rotate(${(Math.sin(t * 7) * 10).toFixed(1)})`) }
  return sc0(id, svg, frame, T, 'Намазать', names([k]), null) }

/* ---------- привязка шага: действие — по первому глаголу шага, продукт — только названный в этом шаге
   (для «варите под крышкой» без слов о продукте — то, что положили в посуду на прошлых шагах этого же блюда) ---------- */
const TITLE = { cut: 'Нарезать', tear: 'Разобрать руками', grate: 'Натереть', peel: 'Очистить', rinse: 'Промыть', soak: 'Замочить', dry: 'Обсушить', crack: 'Разбить яйцо', whisk: 'Взбить', pound: 'Отбить', knead: 'Вымесить',
  roll: 'Раскатать', form: 'Сформовать', coat: 'Обвалять', spread: 'Намазать', oil: 'Разогреть масло', bringBoil: 'Довести до кипения', boil: 'Варить', fry: 'Обжарить', simmer: 'Тушить', bake: 'Запекать', batter: 'Налить тесто',
  pour: 'Залить', salt: 'Посолить', pepper: 'Поперчить', add: 'Добавить', stir: 'Перемешать', drain: 'Откинуть', plateUp: 'Подать', lift: 'Вынуть', rest: 'Дать постоять', show: 'Подготовить' };
const LIQ = new Set(['voda', 'moloko', 'kefir', 'ryazhenka', 'yogurt', 'smetana', 'smetana20', 'maslo_rast', 'maslo_ol', 'soy_sous', 'ketchup', 'tomat', 'uksus', 'lim_sok', 'mayonez', 'myod']);
const GRAINY = new Set(['grain', 'rice', 'seed', 'lentil', 'pea', 'flake', 'tube', 'bean', 'powder']);
function vesselIn(t, act) { return /сковород|сотейник|противн/.test(t) && !/кастрюл|ковш/.test(t) ? 'pan' : /миск|салатник|тарелк|контейнер|банк/.test(t) && !/кастрюл|ковш|сковород/.test(t) ? 'bowl' : ['fry', 'oil', 'batter'].includes(act) ? 'pan' : 'pot' }
function stepParts(text, ing) { const t = text.toLowerCase(), vs = verbs(t), ps = prodsIn(t, ing); return { t, vs, ps } }
function forStep(text, ing, prev = []) {
  const { t, vs, ps } = stepParts(text, ing); let v = vs[0] || null;
  if (v && vs[1] && ['rest', 'show', 'simmer'].includes(v.a) && !/[.;]/.test(t.slice(v.at, vs[1].at)) && !['rest', 'show', 'simmer', 'salt', 'pepper'].includes(vs[1].a) && /накройте пл|накройте плёнк|дайте ост|остудите|разделите|отложите|проверьте/.test(t.slice(v.at, v.at + 16))) { vs.shift(); v = vs[0] }
  let act = v ? v.a : /сковород|сотейник|жар/.test(t) ? 'fry' : /духовк/.test(t) ? 'bake' : /кастрюл|ковш|вар/.test(t) ? 'boil' : 'show';
  const after = v ? t.slice(v.at, v.at + 70) : '', end = v ? (vs[1] ? vs[1].at : t.length) : t.length, sStart = v ? Math.max(0, t.lastIndexOf('.', v.at - 2) + 1) : 0;
  // смысл глагола по соседним словам
  if (v && /разогрейте|включите|поставьте|прогрейте/.test(v.w) && /духовк/.test(after)) act = 'bake';
  else if (act === 'oil' && !/масл|сковород|сотейник|вок/.test(after)) act = /кастрюл|ковш|молок|вод|суп|бульон/.test(after) ? 'boil' : 'fry';
  else if (act === 'bringBoil' && /доведите/.test(v.w) && !/кипен|кипит|закип/.test(after)) act = 'simmer';
  else if (act === 'simmer' && /накройте/.test(v.w) && /плёнк|пленк|полотенц|тарелк|фольг/.test(after)) act = 'rest';
  else if (act === 'rest' && /дайте/.test(v.w) && /закип/.test(after)) act = 'bringBoil';
  else if (act === 'rest' && /дайте/.test(v.w) && /стечь|стекл/.test(after)) act = 'drain';
  else if (act === 'add' && /на тарелк|на блюд|в тарелк|на хлеб|на лаваш|на лист салат|порци/.test(after)) act = 'plateUp';
  else if (act === 'plateUp' && /выложите|разложите/.test(v.w) && /сковород|кастрюл|в соус|в бульон|в миск|в форм|противен|в ковш|сотейник/.test(after)) act = /противен|в форм/.test(after) ? 'bake' : 'add';
  else if (act === 'pour' && /полейте|сбрызните/.test(v.w) && /подав|тарелк|сверху|перед подачей/.test(t)) act = 'plateUp';
  else if (v && act === 'show' && /готовьте/.test(v.w)) act = /сковород|жар/.test(t) ? 'fry' : /духовк/.test(t) ? 'bake' : 'boil';
  else if (v && act === 'show' && /сделайте|разделите/.test(v.w) && /лепёшк|лепешк|котлет|шарик|колбаск|углублен/.test(after)) act = 'form';
  else if (v && act === 'show' && /поставьте/.test(v.w) && /в кастрюл|в сковород|в сотейник|в ковш|на сковород/.test(after)) act = 'add';
  else if (v && act === 'show' && /поставьте/.test(v.w)) act = /огонь|плит/.test(after) ? 'bringBoil' : /холодильник/.test(after) ? 'rest' : 'show';
  // продукты шага: сначала в части предложения с этим глаголом, иначе — перед глаголом в том же предложении, иначе — во всём шаге
  const food = ps.filter(x => !FREE.has(x.k)), cut0 = v ? Math.max(sStart, t.lastIndexOf(',', v.at), t.lastIndexOf(':', v.at), vs.filter(x => x.at < v.at).map(x => x.at + x.w.length).pop() || 0) : 0;
  let end2 = end; if (v && vs[1] && !/[.;]/.test(t.slice(v.at, vs[1].at))) { const c = t.lastIndexOf(',', vs[1].at); if (c > v.at && food.some(x => x.at > c && x.at < vs[1].at)) end2 = c }
  const pre = v ? food.filter(x => x.at >= cut0 && x.at < v.at) : [];
  let own = v ? (pre.length ? pre : food.filter(x => x.at >= v.at && x.at < end2)) : food;
  if (v && !own.length) own = food.filter(x => x.at >= sStart && x.at < v.at); if (!own.length && !VESSEL_ACT.has(act) && !['fry', 'stir', 'simmer', 'bake', 'drain', 'plateUp', 'lift'].includes(act)) own = food;
  let items = [...new Set(own.map(x => x.k))], src = items.length ? 'step' : 'none';
  const waterOnly = ['bringBoil', 'pour'].includes(act) && v && /(?<![а-яё])вод/.test(t.slice(v.at, end));
  if (!items.length && !waterOnly) { for (let i = prev.length - 1; i >= 0 && !items.length; i--) { const pf = prodsIn(prev[i].toLowerCase(), ing).filter(x => !FREE.has(x.k)); items = [...new Set(pf.map(x => x.k))].slice(0, 3) } if (items.length) src = 'carry' }
  if (items.length && !items.some(solid) && ['plateUp', 'add', 'fry', 'stir', 'bake', 'spread'].includes(act)) { for (let i = prev.length - 1; i >= 0; i--) { const pf = prodsIn(prev[i].toLowerCase(), ing).filter(x => !FREE.has(x.k) && solid(x.k)).map(x => x.k); if (pf.length) { items = [...new Set([...pf.slice(0, 2), ...items])]; src = 'step+carry'; break } } }
  const liq = (v ? ps.filter(x => x.at >= v.at && x.at < end) : ps).map(x => x.k).find(k => LIQ.has(k)), vessel = vesselIn(t, act);
  const solidItems = items.filter(k => !(['pour'].includes(act) && LIQ.has(k)));
  const POT = /кастрюл|ковш|вод|бульон|суп|каш|соус/.test(t) || !items.some(solid), one = items[0], forms = /тефтел|шарик|фрикадел|скатайте|ёжик|ежик/.test(t);
  const make = { cut: () => one && solid(one) ? cut(one) : show(items), tear: () => one && solid(one) ? cut(one) : show(items), /* «разберите на соцветия» — ножом, продукт так же уменьшается */ grate: () => one ? grate(one) : show(items), peel: () => one && !GRAINY.has(KIND[one]) && solid(one) ? peel(one) : show(items),
    rinse: () => rinse(one), soak: () => soak(items), dry: () => dry(one), crack: () => crack(vessel === 'pan' ? 'pan' : 'bowl'), whisk: () => whisk(items), pound: () => pound(one), knead: () => one && KIND[one] === 'ball' ? form(one, forms) : roll(),
    roll: () => roll(), form: () => form(items.find(k => KIND[k] === 'ball') || one, forms), coat: () => stir(items, 'bowl'), spread: () => spread(items), oil: () => oil(items.find(k => /^maslo/.test(k))),
    bringBoil: () => bringBoil(items), boil: () => boil(items), simmer: () => simmer(items), salt: () => POT ? salt(items) : show(items), pepper: () => POT ? pepper(items) : show(items), rest: () => rest(items), fry: () => fry(items), stir: () => stir(items, vessel === 'pan' ? 'pan' : 'bowl'),
    bake: () => bake(items), batter: () => batter(), pour: () => pour(liq || 'voda', solidItems), add: () => add(items, vessel), lift: () => add(items, vessel, true), drain: () => drain(items), plateUp: () => plateUp(items), show: () => show(items) }[act];
  const wrap = () => { const sc = make(); sc.title = TITLE[act]; sc.sub = names(items) || sc.sub; sc.items = items; return sc };
  return { act, verb: v ? v.w : null, prods: items, src, liq: liq || null, vessel, prod: one || null, make: wrap } }

/* ---------- рисунок продукта для плиток: каталог, старые ручные рисунки — для моркови, лука, курицы, гречки, масла, воды, соли ---------- */
const OLD_IC = { morkov: 'morkov', luk: 'luk', kur_grudka: 'kur', indeyka: 'kur', kur_bedro: 'kur', grechka: 'grechka', maslo_rast: 'maslo', voda: 'voda', sol: 'sol', kur: 'kur', maslo: 'maslo' };
function icon(k) { if (OLD_IC[k]) return iconOld(OLD_IC[k]); const b = iconGen(k); return b ? `<svg viewBox="0 0 64 64" aria-hidden="true">${b}</svg>` : '' }
// рисунок по названию (вода, соль, лавровый лист…): тот же поиск по основам слов, что и в шагах
const ALL = Object.keys(CAT).map(k => [k]);
function iconFor(id, name) { if (id && (CAT[id] || OLD_IC[id])) return icon(id); const p = prodsIn((name || '').toLowerCase(), ALL)[0]; return p ? icon(p.k) : '' }

function iconOld(k) { const id = ++UID, sh = `<ellipse cx="32" cy="56" rx="20" ry="4" fill="#000" opacity=".12"/>`, w = b => `<svg viewBox="0 0 64 64" aria-hidden="true">${b}</svg>`;
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

/* ---------- звук: только настоящие записи (BigSoundBank CC0, Pixabay — docs/zvuki-istochniki.md), без синтеза.
   Громкость выровнена в файлах (tools/zvuki/build.py): удары и действия ≈ −20 dBFS, фон (шкворчание, кипение, тушение, духовка) на 6 дБ тише;
   здесь у всех одна громкость G. Циклы играются по окну [0,1 с; 0,1 с + L] — стык без щелчка. Звук идёт в момент события анимации. ---------- */
let AC = null, ON = false;
function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC }
const G = .8, LOOPL = { terka: 3, melnica: 2.4, skalka: 1.7, venchik: 3, voda: 3, shkvor: 3, kip: 3, bulk: 3, gul: 3 };
const SAMP = {}, SND = ['nozh-1', 'nozh-2', 'nozh-3', 'nozh-4', 'hrust-1', 'hrust-2', 'hrust-3', 'luk-1', 'luk-2', 'luk-3', 'kapusta-1', 'kapusta-2', 'kapusta-3', 'chistka', 'sol', 'kryshka',
  'lozhka-1', 'lozhka-2', 'lozhka-3', 'zvonok', ...Object.keys(LOOPL)], SLOOP = {};
function loadSamples() { SND.forEach(n => { if (SAMP[n]) return; SAMP[n] = 'loading'; fetch(BASE + 'snd/' + n + '.mp3' + SQ).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => ac().decodeAudioData(b)).then(buf => SAMP[n] = buf).catch(() => delete SAMP[n]) }) }
function play(n, vol = G, delay = 0, rate = 1) { const b = SAMP[n]; if (!b || b === 'loading') return false; if (window.__snd) window.__snd.push(n); const a = ac(), s = a.createBufferSource(), g = a.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g); g.connect(a.destination); s.start(a.currentTime + delay); return true }
// цикл: мягкий вход 0,3 с; keep — сколько секунд держать без новых событий анимации (мельница крутится, скалка ходит), потом мягко гаснет
function sloop(n, vol = G, keep = 0, rate = 1) { const L = LOOPL[n], b = SAMP[n]; let l = SLOOP[n];
  if (!l) { if (!b || b === 'loading') return false; const a = ac(), s = a.createBufferSource(), g = a.createGain(); s.buffer = b; s.loop = true; s.loopStart = .1; s.loopEnd = .1 + L; s.playbackRate.value = rate;
    g.gain.value = 0; g.gain.linearRampToValueAtTime(vol, a.currentTime + .3); s.connect(g); g.connect(a.destination); s.start(0, .1 + Math.random() * L); l = SLOOP[n] = { s, g }; if (window.__snd) window.__snd.push(n) }
  clearTimeout(l.t); if (keep) l.t = setTimeout(() => sunloop(n), keep * 1000); return true }
function sunloop(n) { const l = SLOOP[n]; if (!l) return; clearTimeout(l.t); const a = ac(); l.g.gain.cancelScheduledValues(a.currentTime); l.g.gain.setValueAtTime(l.g.gain.value, a.currentTime); l.g.gain.linearRampToValueAtTime(0, a.currentTime + .45); l.s.stop(a.currentTime + .5); delete SLOOP[n] }
// смена шага: фон не обрывается — если новая сцена играет тот же цикл, он продолжается без шва; иначе мягко гаснет за 0,5 с, пока входит новый
// iPhone с переключателем «Без звука»: Web Audio по умолчанию молчит. Safari 16.4+ — сессия 'playback' (звук идёт и в беззвучном режиме);
// старые iOS — тихий зацикленный <audio playsinline>, запущенный в касании, переводит страницу в тот же режим. Вызывается только из касания («Начать готовить», «Звук»).
let SIL = null;
function iosPlayback() { try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return } } catch (e) {}
  try { if (!SIL) { const n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      SIL = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' }))); SIL.loop = true; SIL.setAttribute('playsinline', ''); SIL.setAttribute('x-webkit-airplay', 'deny') }
    const r = SIL.play(); r && r.catch && r.catch(() => {}) } catch (e) {} }
// sound(on) в касании проигрывает пустой буфер — так iPhone (и старые iOS) открывают звук страницы
function soft() { Object.keys(SLOOP).forEach(n => { const l = SLOOP[n]; clearTimeout(l.t); l.t = setTimeout(() => sunloop(n), 500) }) }
const pick = (p, n) => p + (1 + Math.floor(Math.random() * n)); let solAt = 0;
function sfx(ev, arg) { if (!ON) return;
  // нарезать: лук и капуста — свои записи (нож + хруст вместе); морковь — нож и хруст моркови; остальное — нож по доске
  if (ev === 'chop') { if (arg === 'luk') play(pick('luk-', 3)); else if (arg === 'kapusta') play(pick('kapusta-', 3)); else if (arg === 'morkov') { play(pick('nozh-', 4), G * .62, 0, .96 + Math.random() * .08); play(pick('hrust-', 3), G * .62, .004) } else play(pick('nozh-', 4), G, 0, .96 + Math.random() * .08) }   // морковь: нож и хруст вместе — каждый тише, в сумме та же громкость
  else if (ev === 'pound') play(pick('nozh-', 4), G, 0, .5);                 // отбить: тот же стук, на октаву ниже — глухой удар молотка
  else if (ev === 'pat') play(pick('nozh-', 4), G * .6, 0, .45);             // сформовать: мягкий шлепок
  else if (ev === 'crack') play(pick('lozhka-', 3), G, 0, .8);               // яйцо о край миски
  else if (ev === 'grate') sloop('terka', G, .45); else if (ev === 'peel') play('chistka'); else if (ev === 'grind') sloop('melnica', G, .35);
  else if (ev === 'roll') sloop('skalka', G, .6); else if (ev === 'whisk') sloop('venchik', G, .45);
  else if (ev === 'pourSalt') { if (Date.now() - solAt > 1500) { solAt = Date.now(); play('sol') } }
  else if (ev === 'pour') sloop('voda'); else if (ev === 'pour-stop') sunloop('voda');
  else if (ev === 'oil' || ev === 'pourThick') sloop('voda', G * .7, .3, .7); else if (ev === 'oil-stop') sunloop('voda');
  else if (ev === 'sizzle') sloop('shkvor'); else if (ev === 'scrape') { sloop('shkvor'); if (Math.random() < .015) play(pick('lozhka-', 3), G * .5) }
  else if (ev === 'bubble') sloop('kip'); else if (ev === 'simmer') sloop('bulk'); else if (ev === 'lid') play('kryshka', G * .7);
  else if (ev === 'oven') sloop('gul'); else if (ev === 'plate') play(pick('lozhka-', 3)) }
function stopAll() { Object.keys(SLOOP).forEach(sunloop) }

/* ---------- запуск: общий цикл кадров, вне экрана сцены стоят; «уменьшить движение» — один кадр ---------- */
const scenes = new Set(); let raf = 0, SRC = null;
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => e.target._sc && (e.target._sc.vis = e.isIntersecting)), { threshold: .2 }) : null;
function mount(el, sc, opts = {}) { el.innerHTML = ''; el.appendChild(sc.svg); sc.el = el; sc.vis = true; sc.t0 = performance.now() - (opts.offset || 0) * 1000; el._sc = sc; scenes.add(sc); io && io.observe(el);
  if (RM) { sc.frame(sc.T * .45); return sc } if (!raf) raf = requestAnimationFrame(tick); return sc }
function unmount(el) { const sc = el._sc; if (!sc) return; scenes.delete(sc); io && io.unobserve(el); if (SRC === sc) { SRC = null; soft() } el._sc = null }
function tick(now) { raf = requestAnimationFrame(tick); const br = (1 + .005 * (1 - Math.cos(now / 6000 * 2 * Math.PI))).toFixed(4); scenes.forEach(sc => { if (!sc.vis) return; sc.svg.style.transform = `scale(${br})`; sc.frame((now - sc.t0) / 1000, SRC === sc ? sfx : null) }) }
window.CA = { soak, dry, crack, add, drain, spread, show, CAT, prodsIn, verbs, iconFor, names, VERB, cut, pour, salt, fry, boil, stir, grate, rinse, peel, pound, pepper, oil, bringBoil, simmer, bake, whisk, form, roll, batter, plateUp, rest, forStep, mount, unmount, F, icon,
  ding() { if (ON) play('zvonok') }, sound(on) { ON = on; if (on) { iosPlayback(); const a = ac(); a.resume(); try { const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(0) } catch (e) {} loadSamples() } else { stopAll(); if (SIL) SIL.pause() } return ON }, source(sc) { if (SRC !== sc) soft(); SRC = sc }, get on() { return ON } };
})();
