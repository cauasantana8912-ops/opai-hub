const USERS_KEY='opaiHubUsers', SESSION_KEY='opaiHubSession', SETTINGS_KEY='opaiHubSettings', OFFLINE_KEY='opaiHubOffline';
const defaultUsers=[{username:'admin',password:'cauhub123',admin:true}];
const shows=[
 {title:'Solo Leveling',type:'Animes',desc:'Ação, aventura e fantasia em um mundo de portais.',art:'anime'},
 {title:'Demon Slayer',type:'Animes',desc:'Uma jornada de coragem, amizade e batalhas.',art:'anime'},
 {title:'Jujutsu Kaisen',type:'Animes',desc:'Feiticeiros enfrentam ameaças sobrenaturais.',art:'anime'},
 {title:'Série em Alta',type:'Series',desc:'Uma história para acompanhar novos episódios.',art:'series'},
 {title:'Novos Episódios',type:'Series',desc:'Descubra novidades e continue sua lista.',art:'series'},
 {title:'Descobertas',type:'Animes',desc:'Títulos para adicionar à sua lista.',art:'anime'}
];
const $=id=>document.getElementById(id);
const getUsers=()=>JSON.parse(localStorage.getItem(USERS_KEY)||'null')||defaultUsers;
const saveUsers=v=>localStorage.setItem(USERS_KEY,JSON.stringify(v));
const getOffline=()=>JSON.parse(localStorage.getItem(OFFLINE_KEY)||'[]');
const saveOffline=v=>localStorage.setItem(OFFLINE_KEY,JSON.stringify(v));
const currentUser=()=>getUsers().find(u=>u.username===localStorage.getItem(SESSION_KEY));
function detectDevice(){
  const width=Math.min(window.innerWidth,window.innerHeight);
  const mobileUA=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
  const coarse=window.matchMedia('(pointer: coarse)').matches;
  const touch='ontouchstart' in window || navigator.maxTouchPoints>0;
  // Mobile layout is selected by real mobile/tablet signals, not merely by a small browser window.
  const isMobile=width<=760 && (mobileUA || (coarse && touch));
  document.body.classList.toggle('device-mobile',isMobile);
  document.body.classList.toggle('device-desktop',!isMobile);
  document.documentElement.dataset.device=isMobile?'mobile':'desktop';
}


