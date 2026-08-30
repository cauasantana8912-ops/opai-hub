/* OPAI HUB - integração opcional com a API de anime fornecida pelo usuário.
 * Base: https://apigratuita-animesgratis-derq.vercel.app/
 * A integração é tolerante a diferentes formatos de JSON.
 */
(function(){
  const BASE='https://apigratuita-animesgratis-derq.vercel.app';
  const nativeRefresh=window.refreshCatalog;
  const nativeDetails=window.details;
  const nativePlay=window.play;

  function pick(o, keys, fallback){
    for(const k of keys){
      const v=o?.[k];
      if(v!==undefined && v!==null && v!=='') return v;
    }
    return fallback;
  }
  function arr(o){
    if(Array.isArray(o)) return o;
    for(const k of ['data','results','animes','items','episodes']) if(Array.isArray(o?.[k])) return o[k];
    return [];
  }
  function imageOf(o){
    const v=pick(o,['image','poster','cover','thumbnail','thumb','imagem','capa'],'');
    if(typeof v==='string') return v;
    return pick(v,['large','url','original','medium'],'');
  }
  function normalizeAnime(a,i){
    const id=String(pick(a,['id','animeId','anime_id','mal_id'],`api-${i}`));
    const eps=pick(a,['episodes','episodeCount','episode_count'],0);
    return {
      id:'api-'+id, api_id:id, title:pick(a,['title','name','nome'],'Sem título'), type:'anime',
      year:Number(pick(a,['year','releaseYear'],0))||0,
      score:Number(pick(a,['score','rating','nota'],0))||0,
      genres:Array.isArray(a.genres)?a.genres.map(g=>typeof g==='string'?g:(g?.name||'')).filter(Boolean):[],
      episodes:Number(eps)||0, image:imageOf(a),
      description:pick(a,['description','synopsis','sinopse'],'Sem sinopse disponível.'),
      status:pick(a,['status','state'],'Informação pública'),
      source:'API gratuita de anime', sources:[]
    };
  }
  function mergeApi(list){
    const existing=new Map((window.S.catalog||[]).map(x=>[String(x.id),x]));
    list.forEach(x=>{
      const old=existing.get(String(x.id));
      existing.set(String(x.id),old?{...old,...x,sources:old.sources?.length?old.sources:x.sources}:x);
    });
    window.S.catalog=[...existing.values()];
    window.save();
  }
  async function apiJSON(path){
    const r=await fetch(BASE+path,{headers:{Accept:'application/json'}});
    if(!r.ok) throw new Error('API '+r.status);
    return r.json();
  }
  async function loadList(){
    const raw=await apiJSON('/animes');
    return arr(raw).map(normalizeAnime);
  }
  async function refreshFromApi(silent){
    if(!silent) window.toast('⟳ Atualizando catálogo pela API...');
    try{
      const list=await loadList();
      if(!list.length) throw new Error('A API não retornou uma lista reconhecível.');
      mergeApi(list);
      if(!silent) window.toast(`✓ ${list.length} animes carregados pela API`);
      window.home();
      return window.S.catalog;
    }catch(e){
      if(!silent) window.toast('A API não respondeu; usando o catálogo atual.');
      return nativeRefresh?nativeRefresh(silent):window.S.catalog;
    }
  }
  async function enrich(id){
    const x=window.item(id);
    if(!x || !x.api_id) return x;
    try{
      const raw=await apiJSON('/anime/'+encodeURIComponent(x.api_id));
      const data=raw?.data||raw?.anime||raw;
      const episodes=arr(data);
      const sources=[];
      const rawSources=pick(data,['sources','players','streams','videos'],[]);
      if(Array.isArray(rawSources)) rawSources.forEach((s,i)=>{
        const token=pick(s,['token','id','key'],null);
        const url=pick(s,['url','embed','link'],null);
        if(token) sources.push({name:pick(s,['name','server','source'],`Fonte ${i+1}`),token,type:'token',allowlisted:true});
        else if(url && /^https:/.test(url)) sources.push({name:pick(s,['name','server','source'],`Fonte ${i+1}`),url,type:'iframe',allowlisted:true});
      });
      x.apiDetail=data;
      if(episodes.length){x.apiEpisodes=episodes;x.episodes=Math.max(Number(x.episodes||0),episodes.length)}
      x.sources=sources;
      window.save();
    }catch(e){/* mantém os dados públicos já carregados */}
    return x;
  }
  window.refreshCatalog=refreshFromApi;
  window.details=async function(id){
    const x=await enrich(id);
    return nativeDetails?nativeDetails(id):undefined;
  };
  window.play=async function(id,n,index){
    const x=await enrich(id);
    const ep=(x.apiEpisodes||[]).find((e,i)=>Number(pick(e,['number','episode','episodeNumber','ep'],i+1))===Number(n)) || (x.apiEpisodes||[])[Number(n)-1];
    const token=pick(ep||{},['token','playToken','play_token','videoToken'],null) || pick(x.apiDetail||{},['token','playToken','play_token'],null);
    if(!token) return nativePlay?nativePlay(id,n,index):undefined;
    try{
      const raw=await apiJSON('/play/'+encodeURIComponent(token));
      const url=typeof raw==='string'?raw:pick(raw,['url','video','link','embed','stream'],pick(raw?.data||{},['url','video','link','embed','stream'],null));
      if(!url || !/^https:/.test(url)) throw new Error('A API não retornou uma URL HTTPS de reprodução.');
      x.sources=[{name:'API gratuita de anime',url,type:'iframe',allowlisted:true}];
      window.S.catalog=window.S.catalog.map(v=>v.id===x.id?x:v);window.save();
      /* Usa a reprodução existente do OPAI HUB, que aceita embeds HTTPS explicitamente permitidos. */
      return nativePlay?nativePlay(id,n,0):undefined;
    }catch(e){
      window.toast('Não foi possível obter o player deste episódio.');
      return nativePlay?nativePlay(id,n,index):undefined;
    }
  };
  window.animeApi={base:BASE,refresh:refreshFromApi,enrich,loadList};
})();