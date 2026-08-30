/* OPAI HUB runtime fixes: API catalog titles + authorized API playback + search/navigation repair. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function cleanCatalog(){
    if(!window.S||!Array.isArray(S.catalog))return;
    let changed=false;
    S.catalog.forEach(x=>{
      const title=String(x.title||'').trim();
      if(!title||/^sem título$/i.test(title)||/^undefined$/i.test(title)){
        const raw=x.apiRaw||x.apiDetail||{};
        const nested=raw?.anime&&typeof raw.anime==='object'?raw.anime:{};
        const t=raw.title||raw.name||raw.nome||raw.titulo||raw.animeTitle||raw.anime_name||nested.title||nested.name||nested.nome;
        if(t){x.title=String(t);changed=true;}
      }
      if(x.sources) x.sources=x.sources.filter(s=>s&&(!s.url||s.url!=='https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'));
    });
    if(changed)window.save();
  }

  function markProgress(id,n,pct,done){
    if(!window.S)return;
    S.progress[id+':'+n]={pct:done?100:Math.max(0,Math.min(99,Number(pct)||0)),done:!!done};
    localStorage.setItem('opai_progress',JSON.stringify(S.progress));
  }

  async function apiPlay(id,n){
    if(!window.animeApi?.play)return null;
    try{return await window.animeApi.play(id,Number(n)||1);}catch(e){return null;}
  }

  async function renderApiPlayer(id,n){
    const x=(window.S?.catalog||[]).find(v=>String(v.id)===String(id));
    if(!x)return;
    $('#page').innerHTML=`<section class="player-shell"><div class="player-head"><button class="ghost" id="backDetails">← Voltar</button><div><h2>${esc(x.title||'Anime')}</h2><div class="meta">Episódio ${Number(n)||1}</div></div></div><div class="sourcebar"><b>Fonte de reprodução</b><span class="meta"> Carregando...</span></div><div class="player"><div class="playererror"><div><div style="font-size:48px">⏳</div><h3>Carregando reprodução...</h3><p>Obtendo o player pela fonte configurada.</p></div></div></div></section>`;
    $('#backDetails')?.addEventListener('click',()=>window.details(id));
    scrollTo(0,0);

    const result=await apiPlay(id,n);
    if(!result?.url || !/^https:\/\//i.test(result.url)){
      const box=$('.player');
      if(box)box.innerHTML=`<div class="playererror"><div><div style="font-size:48px">▶</div><h3>Reprodução não disponível</h3><p>A API não retornou um endereço HTTPS de reprodução para este episódio.</p><button class="ghost" id="retryPlayer">Tentar novamente</button></div></div>`;
      $('#retryPlayer')?.addEventListener('click',()=>renderApiPlayer(id,n));
      return;
    }

    const title=esc(x.title||'Anime');
    const url=esc(result.url);
    const box=$('.player');
    const isVideo=/\.(mp4|webm|m3u8)(\?|$)/i.test(result.url);
    if(box){
      box.innerHTML=isVideo
        ?`<video class="videoplayer" controls playsinline autoplay poster="${esc(x.image||'')}" src="${url}"></video>`
        :`<iframe class="embedframe" src="${url}" title="${title} — episódio ${Number(n)||1}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    }
    const bar=$('.sourcebar');if(bar)bar.innerHTML='<b>Fonte de reprodução</b><span class="meta"> API gratuita de anime · reprodução autorizada</span>';
    const media=$('.videoplayer');
    if(media){
      media.addEventListener('timeupdate',()=>{if(media.duration)markProgress(id,n,(media.currentTime/media.duration)*100,false)});
      media.addEventListener('ended',()=>{markProgress(id,n,100,true);if(typeof toast==='function')toast('✓ Episódio concluído automaticamente.');});
    }
    scrollTo(0,0);
  }

  function overridePlay(){
    window.play=function(id,n){renderApiPlayer(id,Number(n)||1);};
    window.watch=function(id,n){window.play(id,n);};
  }

  function doSearch(term){
    term=String(term||'').trim();
    const list=(window.S?.catalog||[]).filter(x=>`${x.title||''} ${(x.genres||[]).join(' ')} ${x.type||''} ${x.year||''}`.toLowerCase().includes(term.toLowerCase()));
    const page=$('#page');if(!page)return;
    if(!term){if(typeof home==='function')home();return;}
    page.innerHTML=`<section class="section"><div class="sectionhead"><h2>🔎 Resultados para “${esc(term)}”</h2><span class="meta">${list.length} resultado(s)</span></div><div class="grid">${list.length?list.map(x=>typeof card==='function'?card(x):'').join(''):`<div class="empty">Nenhum resultado encontrado.</div>`}</div></section>`;
  }

  function repairSearch(){
    const input=$('#search'),btn=$('#searchBtn'),wrap=input?.closest('.search');if(!input||!wrap)return;
    input.disabled=false;input.readOnly=false;input.style.pointerEvents='auto';wrap.style.position='relative';wrap.style.zIndex='1000';
    btn&&(btn.disabled=false,btn.style.pointerEvents='auto');
    if(input.dataset.repaired==='1')return;input.dataset.repaired='1';
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();doSearch(input.value);input.blur();}},true);
    btn?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();doSearch(input.value);},true);
  }

  function repairNavigation(){
    const nav=$('#nav');if(!nav)return;nav.style.pointerEvents='auto';
    $$('#nav button[data-route]').forEach(btn=>{btn.disabled=false;btn.style.pointerEvents='auto';if(btn.dataset.repaired==='1')return;btn.dataset.repaired='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const r=btn.dataset.route;if(r==='admin'&&window.S?.user?.role!=='admin'&&window.S?.user?.username!=='admin')return;if(typeof window.route==='function')window.route(r);},true);});
  }

  function repairTabs(){$$('.tabs button').forEach(btn=>{btn.disabled=false;btn.style.pointerEvents='auto';});}

  async function bootApi(){
    cleanCatalog();
    if(!window.animeApi?.refresh)return;
    // Do not replace the working catalog on an API failure.
    try{await window.animeApi.refresh(true);cleanCatalog();}catch(e){}
  }

  function start(){
    cleanCatalog();overridePlay();repairSearch();repairNavigation();repairTabs();
    setTimeout(()=>{repairSearch();repairNavigation();repairTabs();},500);
    setTimeout(bootApi,800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,80));else setTimeout(start,80);
  window.addEventListener('load',()=>setTimeout(start,150));
})();
