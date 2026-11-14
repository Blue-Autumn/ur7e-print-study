/* Shared, offline navigation. Resolve every destination against this script's directory. */
(() => {
  const source=document.currentScript;
  if(!source || window.self!==window.top) return;
  const current=source.dataset.section;
  const root=new URL('.',source.src);
  const reportURL=new URL('briefing/volume.html',root);
  // Old bookmarks without an explicit experiment now lead into the shared workspace.
  if (!location.search && !location.hash && (current==='plane' ||
      (current==='station' && location.pathname.endsWith('/installations/index.html')))) {
    reportURL.hash=current==='plane'?'assemblyTrends':'workspace';
    location.replace(reportURL.href);
    return;
  }
  const pages={
    report:['打印工作空间','briefing/volume.html'],
    plane:['逐点查姿态数与截面数据','briefing/index.html?detail=1'],
    station:['固定布局的轨迹与碰撞记录','installations/index.html?presets=1'],
    atlas:['基础工作空间点云','atlas.html'],
    bed:['200 mm 热床实验','briefing/bed.html'],
    expert:['自适应采样与 RoboDK 对照','expert/index.html'],
    surface:['曲面与喷嘴方向','surface_normals/index.html'],
    scene:['安装场景','briefing/shape.html']
  };
  const groups=[
    ['详细数据',['plane','atlas','expert']],
    ['其他已算实验',['station','bed','surface']]
  ];
  const bar=document.createElement('div');
  bar.id='ur-study-nav';
  bar.setAttribute('aria-label','实验导航');
  const style=document.createElement('style');
  style.textContent=`
    #ur-study-nav {position:sticky;top:0;z-index:70;background:#fff;color:#173b43;border-bottom:1px solid #ccd9d9;font:14px/1.45 "Segoe UI","Microsoft YaHei",sans-serif}
    @media(min-width:671px){#workspace,#singleLayer,#assemblyTrends,#pathReview{scroll-margin-top:54px}}
    #ur-study-nav .us-row{max-width:1600px;margin:auto;display:flex;align-items:center;gap:20px;padding:8px 24px;min-height:46px;box-sizing:border-box}
    #ur-study-nav a,#ur-study-nav summary{color:#31545b;text-decoration:none;cursor:pointer;white-space:nowrap}
    #ur-study-nav a:hover,#ur-study-nav summary:hover{color:#007467;text-decoration:underline}
    #ur-study-nav .us-brand{font-size:15px;font-weight:750;letter-spacing:.015em;margin-right:auto;color:#173b43}
    #ur-study-nav .us-links{display:flex;gap:13px;align-items:center}
    #ur-study-nav a[aria-current=page],#ur-study-nav a[aria-current=location]{font-weight:750;color:#006f63;border-bottom:2px solid #007969}
    #ur-study-nav details{margin:0;padding:0;border:0;background:none;position:relative}
    #ur-study-nav summary{font:inherit;list-style:none;padding:5px 7px;background:#f0f5f4;border-radius:4px}
    #ur-study-nav summary::-webkit-details-marker{display:none}
    #ur-study-nav .us-list{position:absolute;right:0;top:calc(100% + 6px);box-shadow:0 9px 27px #19353724;background:#fff;border:1px solid #cbdada;border-radius:6px;padding:12px 16px;min-width:228px;z-index:20}
    #ur-study-nav .us-list div{display:grid;gap:4px;padding:7px 0}
    #ur-study-nav .us-list div+div{border-top:1px solid #e1e8e7}
    #ur-study-nav .us-list b{font-size:11px;color:#5f7277}
    #ur-study-nav .us-list a{padding:3px 0}
    @media(max-width:680px){#ur-study-nav .us-row{gap:6px;padding:7px 9px;flex-wrap:wrap}#ur-study-nav .us-brand{font-size:13px}#ur-study-nav .us-links{gap:9px;font-size:12px}}
    @media(max-width:670px){#ur-study-nav{position:relative}#workspace,#singleLayer,#assemblyTrends{scroll-margin-top:8px}}
    @media(max-width:580px){#ur-study-nav .us-row{align-items:flex-start}#ur-study-nav .us-brand{width:100%}#ur-study-nav .us-links{width:100%;justify-content:space-between;gap:3px}}
    @media print{#ur-study-nav{display:none}}`;
  document.head.append(style);
  function link(key,label) {
    const a=document.createElement('a');
    a.href=new URL(pages[key][1],root).href;
    a.textContent=label||pages[key][0];
    a.dataset.destination=key;
    if(key===current)a.setAttribute('aria-current','page');
    return a;
  }
  const row=document.createElement('div');row.className='us-row';
  const brand=link('report','UR7e · 打印工作空间');brand.className='us-brand';
  const links=document.createElement('div');links.className='us-links';
  const anchors=[['workspace','三维布局'],['assemblyTrends','整件可达范围'],['pathReview','轮廓检查']];
  for(const [id,label] of anchors){
    const a=document.createElement('a');
    a.href=current==='report'?'#'+id:new URL('briefing/volume.html#'+id,root).href;
    a.textContent=label;
    a.dataset.sectionLink=id;
    links.append(a);
  }
  const menu=document.createElement('details');
  const button=document.createElement('summary');button.textContent='实验资料 ▾';
  const list=document.createElement('div');list.className='us-list';
  for(const [label,keys] of groups){
    const group=document.createElement('div'),b=document.createElement('b');b.textContent=label;group.append(b);
    for(const key of keys)group.append(link(key));
    list.append(group);
  }
  menu.append(button,list);links.append(menu);row.append(brand,links);bar.append(row);source.after(bar);
  if(current==='report'){
    const mark=id=>{for(const a of links.querySelectorAll('[data-section-link]')){
      if(a.dataset.sectionLink===id)a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    }};
    const go=()=>{
      let id=location.hash.slice(1);
      if(id==='singleLayer'){
        id='assemblyTrends';
        try{history.replaceState(history.state,'','#'+id);}
        catch(e){location.replace('#'+id);return;}
      }
      const target=document.getElementById(id);
      if(target){
        for(let n=target;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;
        if(id==='workspace')window.scrollTo(0,0);
        else target.scrollIntoView({block:'start'});
      }
      mark(id||'workspace');
    };
    window.addEventListener('hashchange',go);
    window.addEventListener('DOMContentLoaded',go,{once:true});
    links.addEventListener('click',e=>{
      const a=e.target.closest('[data-section-link]');
      if(a && location.hash==='#'+a.dataset.sectionLink)go();
    });
  }
  document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;button.focus();}});
})();
