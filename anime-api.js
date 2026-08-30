/* OPAI HUB - API de anime autorizada pelo proprietário.
 * Base: https://apigratuita-animesgratis-derq.vercel.app/
 * Fluxo: catálogo -> detalhes -> episódios/temporada -> token -> /play/{token} -> player.
 */
(function(){
'use strict';
const BASE='https://apigratuita-animesgratis-derq.vercel.app';
const originalDetails=window.details;
const originalDetailTab=window.detailTab;

const isObj=v=>v&&typeof v==='object';
const text=v=>v===null||v===undefined?'':String(v).trim();
function first(o,keys){
  if(!isObj(o)) return null;
  for(const k of keys){
    const v=o[k];
    if(v!==undefined&&v!==null&&text(v)!=='') return v;
  }
  return null;
}
function unwrap(raw){
  if(!isObj(raw)) return raw;
  for(const k of ['data','result','response','payload']) if(raw[k]!==undefined) return raw[k];
  return raw;
}
function imageOf(o){
  if(!isObj(o)) return '';
  const n=first(o,['anime','item','show','media','content']);
  const v=first(o,['image','poster','cover','thumbnail','thumb','imagem','capa','posterUrl','poster_url','imageUrl','image_url','coverUrl','cover_url','foto','picture']) ?? (n&&first(n,['image','poster','cover','thumbnail','imagem','capa','posterUrl','imageUrl']));
  if(typeof v==='string') return v;
  if(isObj(v)) return text(first(v,['large','original','url','src','medium','image','image_url']))||'';
  return '';
}
function titleOf(o){
  if(!isObj(o)) return '';
  const nested=first(o,['anime','item','show','media','content']);
  const v=first(o,['title','name','nome','titulo','titulo_original','title_pt','titulo_pt','animeTitle','anime_title','animeName','anime_name','nome_anime','nomeAnime','title_english','titleEnglish','original_title','originalTitle']);
  if(v) return text(v);
  if(isObj(nested)){
    const nv=titleOf(nested); if(nv) return nv;
  }
  const slug=first(o,['slug','anime_slug','animeSlug']);
  return slug?text(slug).replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'';
}
function idOf(o,i=0){
  if(!isObj(o)) return `api-${i}`;
  const n=first(o,['anime','item','show','media','content']);
  return text(first(o,['id','animeId','anime_id','slug','mal_id','code','_id','uuid'])) || (isObj(n)?text(first(n,['id','animeId','anime_id','slug','code','_id'])):'') || `api-${i}`;
}
function arraysDeep(raw,depth=0,out=[]){
  if(depth>5||raw===null||raw===undefined) return out;
  if(Array.isArray(raw)){for(const v of raw){if(isObj(v)||Array.isArray(v)) arraysDeep(v,depth+1,out)};return out}
  if(isObj(raw)){
    for(const k of ['animes','anime','items','list','catalog','catalogo','episodes','episodios','episode','data','results','docs','shows']){
      if(raw[k]!==undefined) arraysDeep(raw[k],depth+1,out);
    }
  }
  return out;
}
function collectList(raw){
  if(Array.isArray(raw)) return raw;
  const u=unwrap(raw);
  if(Array.isArray(u)) return u;
  const preferred=[];
  if(isObj(u)){
    for(const k of ['animes','anime','items','list','catalog','catalogo','data','results','docs']) if(Array.isArray(u[k])) preferred.push(...u[k]);
    if(preferred.length) return preferred;
    const vals=Object.values(u).filter(isObj);
    if(vals.length&&vals.some(v=>titleOf(v))) return vals;
  }
  return [];
}
function episodeNumber(e,i){
  const raw=first(e,['number','episodeNumber','episode_number','episode','ep','num','numero','n','episodeNo','episode_no']);
  if(raw!==null){const m=String(raw).match(/\d+/);if(m)return Number(m[0])}
  return i+1;
}
function seasonNumber(e){
  const raw=first(e,['season','seasonNumber','season_number','temporada','seasonNo','season_no']);
  if(raw!==null){const m=String(raw).match(/\d+/);if(m)return Number(m[0])}
  return 1;
}
function tokenOf(e){
  if(!isObj(e)) return null;
  const n=first(e,['episode','item','video','source']);
  const v=first(e,['token','playToken','play_token','videoToken','video_token','streamToken','stream_token','idToken','episodeToken','episode_token','watchToken','watch_token']);
  if(v) return text(v);
  if(isObj(n)) return tokenOf(n);
  return null;
}
function directUrlOf(e){
  if(typeof e==='string') return /^https:\/\//i.test(e.trim())?e.trim():null;
  if(!isObj(e)) return null;
  const v=first(e,['url','video','videoUrl','video_url','link','embed','embedUrl','embed_url','stream','streamUrl','stream_url','file','src','source']);
  if(typeof v==='string'&&/^https:\/\//i.test(v.trim())) return v.trim();
  for(const k of ['data','result','response','player','video','source','item']) if(isObj(e[k])){const u=directUrlOf(e[k]);if(u)return u}
  return null;
}
function normalizeEpisode(e,i){
  const n=episodeNumber(e,i);
  return {number:n,season:seasonNumber(e),title:text(first(e,['title','name','nome','titulo','episodeTitle','episode_title']))||`Episódio ${n}`,token:tokenOf(e),url:directUrlOf(e),raw:e};
}
function normalizeAnime(a,i){
  const id=idOf(a,i), title=titleOf(a)||`Anime ${i+1}`;
  const year=Number(first(a,['year','releaseYear','release_year','ano']))||0;
  const score=Number(first(a,['score','rating','nota','ratingScore','notaMedia']))||0;
  const g=first(a,['genres','generos','genre']);
  const genres=(Array.isArray(g)?g:(typeof g==='string'?g.split(','):[])).map(v=>typeof v==='string'?v:text(first(v,['name','nome','title']))).filter(Boolean);
  const eps=first(a,['episodes','episodeCount','episode_count','totalEpisodes','total_episodes','episodios','quantidadeEpisodios']);
  const arr=Array.isArray(eps)?eps.map(normalizeEpisode):[];
  const seasons=[...new Set(arr.map(e=>e.season).filter(Number.isFinite))].sort((a,b)=>a-b);
  return {id:'api-'+id,api_id:id,api_slug:text(first(a,['slug','anime_slug','animeSlug']))||id,title,type:'anime',year,score,genres,episodes:Array.isArray(eps)?arr.length:Number(eps)||0,image:imageOf(a),description:text(first(a,['description','synopsis','sinopse','descricao','summary']))||'Sem sinopse disponível.',status:text(first(a,['status','state','situacao']))||'Informação pública',source:'API gratuita de anime',sources:[],apiEpisodes:arr,apiSeasons:seasons.length?seasons:[1],apiRaw:a};
}
async function apiRaw(path){
  const r=await fetch(BASE+path,{method:'GET',headers:{Accept:'application/json,text/plain,*/*'},mode:'cors',cache:'no-store'});
  if(!r.ok) throw new Error(`API ${r.status}`);
  const rawText=await r.text();
  try{return JSON.parse(rawText)}catch{return rawText.trim()}
}
function extractUrl(raw){
  if(typeof raw==='string') return /^https:\/\//i.test(raw.trim())?raw.trim():null;
  if(Array.isArray(raw)){for(const v of raw){const u=extractUrl(v);if(u)return u}return null}
  if(!isObj(raw)) return null;
  const direct=directUrlOf(raw);if(direct)return direct;
  for(const k of ['data','result','response','payload','player','video','source','url']) if(raw[k]!==undefined){const u=extractUrl(raw[k]);if(u)return u}
  return null;
}
async function loadList(){
  const raw=await apiRaw('/animes');
  return collectList(raw).map(normalizeAnime).filter(x=>x.title);
}
function merge(list){
  const map=new Map((window.S?.catalog||[]).map(x=>[String(x.id),x]));
  for(const x of list){
    const old=map.get(String(x.id));
    map.set(String(x.id),old?{...old,...x,title:x.title||old.title,image:x.image||old.image,apiEpisodes:x.apiEpisodes?.length?x.apiEpisodes:(old.apiEpisodes||[]),apiSeasons:x.apiSeasons?.length?x.apiSeasons:(old.apiSeasons||[1])}:x);
  }
  window.S.catalog=[...map.values()];window.save();
}
async function refresh(silent=false){
  try{const list=await loadList();if(!list.length)throw new Error('lista vazia');merge(list);if(!silent)window.toast?.(`✓ ${list.length} animes carregados pela API`);window.home?.();return window.S.catalog}
  catch(e){console.warn('[OPAI API] catálogo:',e);if(!silent)window.toast?.('Não foi possível atualizar a API de anime.');return window.S.catalog}
}
async function detailsApi(id){
  const x=window.item(id);if(!x||!x.api_id)return x;
  try{
    const raw=await apiRaw('/anime/'+encodeURIComponent(x.api_slug||x.api_id));
    const root=unwrap(raw);
    const candidates=collectList(root);
    const episodeCandidates=[];
    if(Array.isArray(root)) episodeCandidates.push(...root);
    if(isObj(root)) for(const k of ['episodes','episodios','episode','items','data','results']) if(root[k]!==undefined) episodeCandidates.push(...(Array.isArray(root[k])?root[k]:[root[k]]));
    const deep=arraysDeep(root).filter(v=>isObj(v));
    episodeCandidates.push(...deep.filter(v=>tokenOf(v)||directUrlOf(v)||first(v,['episodeNumber','episode_number','episode','ep','numero'])));
    const seen=new Set(),eps=[];
    for(const e of episodeCandidates){const ne=normalizeEpisode(e,eps.length),key=`${ne.season}:${ne.number}:${ne.token||ne.url||ne.title}`;if(!seen.has(key)){seen.add(key);eps.push(ne)}}
    if(eps.length){x.apiEpisodes=eps.sort((a,b)=>a.season-b.season||a.number-b.number);x.episodes=Math.max(Number(x.episodes)||0,eps.length);x.apiSeasons=[...new Set(eps.map(e=>e.season))].sort((a,b)=>a-b)}
    const title=titleOf(root),image=imageOf(root);if(title)x.title=title;if(image)x.image=image;
    x.apiDetail=root;window.S.catalog=window.S.catalog.map(v=>v.id===x.id?x:v);window.save();return x;
  }catch(e){console.warn('[OPAI API] detalhes:',e);return x}
}
async function playApi(id,n){
  const x=await detailsApi(id),eps=x?.apiEpisodes||[];
  let ep=eps.find(e=>Number(e.number)===Number(n));
  if(!ep) ep=eps.find(e=>Number(e.number)===Number(n)&&Number(e.season)===1)||eps[n-1];
  if(!ep && x?.apiDetail){const candidates=collectList(x.apiDetail);const one=candidates.find(e=>episodeNumber(e,0)===Number(n));if(one)ep=normalizeEpisode(one,n-1)}
  if(ep?.url&&/^https:\/\//i.test(ep.url))return{url:ep.url,title:ep.title,episode:ep};
  const token=ep?.token||x?.apiToken;
  if(!token) return null;
  try{const raw=await apiRaw('/play/'+encodeURIComponent(token));const url=extractUrl(raw);if(url)return{url,title:ep?.title||`Episódio ${n}`,episode:ep}}catch(e){console.warn('[OPAI API] /play:',e)}
  return null;
}
function apiSeasons(x){return [...new Set((x.apiEpisodes||[]).map(e=>Number(e.season)||1))].sort((a,b)=>a-b)}
function esc(s){return window.esc?window.esc(s):text(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function progress(id,n){return window.S?.progress?.[id+':'+n]||{}}
function episodeHTML(x,e){const p=progress(x.id,e.number);return `<div class="eprow"><b>${e.number}</b><button class="mini" onclick="event.stopPropagation();play('${esc(x.id)}',${e.number})">▶</button><div><b>${esc(e.title)}</b><small>${e.season>1?'Temporada '+e.season+' · ':''}Episódio ${e.number} ${p.done?'· Assistido':p.pct?'· '+Math.round(p.pct)+'%':''}</small></div><span class="status">${p.done?'✓':p.pct?Math.round(p.pct)+'%':'—'}</span><button class="icon" onclick="event.stopPropagation();watch('${esc(x.id)}',${e.number})">${p.done?'✓':'⋮'}</button></div>`}
async function renderApiDetails(x,active='episodes'){
  x=await detailsApi(x.id);
  const seasons=apiSeasons(x);const panelTabs=[['episodes','Episódios'],['details','Detalhes'],['seasons','Temporadas']];
  $('#page').innerHTML=`<div class="detail"><div><div class="detailposter" style="background-image:url('${esc(x.image||'')}')"></div></div><div><div class="meta">Início › Animes › ${esc(x.title)}</div><h1>${esc(x.title)}</h1><div class="meta">${x.year||'—'} · ${x.episodes||'?'} episódios · HD · ★ ${Number(x.score||0).toFixed(1)}</div><div class="chips">${(x.genres||[]).map(g=>`<span class="chip">${esc(g)}</span>`).join('')}</div><p class="desc">${esc(x.description||'')}</p><div class="actions"><button class="primary" onclick="play('${esc(x.id)}',1)">▶ Assistir</button><button class="ghost" onclick="fav('${esc(x.id)}')">${window.S.favorites.includes(x.id)?'✓ Na minha lista':'＋ Minha Lista'}</button></div><p class="meta">Fonte: API de anime autorizada pelo proprietário.</p><div class="tabs">${panelTabs.map(([k,l])=>`<button type="button" class="${active===k?'active':''}" data-tab="${k}" onclick="animeApiTab('${k}')">${l}</button>`).join('')}<button type="button" data-tab="cast" onclick="animeApiTab('cast')">Elenco</button><button type="button" data-tab="reviews" onclick="animeApiTab('reviews')">Avaliações</button></div><div id="apiDetailPanel"></div></div><aside><div class="source"><b>FONTE DE REPRODUÇÃO</b><p class="meta">${x.apiEpisodes?.some(e=>e.token||e.url)?'Episódios disponíveis pela API.':'Nenhum episódio foi retornado pela API.'}</p></div></aside></div>`;
  await renderApiPanel(x,active);scrollTo(0,0);
}
async function renderApiPanel(x,tab){
  const p=$('#apiDetailPanel');if(!p)return;
  if(tab==='episodes'||tab==='seasons'){
    if(!x.apiEpisodes?.length){p.innerHTML='<div class="empty">Nenhum episódio foi retornado pela API para este título.</div>';return}
    const seasons=apiSeasons(x);const selected=tab==='seasons'?seasons[0]:seasons[0];
    p.innerHTML=`<div class="seasons"><div>${seasons.map((s,i)=>`<button class="season ${i===0?'active':''}" onclick="animeSeason(${s},this)"><b>Temporada ${s}</b><small>${x.apiEpisodes.filter(e=>e.season===s).length} episódios</small></button>`).join('')}</div><div id="apiEpisodeList" class="eplist"></div></div>`;
    renderSeason(x,selected);return;
  }
  if(tab==='details'){p.innerHTML=`<div class="info-grid"><div class="setting"><b>Informações</b><p>Tipo: Anime</p><p>Ano: ${x.year||'—'}</p><p>Status: ${esc(x.status||'—')}</p><p>Episódios: ${x.episodes||'—'}</p><p>Temporadas: ${apiSeasons(x).length}</p><p>Nota: ★ ${Number(x.score||0).toFixed(1)}</p></div><div class="setting"><b>Sinopse</b><p class="desc">${esc(x.description||'')}</p></div></div>`;return}
  if(tab==='cast'){p.innerHTML='<div class="loading">Elenco não fornecido pela API.</div>';return}
  if(tab==='reviews'){p.innerHTML=`<div class="reviews-head"><b>Avaliação do catálogo</b><span class="meta">★ ${Number(x.score||0).toFixed(1)}</span></div><div class="empty">A API de anime não forneceu avaliações detalhadas para este título.</div>`;return}
}
function renderSeason(x,s){const el=$('#apiEpisodeList');if(!el)return;const eps=(x.apiEpisodes||[]).filter(e=>Number(e.season)===Number(s)).sort((a,b)=>a.number-b.number);el.innerHTML=eps.length?eps.map(e=>episodeHTML(x,e)).join(''):'<div class="empty">Nenhum episódio nesta temporada.</div>'}
window.animeSeason=(s,btn)=>{document.querySelectorAll('#apiDetailPanel .season').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');const x=window.item(document.querySelector('#apiDetailPanel')?.closest('.detail')?window.S.catalog.find(v=>v.apiEpisodes&&document.querySelector('.detail h1')?.textContent===v.title)?.id:'');if(x)renderSeason(x,s)};
window.animeApiTab=async tab=>{const h=document.querySelector('.detail h1');const x=h?window.S.catalog.find(v=>v.title===h.textContent&&v.api_id):null;if(x)await renderApiDetails(x,tab)};
async function renderPlayer(id,n){
  const x=await detailsApi(id);const ep=Number(n)||1;
  $('#page').innerHTML=`<section class="player-shell"><div class="player-head"><button class="ghost" id="apiBack">← Voltar</button><div><h2>${esc(x?.title||'Anime')}</h2><div class="meta">Episódio ${ep}</div></div></div><div class="sourcebar"><b>Fonte de reprodução</b><span class="meta"> Carregando...</span></div><div class="player"><div class="playererror"><div><div style="font-size:48px">⏳</div><h3>Carregando reprodução...</h3><p>Consultando o episódio e a fonte de vídeo.</p></div></div></div></section>`;
  $('#apiBack')?.addEventListener('click',()=>window.details(id));
  const result=await playApi(id,ep);
  if(!result?.url||!/^https:\/\//i.test(result.url)){$('.sourcebar').innerHTML='<b>Fonte de reprodução</b><span class="meta"> API</span>';$('.player').innerHTML=`<div class="playererror"><div><div style="font-size:48px">▶</div><h3>Reprodução não disponível</h3><p>A API não retornou uma URL HTTPS para este episódio.</p><button class="ghost" id="apiRetry">Tentar novamente</button></div></div>`;$('#apiRetry')?.addEventListener('click',()=>renderPlayer(id,ep));return}
  const u=String(result.url),isVideo=/\.(mp4|webm)(\?|#|$)/i.test(u),isHls=/\.m3u8(\?|#|$)/i.test(u),safe=esc(u);
  if(isVideo||isHls){$('.player').innerHTML=`<video id="apiVideo" class="videoplayer" controls playsinline preload="metadata" ${window.S.settings.autoplay?'autoplay':''}></video>`;const v=$('#apiVideo');if(isHls&&!v.canPlayType('application/vnd.apple.mpegurl')){const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';sc.onload=()=>{if(window.Hls&&Hls.isSupported()){const h=new Hls();h.loadSource(u);h.attachMedia(v)}else v.src=u};sc.onerror=()=>v.src=u;document.head.appendChild(sc)}else v.src=u;v.addEventListener('loadedmetadata',()=>{const old=Number(window.S.progress?.[id+':'+ep]?.seconds||0);if(old)try{v.currentTime=Math.min(old,Math.max(0,v.duration-1))}catch{}});v.addEventListener('timeupdate',()=>{if(v.duration){const k=id+':'+ep;window.S.progress[k]={...(window.S.progress[k]||{}),pct:Math.min(99,Math.round(v.currentTime/v.duration*100)),seconds:Math.floor(v.currentTime),updatedAt:Date.now()};window.save()}});v.addEventListener('ended',()=>{const k=id+':'+ep;window.S.progress[k]={...(window.S.progress[k]||{}),pct:100,done:true,seconds:Math.floor(v.duration||0),updatedAt:Date.now()};window.save();window.toast?.('✓ Episódio concluído.')})}
  else $('.player').innerHTML=`<iframe class="embedframe" src="${safe}" title="${esc(x.title)} — episódio ${ep}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  $('.sourcebar').innerHTML='<b>Fonte de reprodução</b><span class="meta"> API de anime autorizada · player externo</span>';scrollTo(0,0);
}
window.animeApi={base:BASE,refresh,loadList,details:detailsApi,play:playApi};
window.refreshAnimeApi=refresh;
window.refreshCatalog=async function(silent=false){return refresh(silent)};
window.details=async function(id){const x=window.item(id);if(x?.api_id)return renderApiDetails(x,'episodes');return originalDetails?.(id)};
window.play=async function(id,n){const x=window.item(id);if(x?.api_id)return renderPlayer(id,n);return window._opaiOriginalPlay?window._opaiOriginalPlay(id,n):originalDetails?.(id)};
window._opaiOriginalDetails=originalDetails;
window._opaiOriginalDetailTab=originalDetailTab;
/* A API assume o player final depois dos scripts anteriores. */
refresh(true).catch(()=>{});
})();