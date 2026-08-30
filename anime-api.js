/* OPAI HUB - integração com a API de anime autorizada pelo proprietário.
 * Base: https://apigratuita-animesgratis-derq.vercel.app/
 * O adaptador aceita vários formatos comuns de JSON para evitar cards sem título.
 */
(function(){
  'use strict';
  const BASE='https://apigratuita-animesgratis-derq.vercel.app';

  const first=(o,keys,fallback='')=>{
    if(!o||typeof o!=='object') return fallback;
    for(const k of keys){
      const v=o[k];
      if(v!==undefined&&v!==null&&String(v).trim()!=='') return v;
    }
    return fallback;
  };
  const listOf=(o)=>{
    if(Array.isArray(o)) return o;
    if(!o||typeof o!=='object') return [];
    for(const k of ['data','results','animes','anime','items','list','catalog','catalogo','episodes','episodios','docs']){
      if(Array.isArray(o[k])) return o[k];
    }
    return [];
  };
  const cleanTitle=(o)=>{
    const nested=o?.anime&&typeof o.anime==='object'?o.anime:null;
    return String(first(o,['title','name','nome','titulo','animeTitle','anime_title','animeName','anime_name'],
      first(nested,['title','name','nome','titulo'],''))||'').trim();
  };
  const imageOf=(o)=>{
    const v=first(o,['image','poster','cover','thumbnail','thumb','imagem','capa','posterUrl','poster_url','imageUrl','image_url'],'');
    if(typeof v==='string') return v;
    if(v&&typeof v==='object') return first(v,['large','original','url','src','medium','image'],'');
    return '';
  };
  const normalizeEpisode=(e,i)=>({
    number:Number(first(e,['number','episode','episodeNumber','episode_number','ep','num','numero','n'],i+1))||i+1,
    title:String(first(e,['title','name','nome','titulo'],`Episódio ${i+1}`)),
    token:first(e,['token','playToken','play_token','videoToken','video_token','streamToken','stream_token','idToken'],null),
    url:first(e,['url','video','videoUrl','video_url','link','embed','embedUrl','embed_url','stream','streamUrl','stream_url'],null),
    raw:e
  });
  const normalizeAnime=(a,i)=>{
    const nested=a?.anime&&typeof a.anime==='object'?a.anime:null;
    const src=nested?{...nested,...a}:a;
    const id=String(first(src,['id','animeId','anime_id','slug','mal_id','code'],`api-${i}`));
    const title=cleanTitle(src)||`Anime ${i+1}`;
    const eps=first(src,['episodes','episodeCount','episode_count','totalEpisodes','total_episodes','episodios','quantidadeEpisodios'],0);
    return {
      id:'api-'+id, api_id:id, api_slug:String(first(src,['slug'],id)),
      title, type:'anime',
      year:Number(first(src,['year','releaseYear','release_year','ano'],0))||0,
      score:Number(first(src,['score','rating','nota','ratingScore'],0))||0,
      genres:(Array.isArray(src.genres)?src.genres:(Array.isArray(src.generos)?src.generos:[])).map(g=>typeof g==='string'?g:(g?.name||g?.nome||'')).filter(Boolean),
      episodes:Number(eps)||0,
      image:imageOf(src),
      description:String(first(src,['description','synopsis','sinopse','descricao'], 'Sem sinopse disponível.')),
      status:String(first(src,['status','state','situacao'],'Informação pública')),
      source:'API gratuita de anime', sources:[], apiRaw:a
    };
  };
  async function apiJSON(path){
    const r=await fetch(BASE+path,{headers:{Accept:'application/json'}});
    if(!r.ok) throw new Error('API '+r.status);
    return r.json();
  }
  async function loadList(){
    const raw=await apiJSON('/animes');
    return listOf(raw).map(normalizeAnime).filter(x=>x.title);
  }
  function merge(list){
    const existing=new Map((window.S?.catalog||[]).map(x=>[String(x.id),x]));
    for(const x of list){
      const old=existing.get(String(x.id));
      existing.set(String(x.id),old?{...old,...x,title:(x.title&&x.title!=='Sem título')?x.title:old.title,sources:old.sources?.length?old.sources:x.sources}:x);
    }
    window.S.catalog=[...existing.values()];
    window.save();
  }
  async function refresh(silent=false){
    try{
      const list=await loadList();
      if(!list.length) throw new Error('lista vazia');
      merge(list);
      if(!silent) window.toast(`✓ ${list.length} animes carregados pela API`);
      if(typeof window.home==='function') window.home();
      return window.S.catalog;
    }catch(e){
      if(!silent) window.toast('Não foi possível atualizar a API de anime.');
      return window.S.catalog;
    }
  }
  async function details(id){
    const x=window.item(id);
    if(!x||!x.api_id) return x;
    try{
      const raw=await apiJSON('/anime/'+encodeURIComponent(x.api_slug||x.api_id));
      const data=raw?.data||raw?.anime||raw?.result||raw;
      const eps=listOf(data).map(normalizeEpisode);
      if(eps.length){x.apiEpisodes=eps;x.episodes=Math.max(Number(x.episodes||0),eps.length);}
      const direct=first(data,['url','video','videoUrl','video_url','embed','embedUrl','embed_url','stream'],null);
      const token=first(data,['token','playToken','play_token','videoToken','video_token'],null);
      if(direct&&/^https:\/\//i.test(direct)) x.sources=[{name:'API gratuita de anime',url:direct,type:'iframe',authorized:true}];
      else if(token) x.apiToken=token;
      x.apiDetail=data;
      window.S.catalog=window.S.catalog.map(v=>v.id===x.id?x:v);window.save();
    }catch(e){}
    return x;
  }
  async function play(id,n){
    const x=await details(id);
    const eps=x?.apiEpisodes||[];
    const ep=eps.find(e=>Number(e.number)===Number(n))||eps[Number(n)-1];
    const token=ep?.token||x?.apiToken;
    const direct=ep?.url&&/^https:\/\//i.test(ep.url)?ep.url:null;
    if(direct) return {url:direct,title:ep.title||`Episódio ${n}`};
    if(!token) return null;
    try{
      const raw=await apiJSON('/play/'+encodeURIComponent(token));
      const data=raw?.data||raw?.result||raw;
      const url=typeof data==='string'?data:first(data,['url','video','videoUrl','video_url','link','embed','embedUrl','embed_url','stream','streamUrl','stream_url','file'],null);
      if(url&&/^https:\/\//i.test(url)) return {url,title:ep?.title||`Episódio ${n}`};
    }catch(e){}
    return null;
  }
  window.animeApi={base:BASE,refresh,details,play,loadList};
  window.refreshCatalog=refresh;
})();
