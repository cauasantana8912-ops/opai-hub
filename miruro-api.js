/* OPAI HUB — Miruro API adapter
 * Usa a estrutura REST documentada pelo proprietário da Miruro-API.
 * A API deve ser hospedada separadamente (FastAPI/VPS); GitHub Pages executa apenas este cliente.
 */
(function(){
  'use strict';

  const BASE = String(window.OPAI_MIRURO_API_BASE || localStorage.getItem('opai_miruro_api_base') || '').replace(/\/+$/,'');
  const hasBase = !!BASE;
  const HLS = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';

  const isObj = v => v && typeof v === 'object';
  const str = v => v == null ? '' : String(v).trim();
  const esc = s => window.esc ? window.esc(s) : str(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const titleOf = a => {
    if(!isObj(a)) return '';
    if(typeof a.title === 'string') return a.title;
    if(isObj(a.title)) return str(a.title.english || a.title.romaji || a.title.native);
    return str(a.name || a.nome || a.titulo || a.title_english || a.original_title);
  };
  const imageOf = a => {
    if(!isObj(a)) return '';
    const c=a.coverImage || a.cover || a.image;
    if(typeof c==='string') return c;
    return str(c?.extraLarge || c?.large || c?.medium || c?.original || c?.url || a.poster || a.thumbnail);
  };
  const clean = s => str(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

  async function api(path){
    if(!hasBase) throw new Error('MIRURO_API_BASE não configurada');
    const r=await fetch(BASE + path,{headers:{Accept:'application/json,text/plain,*/*'},cache:'no-store'});
    const t=await r.text();
    let data; try{data=JSON.parse(t)}catch{data=t}
    if(!r.ok) throw new Error(`Miruro API ${r.status}`);
    return data;
  }

  function results(raw){
    if(Array.isArray(raw)) return raw;
    if(!isObj(raw)) return [];
    for(const k of ['results','data','animes','items','anime','docs','catalog']) if(Array.isArray(raw[k])) return raw[k];
    return [];
  }

  function normalizeAnime(a,i=0){
    const id=Number(a?.id || a?.anilistId || a?.anilist_id || a?.mappings?.anilistId || 0) || str(a?.id || a?.slug || `item-${i}`);
    const score=Number(a?.averageScore ?? a?.meanScore ?? a?.score ?? 0);
    return {
      id:'miruro-'+id,
      miruro_id:id,
      anilist_id:Number(a?.id || a?.anilistId || a?.anilist_id || a?.mappings?.anilistId || 0) || null,
      api_id:id,
      title:titleOf(a)||'Sem título', type:'anime',
      year:Number(a?.seasonYear || a?.year || a?.startDate?.year || 0),
      score:score>10?score/10:score,
      genres:Array.isArray(a?.genres)?a.genres.slice(0,6).map(x=>typeof x==='string'?x:str(x?.name)).filter(Boolean):[], 
      episodes:Number(a?.episodes || 0), image:imageOf(a), banner:str(a?.bannerImage || a?.banner || ''),
      description:clean(a?.description || a?.synopsis || a?.sinopse) || 'Sem sinopse disponível.',
      status:str(a?.status || ''), season:str(a?.season || ''), format:str(a?.format || ''),
      source:'Miruro API autorizada', sources:[], apiRaw:a
    };
  }

  function merge(list){
    const map=new Map((window.S?.catalog||[]).map(x=>[String(x.id),x]));
    for(const x of list){
      const old=map.get(String(x.id));
      map.set(String(x.id), old ? {...old,...x} : x);
    }
    window.S.catalog=[...map.values()];
    window.save();
  }

  function episodeArray(raw){
    const out=[];
    const providers=isObj(raw?.providers)?raw.providers:{};
    for(const [provider,pdata] of Object.entries(providers)){
      const eps=isObj(pdata?.episodes)?pdata.episodes:{};
      for(const [audio,list] of Object.entries(eps)){
        if(!Array.isArray(list)) continue;
        for(const e of list){
          const n=Number(e?.number || e?.episode || e?.episodeNumber || 0);
          if(!n) continue;
          out.push({number:n,season:Number(e?.season || 1),title:str(e?.title || `Episódio ${n}`),provider,audio,sourceId:str(e?.id || ''),image:str(e?.image || ''),duration:Number(e?.duration || 0),filler:!!e?.filler,raw:e});
        }
      }
    }
    return out.sort((a,b)=>a.season-b.season||a.number-b.number||a.provider.localeCompare(b.provider));
  }

  async function loadEpisodes(x){
    const aid=Number(x?.anilist_id || x?.miruro_id || x?.api_id);
    if(!aid) return [];
    const raw=await api('/episodes/'+encodeURIComponent(aid));
    const eps=episodeArray(raw);
    x.apiEpisodes=eps;
    x.apiSeasons=[...new Set(eps.map(e=>e.season))].sort((a,b)=>a-b);
    x.apiEpisodeRaw=raw;
    x.episodes=Math.max(Number(x.episodes)||0, eps.length);
    window.S.catalog=window.S.catalog.map(v=>v.id===x.id?x:v);window.save();
    return eps;
  }

  async function loadDetails(x){
    const aid=Number(x?.anilist_id || x?.miruro_id || x?.api_id);
    if(!aid) return x;
    const raw=await api('/info/'+encodeURIComponent(aid));
    const d=raw?.data && isObj(raw.data) ? raw.data : raw;
    Object.assign(x,normalizeAnime(d,0),{id:x.id,miruro_id:aid,anilist_id:aid,api_id:aid,apiDetail:d});
    if(d?.characters) x.cast=d.characters;
    try{ await loadEpisodes(x); }catch(e){ console.warn('[OPAI] Miruro episodes:',e); }
    window.S.catalog=window.S.catalog.map(v=>v.id===x.id?x:v);window.save();
    return x;
  }

  async function refresh(silent=false){
    if(!hasBase){
      if(!silent) window.toast?.('⚠ Configure a URL pública da Miruro API em miruro-config.js.');
      return window.S?.catalog||[];
    }
    try{
      if(!silent) window.toast?.('⟳ Atualizando catálogo pela Miruro API...');
      const [recent,trending]=await Promise.allSettled([api('/recent?page=1&per_page=30'),api('/trending?page=1&per_page=30')]);
      const list=[];
      for(const r of [recent,trending]) if(r.status==='fulfilled') results(r.value).forEach((a,i)=>list.push(normalizeAnime(a,i)));
      const unique=[...new Map(list.map(x=>[String(x.id),x])).values()];
      if(unique.length) merge(unique);
      window.home?.();
      if(!silent) window.toast?.(`✓ ${unique.length} animes carregados pela Miruro API`);
      return window.S.catalog;
    }catch(e){
      console.warn('[OPAI] Miruro catálogo:',e);
      if(!silent) window.toast?.('Não foi possível conectar à Miruro API.');
      return window.S.catalog;
    }
  }

  async function search(q){
    if(!hasBase || !str(q)) return [];
    const raw=await api('/search?query='+encodeURIComponent(q)+'&page=1&per_page=20');
    return results(raw).map(normalizeAnime).filter(x=>x.title);
  }

  function seasonList(x){return [...new Set((x.apiEpisodes||[]).map(e=>Number(e.season)||1))].sort((a,b)=>a-b)}
  function renderEpisodes(x,season,audio){
    const panel=document.querySelector('#miruroEpisodeList');if(!panel)return;
    const eps=(x.apiEpisodes||[]).filter(e=>e.season===season&&(!audio||e.audio===audio));
    panel.innerHTML=eps.length?eps.map(e=>`<div class="eprow"><b>${e.number}</b><button class="mini" onclick="event.stopPropagation();miruroPlay('${esc(x.id)}',${e.number},'${esc(e.provider)}','${esc(e.audio)}','${esc(e.sourceId)}')">▶</button><div><b>${esc(e.title)}</b><small>${e.audio==='dub'?'Dublado':'Legendado'} · ${esc(e.provider)}${e.filler?' · Filler':''}</small></div><span class="status">${e.filler?'F':''}</span></div>`).join(''):'<div class="empty">Nenhum episódio nesta combinação.</div>';
  }

  async function details(id){
    const x=window.item(id);if(!x?.anilist_id)return;
    try{await loadDetails(x)}catch(e){console.warn('[OPAI] Miruro detalhes:',e)}
    const seasons=seasonList(x);const first=seasons[0]||1;
    document.querySelector('#page').innerHTML=`<div class="detail"><div><div class="detailposter" style="background-image:url('${esc(x.image||'')}')"></div></div><div><div class="meta">Início › Animes › ${esc(x.title)}</div><h1>${esc(x.title)}</h1><div class="meta">${x.year||'—'} · ${x.episodes||'?'} episódios · HD · ★ ${Number(x.score||0).toFixed(1)}</div><div class="chips">${(x.genres||[]).map(g=>`<span class="chip">${esc(g)}</span>`).join('')}</div><p class="desc">${esc(x.description||'')}</p><div class="actions"><button class="primary" onclick="miruroPlay('${esc(x.id)}',1)">▶ Assistir</button><button class="ghost" onclick="fav('${esc(x.id)}')">${window.S.favorites.includes(x.id)?'✓ Na minha lista':'＋ Minha Lista'}</button></div><p class="meta">Fonte: Miruro API autorizada pelo proprietário.</p><div class="tabs"><button class="active">Episódios</button><button>Detalhes</button><button>Temporadas</button><button>Elenco</button></div><div class="seasons"><div>${seasons.map((s,i)=>`<button class="season ${i===0?'active':''}" onclick="miruroSeason('${esc(x.id)}',${s},this)"><b>Temporada ${s}</b><small>${x.apiEpisodes.filter(e=>e.season===s).length} opções</small></button>`).join('')}</div><div class="chips" style="margin:12px 0"><button class="chip" onclick="window.miruroAudio='sub';miruroSeason('${esc(x.id)}',${first})">Legendado</button><button class="chip" onclick="window.miruroAudio='dub';miruroSeason('${esc(x.id)}',${first})">Dublado</button></div><div id="miruroEpisodeList" class="eplist"></div></div></div><aside><div class="source"><b>FONTE DE REPRODUÇÃO</b><p class="meta">${x.apiEpisodes?.length?'Episódios disponíveis pela API.':'Nenhum episódio retornado.'}</p></div></aside></div>`;
    window.miruroAudio='sub';renderEpisodes(x,first,'sub');
    if(!document.querySelector('#miruroEpisodeList').children.length)renderEpisodes(x,first,'');
    scrollTo(0,0);
  }

  window.miruroAudio='sub';
  window.miruroSeason=function(id,s,btn){document.querySelectorAll('.season').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');const x=window.item(id);if(x)renderEpisodes(x,Number(s),window.miruroAudio)};

  async function ensureHls(){
    if(window.Hls)return true;
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HLS;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
    return !!window.Hls;
  }

  async function play(id,n,provider,audio,sourceId){
    const x=window.item(id);if(!x)return;
    try{
      if(!x.apiEpisodes?.length)await loadEpisodes(x);
      let ep=(x.apiEpisodes||[]).find(e=>e.number===Number(n)&&(!provider||e.provider===provider)&&(!audio||e.audio===audio)&&(!sourceId||e.sourceId===sourceId));
      if(!ep)ep=(x.apiEpisodes||[]).find(e=>e.number===Number(n));
      if(!ep?.sourceId)throw new Error('ID do episódio não encontrado');
      const raw=await api('/'+ep.sourceId.replace(/^\/+/,''));
      const stream=Array.isArray(raw?.streams)?raw.streams[0]:null;
      const url=str(stream?.url||raw?.url||raw?.stream?.url);
      if(!/^https:\/\//i.test(url))throw new Error('A API não retornou uma URL HTTPS');
      const subtitles=Array.isArray(raw?.subtitles)?raw.subtitles:[];
      document.querySelector('#page').innerHTML=`<section class="player-shell"><div class="player-head"><button class="ghost" onclick="details('${esc(x.id)}')">← Voltar</button><div><h2>${esc(x.title)}</h2><div class="meta">Episódio ${Number(n)} · ${esc(ep.audio||'sub')} · ${esc(ep.provider||'')}</div></div></div><div class="sourcebar"><b>Miruro API</b><span class="meta"> Reprodução autorizada</span></div><div class="player"><video id="miruroVideo" class="videoplayer" controls playsinline preload="metadata" ${window.S.settings.autoplay?'autoplay':''}></video></div>${subtitles.length?`<div class="setting" style="margin-top:12px"><b>Legendas disponíveis</b><p class="meta">${subtitles.map(s=>esc(s.label||s.language||'Legenda')).join(' · ')}</p></div>`:''}</section>`;
      const video=document.querySelector('#miruroVideo');
      if(window.Hls && window.Hls.isSupported()){const hls=new window.Hls();hls.loadSource(url);hls.attachMedia(video);window.miruroHls=hls;}
      else if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=url;
      else {video.outerHTML='<div class="playererror"><div><h3>HLS não suportado neste navegador</h3><p>Abra em um navegador com suporte a HLS.</p></div></div>'}
      scrollTo(0,0);
    }catch(e){
      console.warn('[OPAI] Miruro play:',e);
      document.querySelector('#page').innerHTML=`<section class="player-shell"><div class="player-head"><button class="ghost" onclick="details('${esc(x.id)}')">← Voltar</button><div><h2>${esc(x.title)}</h2><div class="meta">Episódio ${Number(n)}</div></div></div><div class="player"><div class="playererror"><div><h3>Reprodução não disponível</h3><p>${esc(e.message||'A API não retornou uma fonte de reprodução.')}</p><button class="ghost" onclick="miruroPlay('${esc(x.id)}',${Number(n)},'${esc(provider||'')}','${esc(audio||'')}','${esc(sourceId||'')}')">Tentar novamente</button></div></div></div></section>`;
    }
  }
  window.miruroPlay=play;
  window.miruroApi={refresh,search,details,play,loadEpisodes,base:BASE,configured:hasBase};
  window.refreshCatalog=refresh;
  window.searchAnimeMiruro=search;
  window.details=details;
  window.play=play;
  if(hasBase)setTimeout(()=>refresh(true),250);
})();
