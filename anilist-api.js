/* OPAI HUB — AniList como catálogo + API autorizada para reprodução.
 * AniList fornece metadados públicos. A API autorizada fornece episódios/tokens.
 */
(function(){
  'use strict';
  const AL='https://graphql.anilist.co';
  const AUTH='https://apigratuita-animesgratis-derq.vercel.app';

  const q=`query ($page:Int,$perPage:Int,$seasonYear:Int,$season:MediaSeason){
    Page(page:$page,perPage:$perPage){
      media(type:ANIME,seasonYear:$seasonYear,season:$season,sort:POPULARITY_DESC){
        id
        idMal
        title{romaji english native}
        coverImage{extraLarge large medium}
        bannerImage
        description(asHtml:false)
        episodes
        averageScore
        popularity
        status
        season
        seasonYear
        startDate{year month day}
        genres
        isAdult
      }
    }
  }`;

  const searchQ=`query ($search:String,$page:Int){
    Page(page:$page,perPage:20){
      media(type:ANIME,search:$search,sort:SEARCH_MATCH){
        id idMal title{romaji english native} coverImage{extraLarge large medium}
        bannerImage description(asHtml:false) episodes averageScore popularity status season seasonYear
        startDate{year month day} genres isAdult
      }
    }
  }`;

  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const title=a=>a?.title?.english||a?.title?.romaji||a?.title?.native||'';
  const image=a=>a?.coverImage?.extraLarge||a?.coverImage?.large||a?.coverImage?.medium||'';
  const clean=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

  async function gql(query,variables){
    const r=await fetch(AL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables})});
    const j=await r.json();
    if(!r.ok||j.errors) throw new Error(j.errors?.[0]?.message||('AniList '+r.status));
    return j.data;
  }

  async function authList(){
    try{
      const r=await fetch(AUTH+'/animes',{headers:{Accept:'application/json,text/plain,*/*'},cache:'no-store'});
      if(!r.ok) return [];
      const t=await r.text();
      const j=(()=>{try{return JSON.parse(t)}catch{return t}})();
      const u=j?.data??j?.result??j?.response??j?.payload??j;
      if(Array.isArray(u)) return u;
      if(u&&typeof u==='object'){
        for(const k of ['animes','anime','items','list','catalog','catalogo','results','docs','data']) if(Array.isArray(u[k])) return u[k];
      }
    }catch(e){console.warn('[OPAI] API autorizada indisponível:',e)}
    return [];
  }

  function apiTitle(a){
    if(!a||typeof a!=='object') return '';
    for(const k of ['title','name','nome','titulo','title_pt','titulo_pt','animeTitle','anime_title','animeName','anime_name','nome_anime','original_title']) if(a[k]) return String(a[k]);
    for(const k of ['anime','item','show','media','content']) if(a[k]&&typeof a[k]==='object'){const t=apiTitle(a[k]);if(t)return t}
    return '';
  }
  function apiId(a){
    if(!a||typeof a!=='object') return '';
    for(const k of ['id','animeId','anime_id','slug','mal_id','code','_id','uuid']) if(a[k]!=null&&String(a[k]).trim()) return String(a[k]);
    for(const k of ['anime','item','show','media','content']) if(a[k]&&typeof a[k]==='object'){const id=apiId(a[k]);if(id)return id}
    return '';
  }
  function apiSlug(a){
    if(!a||typeof a!=='object') return '';
    for(const k of ['slug','anime_slug','animeSlug']) if(a[k]) return String(a[k]);
    return apiId(a);
  }

  function toCatalog(a,match){
    const t=title(a);
    return {
      id:'al-'+a.id,
      anilist_id:a.id,
      mal_id:a.idMal||null,
      api_id:match?apiId(match):'',
      api_slug:match?apiSlug(match):'',
      title:t||'Sem título',
      type:'anime',
      year:a.seasonYear||a.startDate?.year||0,
      score:(Number(a.averageScore)||0)/10,
      genres:(a.genres||[]).slice(0,5),
      episodes:Number(a.episodes)||0,
      image:image(a),
      banner:a.bannerImage||'',
      description:clean(a.description)||'Sem sinopse disponível.',
      status:a.status||'',
      season:a.season||'',
      source:'AniList',
      sources:[],
      apiMatched:!!match,
      apiRaw:match||null,
      anilistRaw:a
    };
  }

  function merge(list){
    const old=window.S.catalog||[];
    const byKey=new Map(old.map(x=>[String(x.id),x]));
    for(const x of list){
      const prev=byKey.get(x.id);
      byKey.set(x.id,prev?{...prev,...x}:x);
    }
    // Mantém séries legadas, mas o catálogo de anime passa a ser do AniList.
    window.S.catalog=[...byKey.values()].filter(x=>x.type==='series'||String(x.id).startsWith('al-')||String(x.id).startsWith('demo-'));
    window.save();
  }

  async function loadCatalog(){
    const now=new Date();
    const month=now.getMonth()+1;
    const season=month<=3?'WINTER':month<=6?'SPRING':month<=9?'SUMMER':'FALL';
    const year=now.getFullYear();
    const [al,api]=await Promise.all([
      gql(q,{page:1,perPage:30,seasonYear:year,season}),
      authList()
    ]);
    const apiMap=new Map();
    api.forEach(a=>{const k=norm(apiTitle(a));if(k&&!apiMap.has(k))apiMap.set(k,a)});
    const list=(al?.Page?.media||[]).filter(a=>!a.isAdult).map(a=>{
      const names=[a.title?.english,a.title?.romaji,a.title?.native].filter(Boolean);
      let match=null;
      for(const n of names){if(apiMap.has(norm(n))){match=apiMap.get(norm(n));break}}
      return toCatalog(a,match);
    });
    merge(list);
    return list;
  }

  async function search(text){
    const term=String(text||'').trim();
    if(!term) return [];
    const d=await gql(searchQ,{page:1,search:term});
    return (d?.Page?.media||[]).filter(a=>!a.isAdult).map(a=>toCatalog(a,null));
  }

  window.anilistApi={loadCatalog,search,norm};
  window.refreshCatalog=async function(silent=false){
    try{
      if(!silent) window.toast?.('⟳ Atualizando catálogo pelo AniList...');
      const list=await loadCatalog();
      window.home?.();
      if(!silent) window.toast?.(`✓ ${list.length} animes carregados pelo AniList`);
      return window.S.catalog;
    }catch(e){
      console.warn('[OPAI] AniList:',e);
      if(!silent) window.toast?.('Não foi possível carregar o AniList agora.');
      return window.S.catalog;
    }
  };

  window.searchAnimeAniList=async function(term){
    try{return await search(term)}catch(e){console.warn('[OPAI] Busca AniList:',e);return []}
  };

  // Atualiza automaticamente apenas quando ainda não há catálogo AniList.
  const hasAL=(window.S?.catalog||[]).some(x=>String(x.id).startsWith('al-'));
  if(!hasAL) setTimeout(()=>window.refreshCatalog?.(true),150);
})();
