/* Сервис-воркер «Мой тренер»: приложение открывается и работает без сети (магазин, улица, зал), устойчиво к слабой мобильной связи и VPN.
   Страница — сначала сеть (с таймаутом 4 с), иначе сохранённая копия. Данные (data/, models/clipdb*, exclip*) — сразу из памяти, обновление в фоне.
   Библиотеки, картинки, шрифты — из памяти, при первом обращении сохраняются. Модели распознавания кэширует сама библиотека (transformers-cache),
   видео не трогаем (нужны частичные ответы 206), кроме короткого примера squat.mp4: страница берёт его целиком через fetch.
   Версия кэша меняется при выкладке — скачанное (библиотеки, базы, картинки) переносится в новую копию, старые страницы не переносятся.
   lib/ отдаётся из памяти без проверки: новую версию библиотеки класть по новому пути, иначе останется старая. */
const V='mt-2026-10-30-r9';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(['./','index.html','manifest.webmanifest','icon.png'].map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
// страница просит сохранить себя (её адрес заранее неизвестен: index.html на сервере, yobody.html в превью)
self.addEventListener('message',e=>{const u=e.data&&e.data.cachePage;if(u)e.waitUntil(caches.open(V).then(c=>c.add(new Request(u,{cache:'reload'}))).catch(()=>{}))});
// новая версия: сначала кладём открытые вкладки (иначе после выкладки без сети приложение не открывалось), потом переносим скачанное
// (~40 МБ библиотек и базы), старую копию удаляем, только когда всё из неё есть в новой. Повторяется при каждом запуске страницы (сообщение tidy):
// телефон может прервать воркер посреди переноса — тогда старая копия лежала рядом (+100 МБ), а новая была неполной
const timeout0=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
async function tidy(){
  try{const nw=await caches.open(V);
    for(const w of await self.clients.matchAll({type:'window'})){const u=w.url.split('#')[0];if(!(await nw.match(u,{ignoreSearch:true})))await timeout0(nw.add(new Request(u,{cache:'reload'})),4000).catch(()=>{})}
    for(const k of (await caches.keys()).filter(k=>k.startsWith('mt-')&&k!==V)){const old=await caches.open(k);let all=true;
      for(const q of await old.keys()){if(await nw.match(q))continue;const p=new URL(q.url).pathname,r=await old.match(q);
        if(r){try{await nw.put(q,r)}catch(e){all=false}}} // страницы тоже: свежая копия перезапишет их, когда скачается
      if(all)await caches.delete(k)}}catch(err){}}
self.addEventListener('activate',e=>{e.waitUntil((async()=>{await self.clients.claim();await tidy()})())});
self.addEventListener('message',e=>{if(e.data&&e.data.tidy)e.waitUntil(tidy())});
const fresh=new Set();
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
    // из памяти; обновляем в фоне не чаще раза за жизнь воркера (раньше — при каждом обращении, лишний трафик на мобильной сети)
    if(r.cache==='reload'||r.cache==='no-cache'){fresh.add(p);e.respondWith(timeout(fetch(r),8000).then(res=>res.ok?put(r,res):caches.match(r,{ignoreSearch:true}).then(m=>m||res)).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||Response.error())));return} // страница входа в Wi-Fi или 5xx — отдаём сохранённое
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>{if(m){if(!fresh.has(p)){fresh.add(p);fetch(r).then(res=>put(r,res)).catch(()=>{})}return m}return fetch(r).then(res=>{fresh.add(p);return put(r,res)})}));return}
  // без сети несохранённая картинка — пустая заглушка, а не ошибка
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>m||fetch(r).then(res=>put(r,res)).catch(err=>/\.(jpe?g|png|webp|gif)$/i.test(p)&&!p.includes('/ex/')?new Response('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',{headers:{'content-type':'image/svg+xml'}}):Promise.reject(err))));
});
// напоминания с сервера: JSON {title, body, tag, url, icon?} → уведомление; нажали — открываем приложение на нужном экране (url вида ./#gym)
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){try{d={body:e.data.text()}}catch(__){}}
  const o={body:String(d.body||''),icon:d.icon||'icon.png',badge:'icon.png',data:{url:d.url||'./'}};if(d.tag)o.tag=String(d.tag);
  e.waitUntil(self.registration.showNotification(String(d.title||'Мой тренер'),o))});
self.addEventListener('notificationclick',e=>{e.notification.close();const sc=self.registration.scope;
  let url=sc;try{const t=new URL((e.notification.data&&e.notification.data.url)||'./',sc);if(t.origin===location.origin&&t.href.startsWith(sc))url=t.href}catch(_){}
  e.waitUntil((async()=>{const ws=await self.clients.matchAll({type:'window',includeUncontrolled:true}),w=ws.find(c=>c.url.startsWith(sc));
    if(w){try{w.postMessage({open:url})}catch(_){}try{await w.focus();return}catch(_){}}
    if(self.clients.openWindow)await self.clients.openWindow(url)})())});
