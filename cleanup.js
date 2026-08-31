/* OPAI HUB UI cleanup: films and downloads are intentionally disabled. */
(function(){
'use strict';
const blocked=new Set(['films','downloads']);
function hideLegacyNav(){
  document.querySelectorAll('[data-route="films"],[data-route="downloads"]').forEach(el=>el.remove());
  document.querySelectorAll('[data-route="films"],[data-route="downloads"]').forEach(el=>el.remove());
}
function guardRoute(){
  const original=window.route;
  if(typeof original!=='function') return;
  window.route=function(name){
    if(blocked.has(String(name))) return original('home');
    return original.apply(this,arguments);
  };
}
function removeLegacyLabels(){
  document.querySelectorAll('*').forEach(el=>{
    if(el.children.length===0){
      const t=(el.textContent||'').trim();
      if(t==='Downloads'||t==='Filmes') el.remove();
    }
  });
}
function init(){hideLegacyNav();guardRoute();removeLegacyLabels();}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
new MutationObserver(()=>{hideLegacyNav();}).observe(document.documentElement,{subtree:true,childList:true});
})();
