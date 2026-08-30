/* OPAI HUB - second-pass API adapter. Does not invent seasons/episodes. */
(function(){
'use strict';
const BASE='https://apigratuita-animesgratis-derq.vercel.app';
const oldDetails=window.details;
const oldPlay=window.play;
const isObj=v=>v&&typeof v==='object';
const str=v=>v==null?'':String(v).trim();
const esc=s=>window.esc?window.esc(s):str(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const val=(o,keys)=>{if(!isObj(o))return null;for(const k of keys){if(o[k]!==undefined&&o[k]!==null&&str(o[k])!=='')return o[k]}return null};
const title=o=>{if(!isObj(o))return '';const v=val(o,['title','name','nome','titulo','titulo_original','title_pt','titulo_pt','animeTitle','anime_title','animeName','anime_name','nome_anime','nomeAnime','title_english','original_title','originalTitle']);if(v)return str(v);for(const k of ['anime','item','show','media','content'])if(isObj(o[k])){const t=title(o[k]);if(t)return t}return ''};
const num=(o,keys,def=0)=>{const v=val(o,keys);const m=v==null?null:String(v).match(/\d+/);return m?Number(m[0]):def};
const token=o=>{if(!isObj(o))return null;const v=val(o,['token','playToken','play_token','videoToken','video_token','streamToken','stream_token','episodeToken','episode_token','watchToken','watch_token']);if(v)return str(v);for(const k of ['episode','item','video','source','data','result'])if(isObj(o[k])){const t=token(o[k]);if(t)return t}return null};
const url=o=>{if(typeof o==='string')return /^https:\/\//i.test(o.trim())?o.trim():null;if(!isObj(o))return null;const v=val(o,['url','videoUrl','video_url','embed','embedUrl','embed_url','streamUrl','stream_url','file','src','source','link']);if(typeof v==='string'&&/^https:\/\//i.test(v.trim()))return v.trim();for(const k of ['data','result','response','player','video','source','item'])if(o[k]!==undefined){const u=url(o[k]);if(u)return u}return null};
function walk(v,out=[],depth=0){if(depth>9||v==null)return out;if(Array.isArray(v)){v.forEach(x=>walk(x,out,depth+1));return out}if(isObj(v)){out.push(v);Object.keys(v).forEach(k=>walk(v[k],out,depth+1))}return out}
async function jsonOrText(path){const r=await fetch(BASE+path,{headers:{Accept:'application/json,text/plain,*/*'},cache:'no-store'});if(!r.ok)throw Error('API '+r.status);const t=await r.text();try{return JSON.parse(t)}catch{return t.trim()}}
function episodeRecords(raw){
 const all=walk(raw),out=[],seen=new Set();
 for(const o of all){
   const nRaw=val(o,['number','episodeNumber','episode_number','episode','ep','num','numero','n','episodeNo','episode_no']);
   const hasMarker=nRaw!==null||token(o)||url(o);
   if(!hasMarker)continue;
   const n=num(o,['number','episodeNumber','episode_number','episode','ep','num','numero','n','episodeNo','episode_no'],out.length+1);
   const season=num(o,['season','seasonNumber','season_number','temporada','seasonNo','season_no'],1);
   const t=str(val(o,['title','name','nome','titulo','episodeTitle','episode_title']))||`Episódio ${n}`;
   const tok=token(o),u=url(o),key=`${season}:${n}:${tok||u||t}`;
   if(!seen.has(key)){seen.add(key);out.push({number:n,season,title:t,token:tok,url:u,raw:o})}
 }
 return out.sort((a,b)=>a.season-b.season||a.number-b.number);
}
async function loadApiAnime(x){
 try{
   const raw=await jsonOrText('/anime/'+encodeURIComponent(x.api_slug||x.api_id));
   const eps=episodeRecords(raw);
   if(eps.length){x.apiEpisodes=eps;x.episodes=eps.length;x.apiSeasons=[...new Set(eps.map(e=>e.season))].sort((a,b)=>a-b)}
   const t=title(raw);if(t)x.title=t;
   window.S.catalog=window.S.catalog.map(v=>v.id===x.id?x:v);window.save();return x;
 }catch(e){console.warn('[OPAI API patch]',e);return x}
}
let currentId=null;
function progress(x,n){return window.S?.progress?.[x.id+':'+n]||{}}
function epRow(x,e){const p=progress(x,e.number);return `<div class="eprow"><b>${e.number}</b><button class="mini" onclick="event.stopPropagation();play('${esc(x.id)}',${e.number})">▶</button><div><b>${esc(e.title)}</b><small>${e.season>1?'Temporada '+e.season+' · ':''}Episódio ${e.number}${p.done?' · Assistido':p.pct?' · '+Math.round(p.pct)+'%':''}</small></div><span class="status">${p.done?'✓':p.pct?Math.round(p.pct)+'%':'—'}</span><button class="icon" onclick="event.stopPropagation();watch('${esc(x.id)}',${e.number})">${p.done?'✓':'⋮'}</button></div>`}
function seasons(x){return [...new Set((x.apiEpisodes||[]).map(e=>Number(e.season)||1))].sort((a,b)=>a-b)}
function renderSeason(x,s){const el=document.querySelector('#apiEpisodeList');if(!el)return;const eps=(x.apiEpisodes||[]).filter(e=>Number(e.season)===Number(s));el.innerHTML=eps.length?eps.map(e=>epRow(x,e)).join(''):'<div class="empty">Nenhum episódio nesta temporada.</div>'}
window.apiSelectSeason=(s,btn)=>{document.querySelectorAll('#apiDetailPanel .season').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');const x=window.item(currentId);if(x)renderSeason(x,s)};
window.apiSelectTab=async tab=>{const x=window.item(currentId);if(x)await renderDetails(x,tab)};
async function renderDetails(x,active='episodes'){
 currentId=x.id;x=await loadApiAnime(x);currentId=x.id;
 const ss=seasons(x);
 $('#page').innerHTML=`<div class="detail"><div><div class="detailposter" style="background-image:url('${esc(x.image||'')}')"></div></div><div><div class="meta">Início › Animes › ${esc(x.title)}</div><h1>${esc(x.title)}</h1><div class="meta">${x.year||'—'} · ${x.episodes||'?'} episódios · HD · ★ ${Number(x.score||0).toFixed(1)}</div><div class="chips">${(x.genres||[]).map(g=>`<span class="chip">${esc(g)}</span>`).join('')}</div><p class="desc">${esc(x.description||'')}</p><div class="actions"><button class="primary" onclick="play('${esc(x.id)}',1)">▶ Assistir</button><button class="ghost" onclick="fav('${esc(x.id)}')">${window.S.favorites.includes(x.id)?'✓ Na minha lista':'＋ Minha Lista'}</button></div><p class="meta">Fonte: API de anime autorizada.</p><div class="tabs"><button class="${active==='episodes'?'active':''}" onclick="apiSelectTab('episodes')">Episódios</button><button class="${active==='seasons'?'active':''}" onclick="apiSelectTab('seasons')">Temporadas</button><button class="${active==='details'?'active':''}" onclick="apiSelectTab('details')">Detalhes</button></div><div id="apiDetailPanel"></div></div><aside><div class="source"><b>FONTE DE REPRODUÇÃO</b><p class="meta">${x.apiEpisodes?.some(e=>e.token||e.url)?'Fonte de episódios disponível.':'A API não retornou episódios para este título.'}</p></div></aside></div>`;
 const panel=$('#apiDetailPanel');
 if(active==='details'){panel.innerHTML=`<div class="info-grid"><div class="setting"><b>Informações</b><p>Ano: ${x.year||'—'}</p><p>Status: ${esc(x.status||'—')}</p><p>Episódios: ${x.episodes||'—'}</p><p>Temporadas reais retornadas pela API: ${ss.length}</p><p>Nota: ★ ${Number(x.score||0).toFixed(1)}</p></div><div class="setting"><b>Sinopse</b><p class="desc">${esc(x.description||'')}</p></div></div>`;return}
 if(!ss.length||!x.apiEpisodes?.length){panel.innerHTML='<div class="empty">Nenhum episódio foi retornado pela API.</div>';return}
 panel.innerHTML=`<div class="seasons"><div>${ss.map((s,i)=>`<button class="season ${i===0?'active':''}" onclick="apiSelectSeason(${s},this)"><b>Temporada ${s}</b><small>${x.apiEpisodes.filter(e=>e.season===s).length} episódios</small></button>`).join('')}</div><div id="apiEpisodeList" class="eplist"></div></div>`;
 renderSeason(x,ss[0]);
}
window.details=async id=>{const x=window.item(id);if(x?.api_id)return renderDetails(x,'episodes');return oldDetails?.(id)};
window.play=async(id,n)=>{const x=window.item(id);if(!x?.api_id)return oldPlay?.(id,n);currentId=x.id;const r=await window.animeApi.play(id,Number(n)||1);if(!r?.url){$('#page').innerHTML=`<section class="player-shell"><div class="player-head"><button class="ghost" onclick="details('${esc(x.id)}')">← Voltar</button><div><h2>${esc(x.title)}</h2><div class="meta">Episódio ${Number(n)||1}</div></div></div><div class="sourcebar"><b>Fonte de reprodução</b><span class="meta"> API</span></div><div class="player"><div class="playererror"><div><div style="font-size:48px">▶</div><h3>Reprodução não disponível</h3><p>O episódio foi localizado, mas a API não retornou uma URL HTTPS para reprodução.</p><button class="ghost" onclick="play('${esc(x.id)}',${Number(n)||1})">Tentar novamente</button></div></div></div></section>`;return}
 const u=String(r.url);$('#page').innerHTML=`<section class="player-shell"><div class="player-head"><button class="ghost" onclick="details('${esc(x.id)}')">← Voltar</button><div><h2>${esc(x.title)}</h2><div class="meta">Episódio ${Number(n)||1}</div></div></div><div class="sourcebar"><b>Fonte de reprodução</b><span class="meta"> API de anime autorizada</span></div><div class="player">${/\.(mp4|webm)(\?|#|$)/i.test(u)?`<video id="apiVideo" class="videoplayer" controls playsinline preload="metadata" ${window.S.settings.autoplay?'autoplay':''} src="${esc(u)}"></video>`:`<iframe class="embedframe" src="${esc(u)}" title="${esc(x.title)} — episódio ${Number(n)||1}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`}</div></section>`;scrollTo(0,0)};
})();