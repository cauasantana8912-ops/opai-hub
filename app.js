const USERS_KEY='opaiHubUsers', SESSION_KEY='opaiHubSession', SETTINGS_KEY='opaiHubSettings';
const defaultUsers=[{username:'admin',password:'cauhub123',admin:true}];
const $=id=>document.getElementById(id);
function users(){return JSON.parse(localStorage.getItem(USERS_KEY)||'null')||defaultUsers}
function saveUsers(v){localStorage.setItem(USERS_KEY,JSON.stringify(v))}
function session(){return localStorage.getItem(SESSION_KEY)}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('show'),2200)}
function getSettings(){return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}
function applySettings(){const s=getSettings();const root=document.documentElement;const accents={purple:['#7b3ff2','#e040fb'],pink:['#d026d8','#ff4fb3'],blue:['#3975ff','#6c5ce7']};const a=accents[s.accent]||accents.purple;root.style.setProperty('--accent',a[0]);root.style.setProperty('--accent2',a[1]);document.body.classList.toggle('compact',s.density==='compact');document.body.classList.toggle('light',s.theme==='light');if($('themeBtn'))$('themeBtn').textContent=s.theme==='light'?'☾':'☼'}
function showAuth(){$('authView').classList.remove('hidden');$('appView').classList.add('hidden')}
function showApp(){const u=users().find(x=>x.username===session());if(!u){localStorage.removeItem(SESSION_KEY);return showAuth()}$('authView').classList.add('hidden');$('appView').classList.remove('hidden');$('userBadge').textContent=`@${u.username}`;$('userCount').textContent=users().length;applySettings();}

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const login=btn.dataset.auth==='login';$('loginForm').classList.toggle('hidden',!login);$('registerForm').classList.toggle('hidden',login)}));
$('loginForm').addEventListener('submit',e=>{e.preventDefault();const u=$('loginUser').value.trim(),p=$('loginPass').value,found=users().find(x=>x.username.toLowerCase()===u.toLowerCase()&&x.password===p);if(!found)return toast('Usuário ou senha inválidos.');localStorage.setItem(SESSION_KEY,found.username);toast('Login realizado!');showApp()});
$('registerForm').addEventListener('submit',e=>{e.preventDefault();const u=$('registerUser').value.trim(),p=$('registerPass').value,p2=$('registerPass2').value;if(p!==p2)return toast('As senhas não conferem.');if(u.length<3)return toast('O usuário precisa ter pelo menos 3 caracteres.');const list=users();if(list.some(x=>x.username.toLowerCase()===u.toLowerCase()))return toast('Esse usuário já existe.');list.push({username:u,password:p,admin:false});saveUsers(list);localStorage.setItem(SESSION_KEY,u);toast('Conta criada com sucesso!');showApp()});
$('logoutBtn').onclick=()=>{localStorage.removeItem(SESSION_KEY);showAuth();toast('Você saiu da conta.')};
$('themeBtn').onclick=()=>{const s=getSettings();s.theme=s.theme==='light'?'dark':'light';localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));applySettings()};
function filterCards(){const q=$('searchInput').value.toLowerCase().trim();const active=document.querySelector('.category.active')?.dataset.category||'all';let visible=0;document.querySelectorAll('.content-card').forEach(c=>{const okCat=active==='all'||active==='Mais'||c.dataset.category===active;const okText=!q||c.dataset.search.includes(q);const show=okCat&&okText;c.classList.toggle('hidden',!show);if(show)visible++});$('emptyState').classList.toggle('hidden',visible>0)}
$('searchInput').addEventListener('input',filterCards);$('searchBtn').onclick=()=>{filterCards();$('explorar').scrollIntoView({behavior:'smooth'});};
document.querySelectorAll('.category').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.category').forEach(b=>b.classList.remove('active'));btn.classList.add('active');filterCards()}));
$('showAllBtn').onclick=()=>{document.querySelectorAll('.category').forEach(b=>b.classList.toggle('active',b.dataset.category==='all'));$('searchInput').value='';filterCards()};
document.querySelectorAll('.bookmark').forEach(btn=>btn.addEventListener('click',()=>{btn.textContent=btn.textContent==='♡'?'♥':'♡';toast(btn.textContent==='♥'?'Conteúdo salvo!':'Conteúdo removido dos salvos.') }));
const user=()=>users().find(x=>x.username===session());
const adminLink=document.createElement('button');adminLink.className='outline-btn';adminLink.textContent='Admin';adminLink.style.display='none';$('logoutBtn').before(adminLink);adminLink.onclick=()=>{$('adminPanel').classList.remove('hidden');$('adminPanel').scrollIntoView({behavior:'smooth'})};
function updateAdmin(){const u=user();adminLink.style.display=u?.admin?'inline-block':'none';$('userCount').textContent=users().length}
const oldShowApp=showApp;
window.showApp=()=>{oldShowApp();updateAdmin()};
$('closeAdmin').onclick=()=>{$('adminPanel').classList.add('hidden')};
applySettings();if(session())showApp();else showAuth();


// Mobile navigation
document.querySelectorAll('.mobile-nav a').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.mobile-nav a').forEach(a=>a.classList.remove('active'));link.classList.add('active')}));
$('mobileSearch')?.addEventListener('click',()=>setTimeout(()=>$('searchInput')?.focus(),250));
