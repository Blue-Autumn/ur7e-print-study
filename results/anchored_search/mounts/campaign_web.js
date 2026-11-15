// Shared report tables and actual saved joint-motion playback.
(async()=>{
 let surfaceCloudData=null;
 const panel=document.createElement('section');panel.className='secondary';panel.id='campaign20261115';
 panel.dataset.reportPane='surface';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-surface');panel.hidden=true;
 panel.innerHTML='<p class="paneIntro">喷嘴跟随曲面法向。单层和150 mm高度路线分开比较；按钮为床板投影面积 · 高度。</p><div id="areaGrowth"></div><p id="campaignSurfaceScope" class="small"></p>';
 document.querySelector('#otherBeds').after(panel);
 function syncSelection(){const id=scene.dataset.shownShape,native=scene.dataset.loadedCase;for(const b of document.querySelectorAll('[data-placement],[data-selected-id],[data-group]')){const active=!!id&&(b.dataset.placement===id||b.dataset.selectedId===id)||native!=null&&b.dataset.group?.split(',').includes(native);b.setAttribute('aria-pressed',String(!!active));if(active){const pane=b.closest('[data-report-pane]');if(pane)lastTabChoices.set(pane.dataset.reportPane,b)}}}
 new MutationObserver(syncSelection).observe(scene,{attributes:true,attributeFilter:['data-shown-shape','data-loaded-case']});
 function campaignButton(s,b){b.dataset.selectedId=s.spec_id||s.id;b.setAttribute('aria-pressed','false');b.onclick=()=>surface(s);return b}
 const tableHead='<thead><tr><th>床面 / 路线</th><th class="floor">地装</th><th class="side">侧装</th><th class="overhead">吊装</th></tr></thead><tbody></tbody>';
 function matrix(target,label){const table=document.createElement('table');table.setAttribute('aria-label',label);table.innerHTML=tableHead;target.append(table);return table.tBodies[0]}
 try{
  const res=await fetch('../../campaign_web/manifest.json',{cache:'no-cache'});if(!res.ok)throw Error(res.status);const data=await res.json();
  if(data.surface_cloud_url){const cloud=await fetch(data.surface_cloud_url);if(!cloud.ok)throw Error('方向点云 '+cloud.status);surfaceCloudData=await cloud.json()}
  const g=data.area_growth,growth=g?.replays||[];
  if(data.ring_cloud_url){const r=await fetch(data.ring_cloud_url);if(!r.ok)throw Error('整环点云 '+r.status);Object.assign(window.UR7E_SURROUND_CLOUDS??={},await r.json())}
  for(const s of data.rings){shapeIndex.set(s.id,s);surroundIds.add(s.id)}
  const pool=[...new Map([...surround,...data.rings].map(s=>[s.id,s])).values()];
  const allCurves=[...data.surfaces,...data.size_replays,...(data.roll_replays||[]),...(data.entry_replays||[]),...growth];
  const recordSets={case:new Map(study.cases.map(c=>[c.stable_id,c])),shape:shapeIndex,curve:new Map(allCurves.map(s=>[s.id,s]))};
  const catalogResponse=await fetch(data.report_catalog_url,{cache:'no-cache'});if(!catalogResponse.ok)throw Error('方案清单 '+catalogResponse.status);
  const catalog=await catalogResponse.json();if(catalog.schema!==1)throw Error('方案清单版本不匹配');
  const destinations={single_square:el('choices'),single_rectangle:el('singleRectRows'),surround:el('surroundRows'),surface:matrix(el('areaGrowth'),'六轴曲面床与安装方式')};
  for(const [section,rows] of Object.entries(catalog.sections)){
   const body=destinations[section];if(!body)continue;body.replaceChildren();
   for(const row of rows){
    const enabled=row.options.filter(o=>o.enabled!==false);if(!enabled.length)continue;
    const tr=body.insertRow(),head=document.createElement('th');head.scope='row';head.textContent=row.label;tr.append(head);
    for(const mount of Object.keys(names)){
     const cell=tr.insertCell();cell.dataset.mount=mount;let count=0;
     for(const option of enabled.filter(o=>o.mount===mount)){
      const record=recordSets[option.source]?.get(option.record_ids[0]);if(!record)throw Error('方案记录缺失 '+option.id);
      if((record.mount||record.candidate?.mount)!==mount)throw Error('方案安装方式不匹配 '+option.id);
      let b;
      if(option.source==='case'){
       const cases=option.record_ids.map(id=>recordSets.case.get(id));if(cases.some(c=>!c))throw Error('方件记录缺失');
       const p=record.candidate;b=document.createElement('button');b.dataset.group=cases.map(c=>c.index).join(',');
       b.textContent=(p.side_mm*p.side_mm/1e6).toFixed(2)+' m² · '+p.d_mm+' mm';b.onclick=()=>selectCase(record);
       b.title=names[mount]+' · '+p.side_mm+' × '+p.side_mm+' × '+p.d_mm+' mm';
      }else if(option.source==='shape'){
       b=placementButton(record,Number(record.area).toFixed(2)+' m² · '+record.d+' mm');b.title=shapeDimensions(record)+'；底面 '+record.h+' mm';
      }else{
       const grow=record.kind.startsWith('growth_'),scale=record.kind==='size'||record.is_size?record.scale:1;
       const area=grow?record.area_m2:168*128*scale*scale/1e6;
       const height=record.kind==='growth_height'?record.workpiece_height_mm+' mm':grow?'单层':'2 mm';
       b=campaignButton(record,document.createElement('button'));b.textContent=Number(area).toFixed(2)+' m² · '+height;
       b.title=names[mount]+' · '+(record.label||row.label)+'；底面 '+record.h+' mm';
      }
      b.dataset.catalogId=option.id;b.setAttribute('aria-pressed','false');cell.append(b);count++;
     }
     if(!count){cell.textContent='—';cell.className='empty'}
    }
   }
  }
  el('surroundTable').hidden=false;el('surroundEmpty').hidden=true;
  el('campaignSurfaceScope').textContent='末三行为局部三圈参考，面积取曲面基材投影。其余为稠密栅格路线。';
  syncSelection();
  const params=new URLSearchParams(location.search),id=params.get('campaign')||params.get('shape');
  if(id){const ring=data.rings.find(s=>s.id===id),curved=[...data.surfaces,...data.size_replays,...(data.roll_replays||[]),...(data.entry_replays||[]),...growth].find(s=>s.id===id);if(ring)selectShape(ring);else if(curved)surface(curved)}
  panel.dataset.ready='true';
 }catch(e){el('campaignSurfaceScope').textContent='数据加载失败：'+e.message;console.error(e)}
 async function surface(s){
  activateReportTab('surface');
  const active=++ticket;stopShapeMotion();el('shapeTransport').hidden=true;playback?.pause();current=null;frames=[];delete scene.dataset.shownShape;delete scene.dataset.loadedCase;el('shapeSeek').max=0;el('shapeSeek').value=0;el('shapeStage').textContent='';el('shapeClock').value='—';// Keep the last complete view visible until the matching new record is ready.
  el('transport').hidden=el('metrics').hidden=el('variantRow').hidden=true;
  el('auditStatus').textContent='正在加载本轮曲面轨迹…';
  try{const r=await fetch(s.url);if(!r.ok)throw Error(r.status);const c=await r.json();if(active!==ticket)return;
   if(c.spec.id!==(s.spec_id||s.scale+'-'+s.id)||!c.motion?.q?.length)throw Error('轨迹身份或帧不匹配');
   const f=c.motion.q.map((q,i)=>({q_rad:q,xyz_mm:c.motion.xyz[i],phase:i<(c.entry_frames||0)?'entry':'print',kind:i<(c.entry_frames||0)?'entry':(c.motion.kinds?.[i]||'perimeter'),continuous:!!c.motion.continuous,height_offset_mm:c.motion.height_offsets_mm?.[i],surface_layers:c.layers,surface_layer:s.kind==='growth_height'||i<(c.entry_frames||0)?null:(c.motion.levels?.[i]??Math.min(2,Math.floor((i-(c.entry_frames||0))*3/(c.motion.q.length-(c.entry_frames||0)))))+1}));
   scene.beginPlacementTransition?.();
   if(!scene.setFootprint({...c.spec,head:{flange_from_head:study.flange_from_head.flat(),boxes:study.head_boxes},tool_mm:c.tool_mm.flat()}))throw Error('曲面摆位无效');
   const cloud=surfaceCloudData?.groups?.[s.mount];
   if(!cloud||c.tool_mm.flat().some((v,i)=>Math.abs(v-surfaceCloudData.tool_mm.flat()[i])>1e-6))throw Error('方向点云与喷头不匹配');
   scene.setReachOverlay({id:cloud.id,mount:s.mount,points:cloud.points_mm});
   scene.setFootprintPlan(c.plan);if(!scene.setFootprintMotion(c.motion))throw Error('运动无效');
   scene.framePlacement({mount:s.mount,x_mm:s.center[0],y_mm:s.center[1],h_mm:s.h});scene.style.visibility='';scene.dataset.shownShape=c.spec.id;
   shapeFrames=f;el('shapeSeek').max=f.length-1;el('shapeSeek').disabled=el('shapePlay').disabled=false;el('shapeTransport').hidden=false;seekShape(0);
   el('title').textContent=names[s.mount]+' · 曲面三圈'+(s.is_size?' · 放大尺寸':s.is_roll?' · 较大倾角':'');el('position').textContent='床中心 ('+s.center.join(', ')+') mm；床高 '+s.h+' mm；'+(s.kind==='size'||s.is_size?'基材与路径尺寸同比 × ':'起伏 × ')+s.scale+'；三圈，竖直层间距 1 mm。';
   el('orientation').textContent='喷嘴随曲面法向，倾角 '+c.tilt.map(v=>format(v,1)).join('–')+'°。'+(s.kind==='roll'||s.is_roll?'工具自转角 '+s.roll_deg+'°（相对基准局部+270°）。':'');el('takeaway').textContent=s.kind==='entry'?(s.start_kind==='original_common'?'共同待机起姿进场与三圈打印已精确接续。':'以前置床边世界朝下待机为起点，进场与三圈打印已精确接续；共同待机到此床边起姿的运动未验证。'):'三圈打印通过；本回放从首圈起点开始，未包含共同起姿进场。';
   if(location.protocol!=='file:'){const url=new URL(location.href);for(const key of ['shape','layout','case','frame'])url.searchParams.delete(key);url.searchParams.set('campaign',s.id);history.replaceState(null,'',url)}
   el('auditStatus').textContent='本轮真实关节轨迹 · 打印模型检查通过';el('tip').textContent='';el('loadingNote').hidden=true;el('staticCaption').hidden=false;el('staticCaption').textContent='金色为曲面基材，蓝线为已计算的路径。';
   if(s.kind.startsWith('growth_')){
    el('title').textContent=names[s.mount]+' · '+s.shape_label+' · '+format(s.area_m2,2)+' m² · 单层';
    el('position').textContent=s.label+'；床板投影 '+format(s.area_m2,2)+' m²；单层栅格，行距 ≤ '+s.row_pitch_mm+' mm。';
    el('orientation').textContent='喷嘴随解析曲面法向；实际保存姿态倾角 '+c.tilt.map(v=>format(v,1)).join('–')+'°。';
    el('takeaway').textContent='进场与实物软管未验证。';el('auditStatus').textContent='指定单层路线 · 连续关节 / 刚性碰撞 / 预留检查通过';
    el('staticCaption').textContent='各块床板按独立轮廓绘制，播放已保存的实际关节轨迹。';
    if(s.kind==='growth_height'){
     el('title').textContent=names[s.mount]+' · 曲面长方床 · '+format(s.area_m2,2)+' m² · 高150 mm';
     el('position').textContent=s.label+'；床板投影 '+format(s.area_m2,2)+' m²；底/中/顶相对曲面偏移 0 / 75 / 150 mm。';
     el('takeaway').textContent='进场与实物软管未验证。';el('auditStatus').textContent='底/中/顶及跨高度完整连接 · 刚性碰撞 / 预留检查通过';
     el('staticCaption').textContent='回放底、中、顶栅格及跨高度连接，金色为初始曲面基体。';
    }
   }

   const growth=s.kind.startsWith('growth_'),height=s.kind==='growth_height'?s.workpiece_height_mm+' mm':growth?'单层':'2 mm';
   const size=growth?s.label:(s.kind==='size'||s.is_size?'300 × 229 mm':'168 × 128 mm');
   const area=growth?s.area_m2:168*128*(s.kind==='size'||s.is_size?s.scale*s.scale:1)/1e6;
   setPlanFacts(names[s.mount]+' · '+(growth?s.shape_label:'曲面三圈'),[
    ['面积',Number(area).toFixed(2)+' m²'],['尺寸',size],['打印高度',height],
    ['底面高度',s.h+' mm'],['中心 XY',s.center.join(', ')+' mm'],['法向倾角',c.tilt.map(v=>format(v,1)).join('–')+'°'],['工具自转',growth?null:s.is_roll||s.kind==='roll'?'基准+270°':'基准0°']
   ],s.kind==='growth_height'?'底、中、顶栅格和层间连接通过；进场未验证。':growth?'单层栅格及连接通过；进场未验证。':s.kind==='entry'?(s.start_kind==='original_common'?'含共同起姿进场。':'从床边朝下起姿进入打印。'):'从首圈起点开始，不含进场。');
   el('auditStatus').textContent='测试路线检查通过';
   el('staticCaption').textContent='方向点云为朝下0–30°的姿态并集参考，不包含碰撞裁切。';
  }catch(e){if(active!==ticket)return;el('auditStatus').textContent='本轮曲面未加载：'+e.message;el('shapeTransport').hidden=true;scene.style.visibility='hidden'}
 }
})();
