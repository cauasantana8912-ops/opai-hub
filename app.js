const A="https://graphql.anilist.co";let current=null,anime=[],tv=[],user=null;
function toggleAuth(){document.getElementById("loginBox").hidden=!document.getElementById("loginBox").hidden;document.getElementById("signupBox").hidden=!document.getElementById("signupBox").hidden}
document.addEventListener("keydown",e=>{
  if(e.key==="Enter" && !document.getElementById("auth").hidden){
    if(!document.getElementById("loginBox").hidden) login(); else signup();
  }
});
function accounts(){
  try { return JSON.parse(localStorage.getItem("opaiAccounts") || "[]"); }
  catch(e){ localStorage.removeItem("opaiAccounts"); return []; }
}
function ensureAdmin(){
  const a=accounts();
  if(!a.some(x=>x.u==="admin")){
    a.push({u:"admin",p:"cauhub123",admin:true});
    localStorage.setItem("opaiAccounts",JSON.stringify(a));
  }
  return a;
}
function signup(){
  const u=document.getElementById("signUser").value.trim();
  const p=document.getElementById("signPass").value;
  if(!u||!p) return alert("Preencha usuário e senha.");
  const a=ensureAdmin();
  if(a.some(x=>x.u===u)) return alert("Usuário já existe.");
  a.push({u,p,admin:false});
  localStorage.setItem("opaiAccounts",JSON.stringify(a));
  document.getElementById("loginUser").value=u;
  document.getElementById("loginPass").value=p;
  toggleAuth();
  alert("Conta criada! Agora clique em Entrar.");
}
function login(){
  const u=document.getElementById("loginUser").value.trim();
  const p=document.getElementById("loginPass").value;
  if(!u||!p) return alert("Digite usuário e senha.");
  const a=ensureAdmin();
  const x=a.find(acc=>acc.u===u && acc.p===p);
  if(!x) return alert("Usuário ou senha incorretos.");
  user=x;
  localStorage.setItem("opaiSession",u);
  showSite();
}
function logout(){
  localStorage.removeItem("opaiSession");
  location.rewindow.addEventListener("load", load);
}
function showSite(){
  document.getElementById("auth").hidden=true;
  document.getElementById("site").hidden=false;
  document.getElementById("adminNav").hidden=!user.admin;
  document.getElementById("adminUser").textContent=user.u;
  document.getElementById("accountCount").textContent=accounts().length;
}
function openSettings(){settings.showModal()}
function showSection(s){document.querySelectorAll(".section").forEach(x=>x.hidden=true);let id=s==="series"?"seriesPage":s;$(id).hidden=false}
const $=id=>document.getElementById(id);
async function aniQuery(sort="TRENDING_DESC"){let q=`query{Page(perPage:12){media(type:ANIME,sort:${sort},isAdult:false){id title{romaji english}coverImage{large}description genres episodes status season{season year}averageScore}}}`;let r=await fetch(A,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:q})});return (await r.json()).data.Page.media}
async function loadSeries(){let r=await fetch("https://api.tvmaze.com/shows?page=0");return (await r.json()).slice(0,12)}
function name(x){return x.title?.english||x.title?.romaji||x.name||"Sem título"}function clean(s){return(s||"").replace(/<[^>]+>/g,"").slice(0,220)}function poster(x){return x.coverImage?.large||x.image?.original||"https://placehold.co/300x450/151821/fff?text=OPAI"}
function card(x,type){return `<article class="card" onclick='openDetail(${JSON.stringify(x).replace(/'/g,"&#39;")},"${type}")'><img src="${poster(x)}"><b>${name(x)}</b><small>${type==="anime"?"Anime":"Série"}${x.episodes?" • "+x.episodes+" eps":""}</small></article>`}
function render(id,arr,type){$(id).innerHTML=arr.map(x=>card(x,type)).join("")}
async function load(){try{anime=await aniQuery();tv=await loadSeries();render("popular",anime.slice(0,6),"anime");render("new",anime.slice(6,12),"anime");render("seriesHome",tv.slice(0,6),"series");render("animeAll",anime,"anime");render("seriesAll",tv,"series");current=anime[0];heroTitle.textContent=name(current);heroDesc.textContent=clean(current.description);search.oninput=()=>{let q=search.value.toLowerCase();render("popular",anime.filter(x=>name(x).toLowerCase().includes(q)),"anime")}}catch(e){heroTitle.textContent="Opai Hub";heroDesc.textContent="Não foi possível carregar o catálogo agora."}}
function openCurrent(){openDetail(current,"anime")}
function openDetail(x,type){let seasons=x.season?.year?`Temporada ${x.season.year}`:"Temporadas disponíveis";detailBody.innerHTML=`<h1>${name(x)}</h1><div style="display:grid;grid-template-columns:180px 1fr;gap:20px"><img src="${poster(x)}" style="width:180px;border-radius:9px"><div><p>${clean(x.description||x.summary)}</p><p><b>${type==="anime"?"Anime":"Série"}</b> • ${seasons} ${x.episodes?"• "+x.episodes+" episódios":""}</p><h3>Temporadas e episódios</h3><div id="episodes"><p class="notice">Os metadados de episódios/temporadas são carregados quando a fonte pública disponibiliza esses dados.</p><button class="primary" onclick="loadEpisodes('${x.id}','${type}')">Carregar episódios</button></div></div></div><div class="empty" style="margin-top:20px;text-align:center">▶ Área de reprodução — somente conteúdo autorizado.</div>`;details.showModal()}
async function loadEpisodes(id,type){let el=$("episodes");if(type==="series"){let r=await fetch("https://api.tvmaze.com/shows/"+id+"/episodes");let eps=await r.json();el.innerHTML=eps.map(e=>`<div style="padding:9px;border-bottom:1px solid #252833"><b>T${e.season} • E${e.number}</b> — ${e.name}</div>`).join("")}else el.innerHTML="<p>Para animes, a API pública fornece temporadas/episódios quando disponíveis no registro. A reprodução deve usar uma fonte autorizada.</p>"}
ensureAdmin();
let session=localStorage.getItem("opaiSession"),storedAccounts=accounts();
if(session){
  user=storedAccounts.find(acc=>acc.u===session);
  if(user) showSite();
  else localStorage.removeItem("opaiSession");
}
if(!user){
  document.getElementById("auth").hidden=false;
  document.getElementById("site").hidden=true;
}
window.addEventListener("load", load);
