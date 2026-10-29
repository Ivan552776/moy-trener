/* Сервис-воркер «Мой тренер»: приложение открывается и работает без сети (магазин, улица, зал), устойчиво к слабой мобильной связи и VPN.
   Страница — сначала сеть (с таймаутом 4 с), иначе сохранённая копия. Данные (data/, models/clipdb*, exclip*) — сразу из памяти, обновление в фоне.
   Библиотеки, картинки, шрифты — из памяти, при первом обращении сохраняются. Модели распознавания кэширует сама библиотека (transformers-cache),
   видео не трогаем (нужны частичные ответы 206), кроме короткого примера squat.mp4: страница берёт его целиком через fetch.
   Версия кэша меняется при выкладке — скачанное (библиотеки, базы, картинки) переносится в новую копию, старые страницы не переносятся.
   lib/ отдаётся из памяти без проверки: новую версию библиотеки класть по новому пути, иначе останется старая. */
const V='mt-2026-10-29-r3';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(['./','index.html'].map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
// страница просит сохранить себя (её адрес заранее неизвестен: index.html на сервере, yobody.html в превью)
self.addEventListener('message',e=>{const u=e.data&&e.data.cachePage;if(u)e.waitUntil(caches.open(V).then(c=>c.add(new Request(u,{cache:'reload'}))).catch(()=>{}))});
// новая версия: переносим скачанное для работы без сети (иначе каждая выкладка стирала бы ~40 МБ библиотек и базы), страницы — нет, их кладёт install
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  try{const nw=await caches.open(V);for(const k of (await caches.keys()).filter(k=>k.startsWith('mt-')&&k!==V)){const old=await caches.open(k);
    for(const q of await old.keys()){const p=new URL(q.url).pathname;if(p.endsWith('/')||p.endsWith('.html'))continue;if(!(await nw.match(q))){const r=await old.match(q);if(r)await nw.put(q,r)}}
    await caches.delete(k)}}catch(err){}
  await self.clients.claim()})())});
const put=(req,res)=>{if(res&&res.ok&&res.status===200&&res.type==='basic'){const c=res.clone();caches.open(V).then(ca=>ca.put(req,c)).catch(()=>{})}return res};
const timeout=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||r.headers.has('range'))return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  const p=u.pathname;
  if(/\.(webm|mov|ogv)$/i.test(p)||(/\.mp4$/i.test(p)&&!p.endsWith('/squat.mp4'))||p.includes('/models/mobileclip'))return;
  if(r.mode==='navigate'||p.endsWith('.html')||p.endsWith('/')){
    e.respondWith(timeout(fetch(r),4000).then(res=>put(r,res)).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./',{ignoreSearch:true}))));return}
  if(/\/(data|models)\//.test(p)){
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>{const net=fetch(r).then(res=>put(r,res)).catch(()=>m);return m||net}));return}
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>m||fetch(r).then(res=>put(r,res))));
});
