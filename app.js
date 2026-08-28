const ANILIST="https://graphql.anilist.co";
const TVMAZE="https://api.tvmaze.com";
let anime=[], series=[], current=null, user=null, selectedSeason=1;

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const clean=s=>String(s??"").replace(/<[^>]+>/g,"").trim();
const title=x=>x?.title?.english||x?.title?.romaji||x?.name||"Sem título";
const poster=x=>x?.coverImage?.extraLarge||x?.coverImage?.large||x?.image?.original||x?.image?.medium||"https://placehold.co/400x600/11141b/cb9cff?text=OPAI+HUB";

function accounts(){try{return JSON.parse(localStorage.getItem("opaiAccounts")||"[]")}catch{return[]}}
function ensureAdmin(){let a=accounts();if(!a.some(x=>x.u==="admin")){a.unshift({u:"admin",p:"cauhub123",admin:true});localStorage.setItem("opaiAccounts",JSON.stringify(a))}return a}
function msg(t){$("authMsg").textContent=t||""}
function toggleAuth(sign){$("loginBox").hidden=sign;$("signupBox").hidden=!sign;msg("")}
function signup(){
  const u=$("signUser").value.trim(),p=$("signPass").value;
  if(!u||!p)return msg("Preencha usuário e senha.");
  const a=ensureAdmin();if(a.some(x=>x.u.toLowerCase()===u.toLowerCase()))return msg("Esse usuário já existe.");
  a.push({u,p,admin:false});localStorage.setItem("opaiAccounts",JSON.stringify(a));
  $("loginUser").value=u;$("loginPass").value=p;toggleAuth(false);msg("Conta criada. Agora clique em Entrar.")
}
function login(){
  const u=$("loginUser").value.trim(),p=$("loginPass").value;
  if(!u||!p)return msg("Digite usuário e senha.");
  const x=ensureAdmin().find(a=>a.u===u&&a.p===p);
  if(!x)return msg("Usuário ou senha incorretos.");
  user=x;localStorage.setItem("opaiSession",u);showSite()
}
function logout(){localStorage.removeItem("opaiSession");location.reload()}
function showSite(){
  $("auth").hidden=true;$("site").hidden=false;
  $("adminNav").hidden=!user?.admin;$("adminUser").textContent=user?.u||"";$("accountCount").textContent=accounts().length;
  renderContinue();loadCatalog();
}
function getProgress(){try{return JSON.parse(localStorage.getItem("opaiProgress")||"{}")}catch{return{}}}
function saveProgress(p){localStorage.setItem("opaiProgress",JSON.stringify(p))}
function progressKey(x,type){return `${type}:${x.id}`}
function markProgress(x,type,ep,total,finished=false){
  const p=getProgress(),k=progressKey(x,type);p[k]={...p[k],id:x.id,type,title:title(x),poster:poster(x),episode:ep,total,percent:finished?100:Math.max(0,Math.min(99,Math.round((ep/Math.max(total,1))*100))),updated:Date.now(),finished:!!finished};saveProgress(p);renderContinue()
}
function renderContinue(){
  const p=getProgress(),arr=Object.values(p).filter(x=>x.percent>0&&!x.finished).sort((a,b)=>b.updated-a.updated).slice(0,8);
  $("continueSection").hidden=!arr.length;
  $("continueCards").innerHTML=arr.map(x=>`<article class="card" data-continue="${x.id}" data-type="${x.type}"><div class="card-media"><img src="${x.poster}"><span class="continue-badge">${x.percent}%</span></div><div class="card-body"><div class="card-title">${esc(x.title)}</div><div class="card-sub">EP ${x.episode} de ${x.total}</div><div class="progress"><i style="width:${x.percent}%"></i></div></div></article>`).join("");
  document.querySelectorAll("[data-continue]").forEach(el=>el.onclick=()=>{const x=[...anime,...series].find(a=>String(a.id)===String(el.dataset.continue));if(x)openDetail(x,el.dataset.type)});
}
async function aniQuery(){
 const q=`query{Page(perPage:24){media(type:ANIME,sort:POPULARITY_DESC,isAdult:false){id title{romaji english}coverImage{large extraLarge}description genres episodes status season{season year}averageScore externalLinks{site url type}streamingEpisodes{title thumbnail url site}}}}`;
 const r=await fetch(ANILIST,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:q})});const j=await r.json();return j?.data?.Page?.media||[];
}
async function loadSeries(){const r=await fetch(`${TVMAZE}/shows?page=0`);return (await r.json()).slice(0,24)}
function meta(x,type){if(type==="anime")return `${x.season?.year||"—"}  •  ${x.episodes||"?"} episódios  •  ${x.status==="RELEASING"?"Em exibição":"Catálogo"}  •  HD`;return `${x.premiered?.slice(0,4)||"—"}  •  ${x.type||"Série"}  •  ${x.status||""}`}
function card(x,type){
 const p=getProgress()[progressKey(x,type)],sub=type==="anime"?`Anime${x.episodes?` • ${x.episodes} eps`:""}`:`Série${x.rating?.average?` • ★ ${x.rating.average}`:""}`;
 return `<article class="card" data-id="${esc(x.id)}" data-type="${type}"><div class="card-media"><img loading="lazy" src="${poster(x)}"><div class="card-body"><div class="card-title">${esc(title(x))}</div><div class="card-sub">${esc(sub)}</div>${p&&!p.finished?`<div class="progress"><i style="width:${p.percent}%"></i></div>`:""}</div></article>`
}
function bindCards(){
 document.querySelectorAll(".card[data-id]").forEach(el=>el.onclick=()=>{const x=[...anime,...series].find(a=>String(a.id)===String(el.dataset.id));if(x)openDetail(x,el.dataset.type)})
}
function render(id,arr,type){$(id).innerHTML=arr.map(x=>card(x,type)).join("");bindCards()}
async function loadCatalog(){
 try{
  anime=await aniQuery();series=await loadSeries();
  render("popular",anime.slice(0,6),"anime");render("new",anime.slice(6,12),"anime");render("seriesHome",series.slice(0,6),"series");
  render("animeAll",anime,"anime");render("seriesAll",series,"series");render("trendingAll",anime,"anime");render("newAll",anime.slice(6),"anime");
  $("animeCount").textContent=`${anime.length} títulos`;$("seriesCount").textContent=`${series.length} títulos`;
  current=anime[0];setHero(current);
 }catch(e){$("heroTitle").textContent="Opai Hub";$("heroDesc").textContent="Não foi possível carregar o catálogo agora. Atualize a página em alguns segundos."}
}
function setHero(x){if(!x)return;$("heroTitle").textContent=title(x);$("heroMeta").textContent=meta(x,"anime");$("heroDesc").textContent=clean(x.description).slice(0,260);$("hero").style.setProperty("--hero",`url("${poster(x)}")`);$("heroWatch").onclick=()=>openDetail(x,"anime");$("heroList").onclick=()=>toggleFavorite(x,"anime")}
function toggleFavorite(x,type){
 const k=`opaiFav:${type}`,a=JSON.parse(localStorage.getItem(k)||"[]"),id=String(x.id),i=a.findIndex(v=>String(v.id)===id);
 if(i>=0)a.splice(i,1);else a.push({id:x.id,title:title(x),poster:poster(x),type});
 localStorage.setItem(k,JSON.stringify(a));renderFavorites()
}
function renderFavorites(){let all=[];["anime","series"].forEach(t=>{try{all.push(...JSON.parse(localStorage.getItem(`opaiFav:${t}`)||"[]"))}catch{}});$("favoritesAll").innerHTML=all.map(x=>`<article class="card" data-id="${esc(x.id)}" data-type="${x.type}"><div class="card-media"><img src="${x.poster}"></div><div class="card-body"><div class="card-title">${esc(x.title)}</div><div class="card-sub">${x.type==="anime"?"Anime":"Série"}</div></div></article>`).join("");bindCards()}
function seasonsFor(x,type){if(type==="series"){const max=Math.max(1,...(x._episodes||[]).map(e=>e.season));return Array.from({length:max},(_,i)=>i+1)}return [1,2]}
async function loadSeriesEpisodes(x){if(x._episodes)return x._episodes;const r=await fetch(`${TVMAZE}/shows/${x.id}/episodes`);x._episodes=await r.json();return x._episodes}
function officialSource(x){
 const links=(x.externalLinks||[]).filter(l=>l.url);
 const preferred=links.find(l=>/Crunchyroll|Netflix|Disney|Hulu|Prime Video|Max|HBO|Apple/i.test(l.site||""))||links[0];
 return preferred||null;
}
function playerMarkup(x,type,ep=1){
 const src=officialSource(x);
 return `<div class="player"><div class="player-screen"><button class="play" data-source="${src?esc(src.url):""}" aria-label="Abrir fonte oficial">▶</button></div><div class="player-note">${src?`Fonte oficial disponível: <b>${esc(src.site)}</b>. O botão abre o serviço oficial.`:"Nenhum player/embed autorizado foi fornecido para este título. O Opai Hub não injeta players de terceiros não autorizados."}</div></div>`
}
async function openDetail(x,type){
 current=x;
 let episodes=[];
 if(type==="series")try{episodes=await loadSeriesEpisodes(x)}catch{}
 const p=getProgress()[progressKey(x,type)]||{};
 const total=type==="anime"?Math.max(1,x.episodes||12):episodes.length||8;
 const season=type==="series"?(episodes.find(e=>e.season===1)?1:episodes[0]?.season||1):1;
 selectedSeason=season;
 const src=officialSource(x);
 $("detailBody").innerHTML=`<div class="detail">
  <div class="detail-top">
   <img class="detail-poster" src="${poster(x)}" alt="">
   <div><span class="pill">${type==="anime"?"ANIME":"SÉRIE"}</span><h1>${esc(title(x))}</h1><div class="meta">${esc(meta(x,type))}</div><p class="detail-desc">${esc(clean(x.description||x.summary||"Sem descrição disponível.").slice(0,650))}</p><div class="hero-actions"><button class="primary" id="detailWatch">▶ Assistir</button><button class="secondary" id="detailFav">＋ Minha Lista</button></div><small class="verified">♧ ${src?`Fonte oficial: ${esc(src.site)}`:"Player autorizado somente quando disponibilizado pela fonte"}</small></div>
   <div class="info-box"><h3>INFORMAÇÕES</h3><p><b>Tipo</b><br>${esc(type==="anime"?(x.format||"TV"):(x.type||"Série"))}</p><p><b>Status</b><br>${esc(x.status||"—")}</p><p><b>Duração</b><br>${esc(type==="anime"?(x.duration||"24")+" min":(x.runtime||"—")+" min")}</p><p><b>Classificação</b><br>Informação pública</p></div>
  </div>
  ${playerMarkup(x,type,p.episode||1)}
  <div class="detail-tabs"><button class="active">Episódios</button><button>Detalhes</button><button>Temporadas</button></div>
  <div class="season-bar"><h3>Temporada <select class="season-select" id="seasonSelect"></select></h3><span id="seasonProgress"></span></div>
  <div class="episodes" id="episodeList"></div>
 </div>`;
 $("detailWatch").onclick=()=>playOfficial(x);
 $("detailFav").onclick=()=>toggleFavorite(x,type);
 const seasonSelect=$("seasonSelect");seasonsFor(x,type).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;seasonSelect.appendChild(o)});seasonSelect.value=String(season);
 seasonSelect.onchange=()=>renderEpisodes(x,type,episodes,Number(seasonSelect.value));
 renderEpisodes(x,type,episodes,season);
 $("details").showModal();
 document.querySelector(".player .play").onclick=()=>playOfficial(x);
}
function playOfficial(x){
 const src=officialSource(x);
 if(src)window.open(src.url,"_blank","noopener,noreferrer");
 else alert("Este título não possui uma fonte oficial de reprodução detectada no catálogo.");
}
function renderEpisodes(x,type,eps,season){
 const total=type==="anime"?Math.max(1,x.episodes||12):eps.filter(e=>e.season===season).length||1;
 const p=getProgress()[progressKey(x,type)]||{};
 const done=p.percent||0;$("seasonProgress").textContent=`${done}% concluído`;
 let list=[];
 if(type==="series"){
   list=eps.filter(e=>e.season===season).map(e=>({num:e.number,name:e.name,duration:e.runtime||"—"}));
 }else{
   list=Array.from({length:total},(_,i)=>({num:i+1,name:`Episódio ${i+1}`,duration:x.duration||24}));
 }
 $("episodeList").innerHTML=list.map(e=>{
  const watched=p.episode>=e.num&&p.percent>=Math.round((e.num/total)*100);
  const percent=p.episode===e.num?(p.percent%Math.max(1,Math.round(100/total))||p.percent):watched?100:0;
  return `<div class="episode ${watched?"played":""}"><div class="episode-num">${e.num}</div><div><div class="episode-name">${esc(e.name)}</div><div class="episode-meta">${esc(e.duration)}${e.duration!=="—"?" min":""}</div><div class="episode-progress"><i style="width:${percent}%"></i></div></div><div class="episode-actions"><button class="mini-btn watch" data-ep="${e.num}">▶ ${watched?"Reassistir":"Assistir"}</button></div></div>`
 }).join("");
 document.querySelectorAll("[data-ep]").forEach(b=>b.onclick=()=>{
   const ep=Number(b.dataset.ep),finished=ep>=total;
   markProgress(x,type,ep,total,finished);
   b.textContent=finished?"✓ Concluído":"▶ Assistir";
   renderContinue();
   renderEpisodes(x,type,eps,season);
   alert(finished?"Episódio concluído e marcado automaticamente como assistido.":"Progresso salvo. Quando chegar ao fim do episódio, ele será marcado como concluído.");
 });
}
function renderHistory(){
 const p=getProgress(),arr=Object.values(p).sort((a,b)=>b.updated-a.updated);
 $("historyAll").innerHTML=arr.length?arr.map(x=>`<article class="card"><div class="card-media"><img src="${x.poster}"></div><div class="card-body"><div class="card-title">${esc(x.title)}</div><div class="card-sub">EP ${x.episode}/${x.total} • ${x.percent}%</div><div class="progress"><i style="width:${x.percent}%"></i></div></div></article>`).join(""):`<div class="empty">Seu histórico aparecerá aqui.</div>`;
}
function showSection(id){
 document.querySelectorAll(".section").forEach(s=>s.hidden=s.id!==id);
 document.querySelectorAll(".nav,.mobile-bottom button").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
 if(id==="favorites")renderFavorites();if(id==="history")renderHistory();
 $("sidebar").classList.remove("open");
 window.scrollTo({top:0,behavior:"smooth"});
}
function doSearch(){
 const q=$("search").value.toLowerCase().trim();if(!q)return;
 const a=anime.filter(x=>title(x).toLowerCase().includes(q)),s=series.filter(x=>title(x).toLowerCase().includes(q));
 showSection("anime");$("animeAll").innerHTML=[...a.map(x=>card(x,"anime")), ...s.map(x=>card(x,"series"))].join("");bindCards()
}
document.querySelectorAll(".nav,.mobile-bottom button").forEach(b=>b.onclick=()=>showSection(b.dataset.section));
document.querySelectorAll("[data-more]").forEach(b=>b.onclick=()=>showSection(b.dataset.more==="new"?"new":b.dataset.more==="series"?"series":"anime"));
$("search").addEventListener("keydown",e=>{if(e.key==="Enter")doSearch()});
$("search").addEventListener("input",e=>{if(e.target.value.length>1)doSearch()});
$("loginBtn").onclick=login;$("signupBtn").onclick=signup;$("showSignup").onclick=()=>toggleAuth(true);$("showLogin").onclick=()=>toggleAuth(false);$("logoutBtn").onclick=logout;
document.addEventListener("keydown",e=>{if(e.key==="Enter"&& !$("auth").hidden)login()});
$("clearContinue").onclick=()=>{localStorage.removeItem("opaiProgress");renderContinue()};
$("settingsBtn").onclick=()=>{$("settings").showModal()};$("closeSettings").onclick=()=>$("settings").close();$("closeDetails").onclick=()=>$("details").close();
$("saveSettings").onclick=()=>{document.body.classList.toggle("compact",$("densitySelect").value==="compact");localStorage.setItem("opaiDensity",$("densitySelect").value);$("settings").close()};
$("menuBtn").onclick=()=>{$("sidebar").classList.toggle("open")};
const density=localStorage.getItem("opaiDensity");if(density==="compact")document.body.classList.add("compact");
ensureAdmin();
const session=localStorage.getItem("opaiSession"),found=accounts().find(a=>a.u===session);
if(found){user=found;showSite()}else{$("auth").hidden=false;$("site").hidden=true}
