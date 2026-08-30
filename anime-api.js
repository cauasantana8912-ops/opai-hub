/* OPAI HUB - integração com a API de anime autorizada pelo proprietário.
 * Base: https://apigratuita-animesgratis-derq.vercel.app/
 * O adaptador normaliza respostas em vários formatos e mantém o fluxo:
 * catálogo -> detalhes -> episódio/token -> /play/{token} -> player HTTPS.
 */
(function(){
  'use strict';
  const BASE='https://apigratuita-animesgratis-derq.vercel.app';

  const first=(o,keys,fallback=null)=>{
    if(o===null||o===undefined) return fallback;
    if(typeof o!=='object') return fallback;
    for(const k of keys){
      const v=o[k];
      if(v!==undefined&&v!==null&&String(v).trim()!=='') return v;
    }
    return fallback;
  };

  const unwrap=(raw)=>{
    if(!raw||typeof raw!=='object') return raw;
    for(const k of ['data','result','results','response','payload']){
      if(raw[k]!==undefined&&raw[k]!==null) return raw[k];
    }
    return raw;
  };

  const listOf=(o)=>{
    if(Array.isArray(o)) return o;
    if(!o||typeof o!=='object') return [];
    for(const k of ['data','results','animes','anime','items','list','catalog','catalogo','episodes','episodios','docs']){
      if(Array.isArray(o[k])) return o[k];
    }
    const u=unwrap(o);
    if(u!==o) return listOf(u);
    /* Algumas APIs devolvem {"id": {...}, "id2": {...}} em vez de um array. */
    const values=Object.values(o).filter(v=>v&&typeof v==='object'&&!Array.isArray(v));
    if(values.length&&values.some(v=>first(v,['title','name','nome','titulo','animeTitle','animeName'],null))) return values;
    return [];
  };

  const nestedObject=(o)=>{
    for(const k of ['anime','item','show','media','content']){
      if(o?.[k]&&typeof o[k]==='object'&&!Array.isArray(o[k])) return o[k];
    }
    return null;
  };

  const cleanTitle=(o)=>{
    const n=nestedObject(o);
    const v=first(o,['title','name','nome','titulo','animeTitle','anime_title','animeName','anime_name','title_pt','titulo_pt'],null)
      ?? first(n,['title','name','nome','titulo','animeTitle','animeName'],null);
    return v?String(v).trim():'';
  };

  const imageOf=(o)=>{
    const n=nestedObject(o);
    let v=first(o,['image','poster','cover','thumbnail','thumb','imagem','capa','posterUrl','poster_url','imageUrl','image_url','coverUrl','cover_url'],null)
      ?? first(n,['image','poster','cover','thumbnail','imagem','capa','posterUrl','imageUrl'],null);
    if(typeof v==='string') return v;
    if(v&&typeof v==='object') return first(v,['large','original','url','src','medium','image','image_url'], '');
    return '';
  };

  const genresOf=(o)=>{
    const g=first(o,['genres','generos','genre'],[]);
    const a=Array.isArray(g)?g:(typeof g==='string'?g.split(','):[]);
    return a.map(x=>typeof x==='string'?x:(x?.name||x?.nome||x?.title||'')).map(String).map(x=>x.trim()).filter(Boolean);
  };

  const normalizeEpisode=(e,i)=>{
    const n=nestedObject(e);
    const number=first(e,['number','episode','episodeNumber','episode_number','ep','num','numero','n'],null)
      ?? first(n,['number','episode','episodeNumber','episode_number','ep','num','numero','n'],i+1);
    const title=first(e,['title','name','nome','titulo','episodeTitle','episode_title'],null)
      ?? first(n,['title','name','nome','titulo'],'Episódio '+(i+1));
    const token=first(e,['token','playToken','play_token','videoToken','video_token','streamToken','stream_token','idToken','episodeToken','episode_token'],null)
      ?? first(n,['token','playToken','play_token','videoToken','video_token','streamToken','stream_token'],null);
    const url=first(e,['url','video','videoUrl','video_url','link','embed','embedUrl','embed_url','stream','streamUrl','stream_url','file'],null)
      ?? first(n,['url','video','videoUrl','video_url','link','embed','embedUrl','embed_url','stream','streamUrl','stream_url','file'],null);
    return {number:Number(number)||i+1,title:String(title||('Episódio '+(i+1))),token:token?String(token):null,url:url?String(url):null,raw:e};
  };

  const normalizeAnime=(a,i)=>{
    const n=nestedObject(a);
    const src=n?{...n,...a}:a;
    const id=String(first(src,['id','animeId','anime_id','slug','mal_id','code','_id'],`api-${i}`));
    const title=cleanTitle(src)||`Anime ${i+1}`;
    const eps=first(src,['episodes','episodeCount','episode_count','totalEpisodes','total_episodes','episodios','quantidadeEpisodios'],0);
    return {
      id:'api-'+id,api_id:id,api_slug:String(first(src,['slug'],id)),
      title,type:'anime',year:Number(first(src,['year','releaseYear','release_year','ano'],0))||0,
      score:Number(first(src,['score','rating','nota','ratingScore','notaMedia'],0))||0,
      genres:genresOf(src),episodes:Array.isArray(eps)?eps.length:(Number(eps)||0),image:imageOf(src),
      description:String(first(src,['description','synopsis','sinopse','descricao','summary'],'Sem sinopse disponível.')),
      status:String(first(src,['status','state','situacao'],'Informação pública')),
      source:'API gratuita de anime',sources:[],apiRaw:a
    };
  };

  async function apiJSON(path){
    const r=await fetch(BASE+path,{method:'GET',headers:{Accept:'application/json'},mode:'cors',cache:'no-store'});
    if(!r.ok) throw new Error('API '+r.status);
    const text=await r.text();
    try{return JSON.parse(text)}catch(_){throw new Error('Resposta não-JSON da API');}
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
      if(!silent&&typeof window.toast==='function') window.toast(`✓ ${list.length} animes carregados pela API`);
      if(typeof window.home==='function') window.home();
      return window.S.catalog;
    }catch(e){
      console.warn('[OPAI API] catálogo:',e);
      if(!silent&&typeof window.toast==='function') window.toast('Não foi possível atualizar a API de anime.');
      return window.S.catalog;
    }
  }

  async function details(id){
    const x=window.item(id);
    if(!x||!x.api_id) return x;
    try{
      const raw=await apiJSON('/anime/'+encodeURIComponent(x.api_slug||x.api_id));
      const data=unwrap(raw);
      const eps=listOf(data).map(normalizeEpisode);
      /* Também aceita {episodes:[...]} dentro de data/anime/item. */
      const nested=nestedObject(data);
      const eps2=eps.length?eps:(nested?listOf(nested).map(normalizeEpisode):[]);
      if(eps2.length){x.apiEpisodes=eps2;x.episodes=Math.max(Number(x.episodes||0),eps2.length);}

      const direct=first(data,['url','video','videoUrl','video_url','embed','embedUrl','embed_url','stream','streamUrl','stream_url','file'],null);
      const token=first(data,['token','playToken','play_token','videoToken','video_token','streamToken','stream_token'],null);
      if(direct&&/^https:\/\//i.test(String(direct))) x.sources=[{name:'API gratuita de anime',url:String(direct),type:'iframe',authorized:true}];
      else if(token) x.apiToken=String(token);

      /* Se o detalhe tiver o título/capa corretos, atualiza o card também. */
      const title=cleanTitle(data);
      const image=imageOf(data);
      if(title)x.title=title;
      if(image)x.image=image;
      x.apiDetail=data;
      window.S.catalog=window.S.catalog.map(v=>v.id===x.id?x:v);window.save();
    }catch(e){console.warn('[OPAI API] detalhes:',e);}
    return x;
  }

  function extractUrl(raw){
    if(typeof raw==='string') return raw;
    if(!raw||typeof raw!=='object') return null;
    const direct=first(raw,['url','video','videoUrl','video_url','link','embed','embedUrl','embed_url','stream','streamUrl','stream_url','file','src','source'],null);
    if(typeof direct==='string') return direct;
    for(const k of ['data','result','response','player','video','source']){
      if(raw[k]&&typeof raw[k]==='object'){
        const u=extractUrl(raw[k]);if(u)return u;
      }
    }
    if(Array.isArray(raw)){
      for(const v of raw){const u=extractUrl(v);if(u)return u;}
    }
    return null;
  }

  async function play(id,n){
    const x=await details(id);
    const eps=x?.apiEpisodes||[];
    const ep=eps.find(e=>Number(e.number)===Number(n))||eps[Number(n)-1];
    const token=ep?.token||x?.apiToken;
    const direct=ep?.url&&/^https:\/\//i.test(ep.url)?ep.url:null;
    if(direct) return {url:direct,title:ep.title||`Episódio ${n}`,episode:ep};
    if(!token) return null;

    try{
      const raw=await apiJSON('/play/'+encodeURIComponent(token));
      const url=extractUrl(raw);
      if(url&&/^https:\/\//i.test(url)) return {url,title:ep?.title||`Episódio ${n}`,episode:ep};
    }catch(e){console.warn('[OPAI API] reprodução:',e);}
    return null;
  }

  window.animeApi={base:BASE,refresh,details,play,loadList};
  window.refreshCatalog=refresh;
})();
