// Campaign choices always clear the old witness before loading a matching new one.
(async()=>{
 const panel=document.createElement('section');panel.className='secondary';panel.id='campaign20261115';
 panel.innerHTML='<h2>3 · 六轴曲面</h2><p>本轮离线模型的已测结果，不代表全局最优或实机验证。点击后共用左侧三维视图与进度条。</p><h3>三种安装 · 参考工况</h3><div id="campaignSurfaces"></div><p id="campaignSurfaceScope">曲面结果尚未导出。</p><p>曲面打印从首圈起点检验三圈与层间抬升；进场单列。床板 300 × 300 mm，基准曲面基材 168 × 128 mm。</p><p><a href="../../campaign_web/manifest.json">公开统计与真实轨迹索引</a></p>';
 document.querySelector('#otherBeds').after(panel);
 function syncSelection(){const id=scene.dataset.shownShape;for(const b of document.querySelectorAll('[data-placement],[data-selected-id]'))b.setAttribute('aria-pressed',String(!!id&&(b.dataset.placement===id||b.dataset.selectedId===id)))}
 new MutationObserver(syncSelection).observe(scene,{attributes:true,attributeFilter:['data-shown-shape','data-loaded-case']});
 function campaignButton(s,b){b.dataset.selectedId=s.spec_id||s.id;b.setAttribute('aria-pressed','false');b.onclick=()=>surface(s);return b}
 const style=document.createElement('style');style.textContent='@media(min-width:901px){.workspace>.panel:first-child{position:sticky;top:12px}.workspace>.panel:nth-child(2){max-height:calc(100dvh - 160px);overflow:auto;scrollbar-gutter:stable}}#campaign20261115 h2{font-size:20px}#campaign20261115 button{font-size:14px;margin:3px}#campaignSurfaces>div{margin:5px 0}';document.head.append(style);
 try{
  const res=await fetch('../../campaign_web/manifest.json');if(!res.ok)throw Error(res.status);const data=await res.json();
  if(data.ring_cloud_url){
   const cloudResponse=await fetch(data.ring_cloud_url);
   if(!cloudResponse.ok)throw Error('整环点云 '+cloudResponse.status);
   Object.assign(window.UR7E_SURROUND_CLOUDS??={},await cloudResponse.json());
  }
  for(const s of data.rings){shapeIndex.set(s.id,s);surroundIds.add(s.id)}
  const latest=new Set(data.rings.map(s=>s.id));
  const pool=[...new Map([...surround,...data.rings].map(s=>[s.id,s])).values()];
  const grid=el('surroundRows');grid.replaceChildren();
  for(const [kind,label] of [['ring','整环'],['tiles200','分块方床'],['tiles300','分块长方床']]){
   const row=grid.insertRow();row.dataset.kind=kind;const head=document.createElement('th');head.scope='row';head.textContent=label;row.append(head);
   for(const mount of ['floor','side','overhead']){
    const cell=row.insertCell();cell.dataset.mount=mount;const options=pool.filter(s=>s.mount===mount&&s.kind===kind).sort((a,b)=>b.d-a.d||b.area-a.area);
    if(!options.length){cell.textContent='尚无通过记录';continue}
    const primary=new Map();for(const s of options){const old=primary.get(s.d);if(!old||s.area>old.area)primary.set(s.d,s)}
    const labelFor=s=>format(s.area,3)+' m² · 高 '+s.d+' mm · '+(latest.has(s.id)?'11/15'+(s.campaign_validation==='dense_pending'?' 加密待核':s.campaign_validation==='dense_passed'?' 加密通过':''):'较早批次');
    for(const s of primary.values())cell.append(placementButton(s,labelFor(s)));
    const historical=options.filter(s=>primary.get(s.d).id!==s.id);if(historical.length){const details=document.createElement('details');details.innerHTML='<summary>历史同高度摆位</summary>';for(const s of historical)details.append(placementButton(s,labelFor(s)));cell.append(details)}
   }
  }
  el('surroundTable').hidden=false;el('surroundEmpty').hidden=true;
  el('surroundScope').textContent='每个高度展示本批与较早批次中面积最大的已通过摆位，其他同高度实测方案保留在历史选项。11/15整环检查五层边界、三层填充与进场；抽样路径不等于整块实体处处验证。侧装另审15个待机淘汰方案，独立完整打印仍0/15通过，不代表侧装物理不可能。';
  for(const check of data.ring_checks||[]){if(!['passed','pending'].includes(check.status))el('surroundScope').textContent+=' 已撤回 '+check.key+'：加密检查 '+check.status+'。'}
  for(const mount of ['floor','side','overhead']){
   const row=document.createElement('div');const s=data.surfaces.find(s=>s.mount===mount);row.textContent=names[mount]+'　';
   if(s){const diagrams=document.createElement('details');const summary=document.createElement('summary');summary.textContent='查看'+names[mount]+'摆位图';diagrams.append(summary);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-900 -900 1800 1800');svg.setAttribute('width','150');svg.setAttribute('height','150');svg.setAttribute('aria-label',names[mount]+'基座与床面俯视摆位');svg.innerHTML='<circle cx="0" cy="0" r="65" fill="#60879b"/><path d="M-100 0H100M0 -100V100" stroke="#18352f" stroke-width="8"/><rect x="'+(s.center[0]-150)+'" y="'+(-s.center[1]-150)+'" width="300" height="300" fill="#edbb62" stroke="#996515" stroke-width="8"/><text x="-850" y="800" font-size="100">H='+s.h+' mm</text>';diagrams.append(svg);const b=document.createElement('button');b.textContent='曲面法向 · 起伏 × '+s.scale+' · 查看真实轨迹';campaignButton(s,b);row.append(b);row.append(diagrams)}else row.append('暂无本轮通过的法向轨迹，未使用旧方案替代');
   const diagram=(data.placements||[]).find(v=>v.mount===mount);if(diagram){const img=document.createElement('img');img.src=diagram.url;img.alt=names[mount]+'曲面实验三维摆位图';img.style.cssText='display:block;width:100%;max-width:440px';(row.querySelector('details')||row).append(img)}panel.querySelector('#campaignSurfaces').append(row);
  }
  if(data.robodk_comparison){const independent=document.createElement('details');independent.id='nativeComparison';independent.innerHTML='<summary>独立 RoboDK 站内核验与误差</summary>';const d=data.robodk_comparison;for(const r of d.rows){const p=document.createElement('p');p.textContent=names[r.mount]+'：原模型关节角直接回放 '+r.knots+' 个打印节点，站内喷嘴最大差 '+format(r.archived_tcp_error_mm,3)+' mm。站内连续 IK 重新求解后，节点最大差 '+r.resolved_knot_error_mm.toExponential(2)+' mm；每边再抽3个内点，最大差 '+format(r.resolved_interior_error_mm,4)+' mm。抽查 '+r.self_checked+' 个姿势的站内自碰'+(r.self_clear?'未见碰撞':'存在问题')+'。';independent.append(p)}const p=document.createElement('p');p.textContent='这里重新求解的是曲面打印段，不能套用原离线模型的进场、喷头、工装碰撞和管线结论，也不代表实机精度。工作站已恢复原状态：'+(d.restored?'是':'待确认')+'。';independent.append(p);panel.append(independent)}
  const stats=document.createElement('p');stats.textContent=(data.surface_stats||[]).map(m=>names[m.mount]+'：'+m.groups.map(g=>(g.policy==='vertical'?'竖直':'法向')+'×'+g.scale+' '+g.passed+'/'+g.total+' 通过').join('；')).join('。');panel.append(stats);
  if(data.size_summary){
   const box=document.createElement('div');box.innerHTML='<h3>曲面尺寸扩展 · 本批已测最大通过</h3><p>基材 XYZ 与路径 XY 同比放大，保持坡度；三圈、1 mm 层间距和预留走线尺寸保持固定。路径包络不等于填满该面积。</p>';
   for(const mount of ['floor','side','overhead']){const m=data.size_summary.max_passed[mount],p=document.createElement('p');p.textContent=names[mount]+'：'+(m?'基材 '+m.substrate_xy_mm.map(v=>format(v,1)).join(' × ')+' mm；理论轨迹投影 '+m.path_projection_xy_mm.map(v=>format(v,1)).join(' × ')+' mm；放大 × '+format(m.size_scale,3):'无通过记录');const witness=(data.size_replays||[]).find(v=>v.mount===mount);if(witness){const b=document.createElement('button');b.textContent='回放此尺寸真实轨迹';campaignButton(witness,b);p.append(b)}box.append(p)}
   box.append('床面限制：300 × 300 mm；首个床外排除例 ×2 的基材为 336 × 256 mm，因超出床板而排除，不能记为机械臂 IK 失败。尺寸打印统计单列；已补充的入口接续见下方。');panel.append(box);
  }
  if(data.slope_summary?.summary){const box=document.createElement('p');box.textContent='固定工具自转角的坡度补充小批（本批已试边界，非固有上限）：'+data.slope_summary.summary.map(r=>names[r.mount]+'最大已试通过 ×'+r.passing_scale+'（'+format(r.passing_tilt_deg,1)+'°），最近已试失败 ×'+r.failure_scale+'（'+format(r.failure_tilt_deg,1)+'°）').join('；');panel.append(box)}
  if(data.roll_replays?.length){const box=document.createElement('div');box.innerHTML='<h3>允许喷头绕局部法线自转</h3><p>保持路径、法线、安装和预留空间相同，另试每 45° 工具自转角。起伏 ×2 三安装均在偏角 270° 打印通过，已试最大法线倾角约 28.0°。这改变了工具自转条件，不是固有倾角极限；共同待机直接进场均未通过；床边世界朝下待机到打印段已另行通过，但到床边起姿之前的运动未验证。</p>';for(const s of data.roll_replays){const b=document.createElement('button');b.textContent=names[s.mount]+' ×2 · 局部+270° 回放';campaignButton(s,b);box.append(b)}panel.append(box)}
  if(data.entry_extension){const p=document.createElement('p');p.textContent='最大尺寸补充进场：地装与侧装从共同起姿到选中的另一条打印分支通过；吊装需已处于床边世界朝下待机姿势才能接续打印，共同起姿到床边待机之前的运动未验证。';panel.append(p);for(const s of data.entry_replays||[]){const b=document.createElement('button');b.textContent=names[s.mount]+' '+(s.is_size?'最大尺寸':s.is_roll?'起伏×2/自转270°':'基准')+' · '+(s.start_kind==='original_common'?'共同待机':'床边待机')+'进场接打印';campaignButton(s,b);panel.append(b)}}
  const entry=document.createElement('p');entry.textContent='共同起姿进场：'+(data.entries?data.entries.map(e=>names[e.mount]+' '+(e.passed?'通过':'未通过')+'（'+(e.samples||0)+' 姿势）').join('；')+'。只检查选中打印分支的进场，不代表尺寸扩展的进场。':'独立检查尚未导出；当前曲面通过数仅表示打印段。');panel.append(entry);
  panel.querySelector('#campaignSurfaceScope').textContent=data.surface_available?'展示各安装本轮已导出的代表性通过轨迹；搜索范围和失败记录以完整报告为准。':'本轮曲面仍在计算，暂不提供回放。';
  const params=new URLSearchParams(location.search),id=params.get('campaign')||params.get('shape');if(id){const ring=data.rings.find(s=>s.id===id),curved=[...data.surfaces,...data.size_replays,...(data.roll_replays||[]),...(data.entry_replays||[])].find(s=>s.id===id);if(ring)selectShape(ring);else if(curved)surface(curved)}
 }catch(e){panel.append('本轮数据加载失败：'+e.message)}
 async function surface(s){
  const active=++ticket;stopShapeMotion();el('shapeTransport').hidden=true;playback?.pause();current=null;frames=[];delete scene.dataset.shownShape;delete scene.dataset.loadedCase;el('shapeSeek').max=0;el('shapeSeek').value=0;el('shapeStage').textContent='';el('shapeClock').value='—';scene.setFootprint(null);scene.setReachOverlay(null);scene.style.visibility='hidden';
  el('transport').hidden=el('metrics').hidden=el('variantRow').hidden=true;
  el('auditStatus').textContent='正在加载本轮曲面轨迹…';
  try{const r=await fetch(s.url);if(!r.ok)throw Error(r.status);const c=await r.json();if(active!==ticket)return;
   if(c.spec.id!==(s.spec_id||s.scale+'-'+s.id)||!c.motion?.q?.length)throw Error('轨迹身份或帧不匹配');
   const f=c.motion.q.map((q,i)=>({q_rad:q,xyz_mm:c.motion.xyz[i],phase:i<(c.entry_frames||0)?'entry':'print',kind:i<(c.entry_frames||0)?'entry':'perimeter',surface_layer:i<(c.entry_frames||0)?null:(c.motion.levels?.[i]??Math.min(2,Math.floor((i-(c.entry_frames||0))*3/(c.motion.q.length-(c.entry_frames||0)))))+1}));
   if(!scene.setFootprint({...c.spec,head:{flange_from_head:study.flange_from_head.flat(),boxes:study.head_boxes},tool_mm:c.tool_mm.flat()}))throw Error('曲面摆位无效');
   scene.setFootprintPlan(c.plan);if(!scene.setFootprintMotion(c.motion))throw Error('运动无效');
   scene.framePlacement({mount:s.mount,x_mm:s.center[0],y_mm:s.center[1],h_mm:s.h});scene.style.visibility='';scene.dataset.shownShape=c.spec.id;
   shapeFrames=f;el('shapeSeek').max=f.length-1;el('shapeSeek').disabled=el('shapePlay').disabled=false;el('shapeTransport').hidden=false;seekShape(0);
   el('title').textContent=names[s.mount]+' · 六轴曲面法向'+(s.kind==='entry'?' · 进场接打印':'')+(s.is_size?' · 尺寸扩展':s.is_roll?' · 起伏×2/局部+270°':'');el('position').textContent='床中心 ('+s.center.join(', ')+') mm；床高 '+s.h+' mm；'+(s.kind==='size'||s.is_size?'基材与路径尺寸同比 × ':'起伏 × ')+s.scale+'；三圈，竖直层间距 1 mm。';
   el('orientation').textContent='喷嘴随曲面法向，倾角 '+c.tilt.map(v=>format(v,1)).join('–')+'°。'+(s.kind==='roll'||s.is_roll?'工具自转角 '+s.roll_deg+'°（相对基准局部+270°）。':'');el('takeaway').textContent=s.kind==='entry'?(s.start_kind==='original_common'?'共同待机起姿进场与三圈打印已精确接续。':'以前置床边世界朝下待机为起点，进场与三圈打印已精确接续；共同待机到此床边起姿的运动未验证。'):'三圈打印通过；本回放从首圈起点开始，未包含共同起姿进场。';
   if(location.protocol!=='file:'){const url=new URL(location.href);for(const key of ['shape','layout','case','frame'])url.searchParams.delete(key);url.searchParams.set('campaign',s.id);history.replaceState(null,'',url)}
   el('auditStatus').textContent='本轮真实关节轨迹 · 打印模型检查通过';el('tip').textContent='';el('loadingNote').hidden=true;el('staticCaption').hidden=false;el('staticCaption').textContent='金色为真实曲面基材模型；用同一进度条查看实际计算的六轴姿态。';
  }catch(e){if(active!==ticket)return;el('auditStatus').textContent='本轮曲面未加载：'+e.message;el('shapeTransport').hidden=true;scene.style.visibility='hidden'}
 }
})();
