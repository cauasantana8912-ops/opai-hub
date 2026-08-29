/* OPAI HUB stability patch - navigation, search, tabs and theming */
(function(){
  'use strict';
  const root=document.documentElement;
  const q=s=>document.querySelector(s);
  const qa=s=>Array.from(document.querySelectorAll(s));
  const safeHex=v=>/^#[0-9a-f]{6}$/i.test(v)?v:'#7c2cff';

  function applyThemeStrong(){
    const s=(window.S&&window.S.settings)||{};
    const p=safeHex(s.accent||'#7c2cff'), p2=safeHex(s.accent2||'#b35cff'), bg=safeHex(s.bg||'#05070a');
    root.style.setProperty('--p',p); root.style.setProperty('--p2',p2); root.style.setProperty('--bg',bg);
    let style=q('#opai-theme-runtime');
    if(!style){ style=document.createElement('style'); style.id='opai-theme-runtime'; document.head.appendChild(style); }
    style.textContent=`
      :root{--p:${p};--p2:${p2};--bg:${bg};}
      body{background:radial-gradient(circle at 75% 0, color-mix(in srgb, ${p2} 18%, transparent), transparent 34%),var(--bg)!important}
      .brand span,.link,.authorized,.sectionhead button,.rank{color:${p2}!important}
      .sidebar nav button:hover,.sidebar nav button.active{background:linear-gradient(90deg,${p},color-mix(in srgb,${p} 42%,#080b10))!important}
      .primary{background:linear-gradient(135deg,color-mix(in srgb,${p} 82%,#000),${p2})!important;border-color:${p}!important}
      .tabs button.active{color:${p2}!important;border-bottom-color:${p}!important}
      .sourcebtn.active,.badge{background:${p}!important;border-color:${p2}!important}
      .chip{background:color-mix(in srgb,${p} 12%,#090d13)!important;border-color:color-mix(in srgb,${p} 45%,#252b36)!important;color:color-mix(in srgb,${p2} 80%,#fff)!important}
      .bar i{background:linear-gradient(90deg,${p},${p2})!important}
      .card:hover{border-color:${p}!important}
      .season.active{border-color:${p}!important}
      .search:focus-within{border-color:${p}!important;box-shadow:0 0 0 2px color-mix(in srgb,${p} 18%,transparent)}
      .opai-search-results{border-color:color-mix(in srgb,${p} 55%,#252b36)!important}
      .opai-search-item:hover,.opai-search-item.active{background:color-mix(in srgb,${p} 13%,#0b0f15)!important}
      .profile i{background:linear-gradient(135deg,color-mix(in srgb,${p} 55%,#000),${p2})!important}
    `;
  }

  function saveSettingsSafe(values){
    if(!window.S) return;
    S.settings=Object.assign({},S.settings,values);
    localStorage.setItem('opai_settings',JSON.stringify(S.settings));
    if(typeof window.applyTheme==='function') window.applyTheme();
    applyThemeStrong();
  }

  function openSettingsFixed(){
    const s=(window.S&&S.settings)||{quality:'Auto',autoplay:true,reduceMotion:false,accent:'#7c2cff',accent2:'#b35cff',bg:'#05070a'};
    const modal=q('#modal'); if(!modal)return;
    modal.innerHTML=`<div class="modalbg" id="settingsOverlay"><div class="modalbox opai-settings-box" role="dialog" aria-modal="true">
      <div class="modalhead"><div><h2>Personalização e configurações</h2><small>As alterações de interface são aplicadas imediatamente e ficam salvas neste dispositivo.</small></div><button class="icon" id="closeSettings">×</button></div>
      <div class="settings">
        <div class="setting"><b>Cor principal</b><div class="color-line"><input class="colorpicker" id="accent" type="color" value="${safeHex(s.accent)}"><input id="accentText" class="hexinput" value="${safeHex(s.accent)}" maxlength="7" spellcheck="false"></div><small>Botões, navegação e destaques.</small></div>
        <div class="setting"><b>Cor secundária</b><div class="color-line"><input class="colorpicker" id="accent2" type="color" value="${safeHex(s.accent2)}"><input id="accent2Text" class="hexinput" value="${safeHex(s.accent2)}" maxlength="7" spellcheck="false"></div><small>Gradientes, textos e detalhes.</small></div>
        <div class="setting"><b>Fundo do site</b><div class="color-line"><input class="colorpicker" id="bg" type="color" value="${safeHex(s.bg)}"><input id="bgText" class="hexinput" value="${safeHex(s.bg)}" maxlength="7" spellcheck="false"></div><small>Cor de fundo geral.</small></div>
        <div class="setting"><b>Temas rápidos</b><div class="presetrow"><button class="ghost" data-preset="purple">Roxo</button><button class="ghost" data-preset="blue">Azul</button><button class="ghost" data-preset="red">Vermelho</button><button class="ghost" data-preset="green">Verde</button></div></div>
      </div>
      <div class="settings single-settings"><label>Qualidade<select id="quality"><option>Auto</option><option>1080p</option><option>720p</option><option>480p</option></select></label><label><input id="autoplay" type="checkbox" ${s.autoplay?'checked':''}> Reprodução automática</label><label><input id="reduce" type="checkbox" ${s.reduceMotion?'checked':''}> Reduzir animações (desempenho)</label></div>
      <div class="settings-actions"><button class="ghost" id="resetSettings">Restaurar padrão</button><button class="primary" id="saveSettingsFixed">Salvar configurações</button></div>
    </div></div>`;
    q('#quality').value=s.quality||'Auto';
    const syncPair=(color,text)=>{const c=q(color),t=q(text);c.oninput=()=>{t.value=c.value;previewTheme()};t.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(t.value)){c.value=t.value;previewTheme()}}};
    syncPair('#accent','#accentText'); syncPair('#accent2','#accent2Text'); syncPair('#bg','#bgText');
    function previewTheme(){root.style.setProperty('--p',safeHex(q('#accent').value));root.style.setProperty('--p2',safeHex(q('#accent2').value));root.style.setProperty('--bg',safeHex(q('#bg').value));applyThemeStrong();}
    qa('[data-preset]').forEach(b=>b.onclick=()=>{const p={purple:['#7c2cff','#b35cff','#05070a'],blue:['#2563eb','#60a5fa','#030712'],red:['#dc2626','#fb7185','#090505'],green:['#16a34a','#4ade80','#030805']}[b.dataset.preset];q('#accent').value=p[0];q('#accent2').value=p[1];q('#bg').value=p[2];q('#accentText').value=p[0];q('#accent2Text').value=p[1];q('#bgText').value=p[2];previewTheme()});
    q('#saveSettingsFixed').onclick=()=>{saveSettingsSafe({accent:safeHex(q('#accent').value),accent2:safeHex(q('#accent2').value),bg:safeHex(q('#bg').value),quality:q('#quality').value,autoplay:q('#autoplay').checked,reduceMotion:q('#reduce').checked});closeSettingsFixed(); if(typeof toast==='function')toast('✓ Personalização salva e aplicada.');};
    q('#resetSettings').onclick=()=>{q('#accent').value='#7c2cff';q('#accent2').value='#b35cff';q('#bg').value='#05070a';q('#accentText').value='#7c2cff';q('#accent2Text').value='#b35cff';q('#bgText').value='#05070a';previewTheme()};
    q('#closeSettings').onclick=closeSettingsFixed; q('#settingsOverlay').onclick=e=>{if(e.target===q('#settingsOverlay'))closeSettingsFixed()};
  }
  function closeSettingsFixed(){const m=q('#modal');if(m)m.innerHTML='';applyThemeStrong()}

  function setupSearch(){
    const input=q('#search'),button=q('#searchBtn'),wrap=input?.closest('.search'); if(!input||!wrap)return;
    let box=q('#searchResults'); if(!box){box=document.createElement('div');box.id='searchResults';box.className='opai-search-results';wrap.appendChild(box)}
    let timer=0,requestId=0;
    const local=(term)=>{const list=(window.S?.catalog||[]);return list.filter(x=>`${x.title||''} ${(x.genres||[]).join(' ')} ${x.type||''}`.toLowerCase().includes(term)).slice(0,10)};
    function show(items,term,loading=false){box.innerHTML=loading?'<div class="opai-search-empty">Buscando...</div>':items.length?items.map((x,i)=>`<button class="opai-search-item" data-id="${String(x.id).replace(/[^a-zA-Z0-9_-]/g,'')}"><span class="search-thumb" style="background-image:url('${String(x.image||'').replace(/'/g,'%27')}')"></span><span><b>${escSafe(x.title)}</b><small>${x.type==='anime'?'Anime':'Série'} · ${x.year||'—'} · ★ ${Number(x.score||0).toFixed(1)}</small></span></button>`).join(''):`<div class="opai-search-empty">Nenhum resultado para “${escSafe(term)}”.</div>`;box.classList.toggle('show',true)}
    function close(){box.classList.remove('show');box.innerHTML=''}
    function run(term){term=String(term||'').trim().toLowerCase();if(!term){close();if(typeof home==='function')home();return} const list=local(term);show(list,term,false); if(list.length<5 && term.length>=2){clearTimeout(timer);const id=++requestId;show(list,term,true);timer=setTimeout(async()=>{try{const [ja,tv]=await Promise.allSettled([fetch('https://api.jikan.moe/v4/anime?q='+encodeURIComponent(term)+'&limit=8'),fetch('https://api.tvmaze.com/search/shows?q='+encodeURIComponent(term))]);let added=0;if(ja.status==='fulfilled'&&ja.value.ok){const j=await ja.value.json();(j.data||[]).forEach(a=>{if(typeof upsertAnime==='function'){upsertAnime(a);added++}})}if(tv.status==='fulfilled'&&tv.value.ok){const t=await tv.value.json();(t||[]).map(v=>v.show).forEach(a=>{if(typeof upsertSeries==='function'){upsertSeries(a);added++}})}if(id!==requestId)return;if(added&&typeof save==='function')save();const result=local(term);show(result,term,false)}catch(e){if(id===requestId)show(list,term,false)}},250)} else {renderSearchPage(term,list);}}
    function renderSearchPage(term,list){if(typeof search==='function')search(term);else {q('#page').innerHTML=`<div class="sectionhead"><h2>Resultados para “${escSafe(term)}”</h2></div><div class="grid">${list.map(x=>card(x)).join('')}</div>`}}
    box.addEventListener('click',e=>{const b=e.target.closest('.opai-search-item');if(!b)return;const id=(window.S?.catalog||[]).find(x=>String(x.id).replace(/[^a-zA-Z0-9_-]/g,'')===b.dataset.id)?.id;if(id!=null&&typeof details==='function'){details(id);close();input.value=''}});
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>run(input.value),120)});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run(input.value);close()}if(e.key==='Escape'){close();input.blur()}});
    button.onclick=e=>{e.preventDefault();run(input.value);input.focus()};
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
  }

  function escSafe(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

  function fixTabs(){
    window.detailTab=async function(tab){
      const panel=q('#detailPanel'); if(!panel)return;
      const id=panel.dataset.id; const x=(window.S?.catalog||[]).find(v=>String(v.id)===String(id)); if(!x)return;
      const labels={episodes:'Episódios',details:'Detalhes',seasons:'Temporadas',cast:'Elenco',reviews:'Avaliações'};
      qa('.tabs button').forEach(b=>b.classList.toggle('active',b.textContent.trim()===labels[tab]));
      if(typeof renderDetailPanel==='function') await renderDetailPanel(tab,x);
      panel.scrollIntoView({behavior:(S?.settings?.reduceMotion?'auto':'smooth'),block:'nearest'});
    };
    document.addEventListener('click',e=>{const b=e.target.closest('.tabs button');if(!b)return;const map={'Episódios':'episodes','Detalhes':'details','Temporadas':'seasons','Elenco':'cast','Avaliações':'reviews'};const tab=map[b.textContent.trim()];if(tab){e.preventDefault();window.detailTab(tab)}} ,true);
  }

  function improveStart(){
    applyThemeStrong();
    if(q('#settings'))q('#settings').onclick=openSettingsFixed;
    setupSearch();
    fixTabs();
    // Keep the runtime theme synchronized if another part of the app changes settings.
    const oldSave=window.save;
    if(typeof oldSave==='function'&&!oldSave.__themeWrapped){
      const wrapped=function(){const r=oldSave.apply(this,arguments);applyThemeStrong();return r};wrapped.__themeWrapped=true;window.save=wrapped;
    }
    // Repair catalog after older/localStorage versions accidentally stored only one category.
    if(window.S&&Array.isArray(S.catalog)){
      const anime=S.catalog.some(x=>x.type==='anime'),series=S.catalog.some(x=>x.type==='series');
      if((!anime||!series)&&Array.isArray(window.FALLBACK)){window.FALLBACK.forEach(x=>{if(!S.catalog.some(v=>v.id===x.id))S.catalog.push(x)});if(typeof save==='function')save();}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(improveStart,0));else setTimeout(improveStart,0);
})();
