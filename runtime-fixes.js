/* OPAI HUB runtime repair: remove demo flower, provide authorized trailer playback, and make navigation/search reliable. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  const OFFICIAL={
    solo:'https://www.youtube.com/embed/q-dWExDv3RE?rel=0&modestbranding=1',
  };

  function cleanSources(){
    if(!window.S||!Array.isArray(S.catalog))return;
    let changed=false;
    S.catalog.forEach(x=>{
      const before=JSON.stringify(x.sources||[]);
      x.sources=(x.sources||[]).filter(src=>src&&src.url&&src.url!== 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4');
      if(x.id==='solo'){
        x.sources=[{name:'Trailer oficial — Crunchyroll Brasil',type:'embed',url:OFFICIAL.solo,authorized:true}];
      }
      if(before!==JSON.stringify(x.sources))changed=true;
    });
    if(changed&&typeof localStorage!=='undefined')localStorage.setItem('opai_catalog',JSON.stringify(S.catalog));
  }

  function markProgress(id,n,pct,done){
    if(!window.S)return;
    S.progress[id+':'+n]={pct:done?100:Math.max(0,Math.min(99,Number(pct)||0)),done:!!done};
    localStorage.setItem('opai_progress',JSON.stringify(S.progress));
  }

  function renderPlayer(id,n){
    const x=(window.S?.catalog||[]).find(v=>String(v.id)===String(id));
    if(!x)return;
    const src=(x.sources||[]).find(s=>s&&s.url&&s.authorized&&/^https:\/\//i.test(s.url));
    const poster=esc(x.image||'');
    const title=esc(x.title);
    const hasEmbed=src&&src.type==='embed';
    const hasVideo=src&&src.type==='video';
    $('#page').innerHTML=`<section class="player-shell">
      <div class="player-head"><button class="ghost" onclick="details('${esc(x.id)}')">← Voltar</button><div><h2>${title}</h2><div class="meta">Episódio ${n} · Reprodução autorizada</div></div></div>
      <div class="sourcebar"><b>Fontes de reprodução</b><div class="sourcebuttons">${src?`<button class="sourcebtn active">${esc(src.name||'Fonte autorizada')}</button>`:'<span class="meta">Nenhuma fonte autorizada configurada para este título.</span>'}</div></div>
      <div class="player">
        ${hasEmbed?`<iframe class="embedframe" src="${esc(src.url)}" title="${title} — episódio ${n}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`:''}
        ${hasVideo?`<video class="videoplayer" controls playsinline poster="${poster}" src="${esc(src.url)}"></video>`:''}
        ${!src?`<div class="playererror"><div><div style="font-size:48px">▶</div><h3>Reprodução não disponível</h3><p>Este título não possui um embed autorizado configurado. A imagem do anime é mantida como capa, sem usar vídeos de demonstração.</p></div></div>`:''}
      </div>
      <div class="player-actions"><div><b>Episódio ${n}</b><div class="meta">${title}</div></div><button class="primary" id="finishEpisode">✓ Marcar como assistido</button></div>
    </section>`;
    $('#finishEpisode')?.addEventListener('click',()=>{markProgress(x.id,n,100,true);if(typeof toast==='function')toast('✓ Episódio marcado como assistido.');});
    const media=$('.videoplayer');
    if(media){media.addEventListener('timeupdate',()=>{if(media.duration){const pct=(media.currentTime/media.duration)*100;markProgress(x.id,n,pct,pct>=90)}});media.addEventListener('ended',()=>{markProgress(x.id,n,100,true);if(typeof toast==='function')toast('✓ Episódio concluído automaticamente.');});}
    scrollTo(0,0);
  }

  function overridePlay(){
    window.play=function(id,n){cleanSources();renderPlayer(id,Number(n)||1);};
    window.watch=function(id,n){window.play(id,n);};
  }

  function doSearch(term){
    term=String(term||'').trim();
    const list=(window.S?.catalog||[]).filter(x=>`${x.title||''} ${(x.genres||[]).join(' ')} ${x.type||''} ${x.year||''}`.toLowerCase().includes(term.toLowerCase()));
    const page=$('#page'); if(!page)return;
    if(!term){if(typeof home==='function')home();return;}
    page.innerHTML=`<section class="section"><div class="sectionhead"><h2>🔎 Resultados para “${esc(term)}”</h2><span class="meta">${list.length} resultado(s)</span></div><div class="grid">${list.length?list.map(x=>typeof card==='function'?card(x):'').join(''):`<div class="empty">Nenhum resultado encontrado.</div>`}</div></section>`;
  }

  function repairSearch(){
    const input=$('#search'),btn=$('#searchBtn'),wrap=input?.closest('.search');
    if(!input||!wrap)return;
    input.disabled=false;input.readOnly=false;input.style.pointerEvents='auto';
    wrap.style.position='relative';wrap.style.zIndex='1000';
    btn&&(btn.disabled=false,btn.style.pointerEvents='auto');
    const run=e=>{if(e)e.preventDefault();doSearch(input.value);};
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){run(e);input.blur();}});
    btn?.addEventListener('click',run);
    // Capture phase prevents older handlers from swallowing the click/keypress.
    input.addEventListener('click',e=>e.stopPropagation(),true);
  }

  function repairNavigation(){
    const nav=$('#nav');if(!nav)return;
    nav.style.pointerEvents='auto';
    $$('#nav button[data-route]').forEach(btn=>{
      btn.disabled=false;btn.style.pointerEvents='auto';
      btn.addEventListener('click',e=>{
        e.preventDefault();e.stopImmediatePropagation();
        const r=btn.dataset.route;
        if(r==='admin'&&window.S?.user?.role!=='admin'&&window.S?.user?.username!=='admin')return;
        if(typeof window.route==='function')window.route(r);
        else if(r==='home'&&typeof home==='function')home();
      },true);
    });
  }

  function repairTabs(){
    $$('.tabs button').forEach(btn=>{btn.disabled=false;btn.style.pointerEvents='auto';});
  }

  function start(){
    cleanSources();
    overridePlay();
    repairSearch();
    repairNavigation();
    repairTabs();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,50));else setTimeout(start,50);
  window.addEventListener('load',()=>setTimeout(start,100));
})();
