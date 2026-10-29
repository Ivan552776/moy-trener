/* Сервис-воркер «Мой тренер»: приложение открывается и работает без сети (магазин, улица, зал), устойчиво к слабой мобильной связи и VPN.
   Страница — сначала сеть (с таймаутом 4 с), иначе сохранённая копия. Данные (data/, models/clipdb*, exclip*) — сразу из памяти, обновление в фоне.
   Библиотеки, картинки, шрифты — из памяти, при первом обращении сохраняются. Модели распознавания кэширует сама библиотека (transformers-cache),
   видео не трогаем (нужны частичные ответы 206). Версия кэша меняется при выкладке — старые копии удаляются. */
const V='mt-2026-10-29-r2';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(['./','index.html'].map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
// страница просит сохранить себя (её адрес заранее неизвестен: index.html на сервере, yobody.html в превью)
self.addEventListener('message',e=>{const u=e.data&&e.data.cachePage;if(u)e.waitUntil(caches.open(V).then(c=>c.add(new Request(u,{cache:'reload'}))).catch(()=>{}))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('mt-')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const put=(req,res)=>{if(res&&res.ok&&res.status===200&&res.type==='basic'){const c=res.clone();caches.open(V).then(ca=>ca.put(req,c)).catch(()=>{})}return res};
const timeout=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||r.headers.has('range'))return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  const p=u.pathname;
  if(/\.(mp4|webm|mov|ogv)$/i.test(p)||p.includes('/models/mobileclip'))return;
  if(r.mode==='navigate'||p.endsWith('.html')||p.endsWith('/')){
    e.respondWith(timeout(fetch(r),4000).then(res=>put(r,res)).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./',{ignoreSearch:true}))));return}
  if(/\/(data|models)\//.test(p)){
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>{const net=fetch(r).then(res=>put(r,res)).catch(()=>m);return m||net}));return}
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>m||fetch(r).then(res=>put(r,res))));
});