function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2300)}
function settings(){return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}
function applyTheme(){const s=settings();document.body.classList.toggle('light',s.theme==='light');const icon=s.theme==='light'?'☾':'☼';if($('desktopTheme'))$('desktopTheme').textContent=icon}
function showAuth(){$('authView').classList.remove('hidden');$('appView').classList.add('hidden')}
function showApp(){const u=currentUser();if(!u)return showAuth();$('authView').classList.add('hidden');$('appView').classList.remove('hidden');$('desktopUser').textContent='@'+u.username;$('userCount').textContent=getUsers().length;$('desktopAdmin').classList.toggle('hidden',!u.admin);$('mobileAdmin').classList.toggle('hidden',!u.admin);renderCards('desktopCards');renderCards('mobileCards');renderOffline();applyTheme()}
function cardHTML(item){return `<article class="show-card" data-type="${item.type}" data-title="${item.title.toLowerCase()}"><div class="poster ${item.art}"><span class="poster-label">${item.type==='Animes'?'ANIME':'SÉRIE'}</span></div><h3>${item.title}</h3><p>${item.desc}</p><div class="card-row"><button class="primary watch" data-title="${item.title}">▶ Assistir</button><button class="save" title="Salvar">♡</button><button class="download" title="Adicionar ao Offline" data-download="${item.title}">⇩</button></div></article>`}
function renderCards(id,filter='all',query=''){const box=$(id);if(!box)return;const q=query.toLowerCase().trim();const list=shows.filter(x=>(filter==='all'||x.type===filter)&&(!q||(`${x.title} ${x.type} ${x.desc}`).toLowerCase().includes(q)));box.innerHTML=list.length?list.map(cardHTML).join(''):'<p class="offline-empty">Nenhum título encontrado.</p>';bindCardButtons(box)}
function bindCardButtons(box){box.querySelectorAll('.watch').forEach(b=>b.onclick=()=>openPlayer(b.dataset.title));box.querySelectorAll('.download').forEach(b=>b.onclick=()=>addOffline(b.dataset.download));box.querySelectorAll('.save').forEach(b=>b.onclick=()=>{b.textContent=b.textContent==='♡'?'♥':'♡';toast(b.textContent==='♥'?'Adicionado à lista!':'Removido da lista.')})}
function addOffline(title){const list=getOffline();if(!list.includes(title)){list.push(title);saveOffline(list);renderOffline();toast(`${title} foi para Offline.`)}else toast('Esse título já está em Offline.')}
function renderOffline(){const list=getOffline();const html=list.length?list.map(t=>`<div class="offline-card"><div><strong>${t}</strong><span>Download oficial disponível quando a fonte permitir.</span></div><button class="primary" data-offplay="${t}">▶ Abrir</button><button class="download" data-offremove="${t}">×</button></div>`).join(''):'<div class="offline-empty">Sua área Offline está vazia.<br>Use ⇩ em um título para adicioná-lo aqui.</div>';['desktopOffline','mobileOffline'].forEach(id=>{const box=$(id);if(!box)return;box.innerHTML=html;box.querySelectorAll('[data-offplay]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.offplay));box.querySelectorAll('[data-offremove]').forEach(b=>b.onclick=()=>{saveOffline(getOffline().filter(x=>x!==b.dataset.offremove));renderOffline()})})}
function openPlayer(title){$('playerTitle').textContent=title;$('playerDialog').showModal()}
$('closePlayer').onclick=()=>$('playerDialog').close();$('playerDialog').addEventListener('click',e=>{if(e.target===$('playerDialog'))$('playerDialog').close()});

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');const login=b.dataset.auth==='login';$('loginForm').classList.toggle('hidden',!login);$('registerForm').classList.toggle('hidden',login)});
$('loginForm').onsubmit=e=>{e.preventDefault();const u=$('loginUser').value.trim(),p=$('loginPass').value;const found=getUsers().find(x=>x.username.toLowerCase()===u.toLowerCase()&&x.password===p);if(!found)return toast('Usuário ou senha inválidos.');localStorage.setItem(SESSION_KEY,found.username);toast('Login realizado!');showApp()};
$('registerForm').onsubmit=e=>{e.preventDefault();const u=$('registerUser').value.trim(),p=$('registerPass').value,p2=$('registerPass2').value;if(p!==p2)return toast('As senhas não conferem.');const list=getUsers();if(list.some(x=>x.username.toLowerCase()===u.toLowerCase()))return toast('Esse usuário já existe.');list.push({username:u,password:p,admin:false});saveUsers(list);localStorage.setItem(SESSION_KEY,u);toast('Conta criada!');showApp()};
function logout(){localStorage.removeItem(SESSION_KEY);showAuth();toast('Você saiu da conta.')}
$('desktopLogout').onclick=logout;
$('desktopTheme').onclick=()=>{const s=settings();s.theme=s.theme==='light'?'dark':'light';localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));applyTheme()};
$('desktopAdmin').onclick=()=>{if(currentUser()?.admin)$('adminDialog').showModal()};$('mobileAdmin').onclick=()=>{if(currentUser()?.admin)$('adminDialog').showModal()};$('closeAdmin').onclick=()=>$('adminDialog').close();
function filterUI(kind,filter){document.querySelectorAll(kind).forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));renderCards(kind.includes('mfilter')?'mobileCards':'desktopCards',filter)}
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>filterUI('.filter',b.dataset.filter));document.querySelectorAll('.mfilter').forEach(b=>b.onclick=()=>filterUI('.mfilter',b.dataset.filter));
$('desktopSearch').oninput=e=>{renderCards('desktopCards','all',e.target.value);renderCards('mobileCards','all',e.target.value)};
$('mobileSearchBtn').onclick=()=>{$('mobileSearchWrap').classList.toggle('hidden');if(!$('mobileSearchWrap').classList.contains('hidden'))$('mobileSearch').focus()};$('mobileSearchClose').onclick=()=>$('mobileSearchWrap').classList.add('hidden');$('mobileSearch').oninput=e=>renderCards('mobileCards','all',e.target.value);
document.querySelectorAll('.watch-mini').forEach(b=>b.onclick=()=>openPlayer(b.dataset.title));$('mobileAccount').onclick=()=>{const u=currentUser();if(u?.admin)$('adminDialog').showModal();else toast(`Conta: @${u?.username||''}`)};
detectDevice();window.addEventListener('resize',detectDevice);window.addEventListener('orientationchange',detectDevice);applyTheme();if(localStorage.getItem(SESSION_KEY))showApp();else showAuth();
