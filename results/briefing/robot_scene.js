// Both the report and the standalone view use the same canvas and camera.
class RobotScene extends HTMLElement {
 connectedCallback(){
  if(this.shadowRoot)return;
  const host=this,root=this.attachShadow({mode:'open'});
  root.innerHTML=`<style>
*{box-sizing:border-box}:host{display:block;min-width:0;background:#fff;color:#193833;font:14px/1.42 system-ui,"Microsoft YaHei",sans-serif}.shell{max-width:1350px;margin:auto;padding:7px 10px}.bar{display:flex;gap:.55rem 1rem;flex-wrap:wrap;align-items:center;margin:0 0 7px}.bar label,.grow label{display:inline-flex;gap:5px;align-items:center;font-weight:600}button,select{font:inherit;color:#183930;background:#fff;border:1px solid #9fb6a9;border-radius:5px;padding:3px 7px;min-height:30px;cursor:pointer}button:focus-visible,select:focus-visible,canvas:focus-visible,input:focus-visible{outline:3px solid #327a66;outline-offset:2px}input{accent-color:#17765e}.right{margin-left:auto}.scene{position:relative;border:1px solid #cbdad3;border-radius:7px;overflow:hidden;background:#f5f8f5}.scene canvas{display:block;width:100%;height:clamp(340px,46vw,470px);touch-action:none;cursor:grab}.scene canvas:active{cursor:grabbing}.chips{position:absolute;top:9px;left:11px;pointer-events:none;display:flex;gap:6px;flex-wrap:wrap;max-width:70%}.chip{background:rgba(255,255,255,.94);border:1px solid #cfdbd3;color:#2d5444;border-radius:4px;font-size:12px;font-weight:650;padding:1px 6px}.chip.warn{color:#8c3025;border-color:#daaaa3}.grow{display:flex;align-items:center;flex-wrap:wrap;gap:5px 10px;margin:7px 0}.grow input{width:130px;cursor:pointer}.grow label{font-size:13px}.legend{display:flex;align-items:center;gap:4px 13px;flex-wrap:wrap;color:#466559;font-size:12px}.legend i{width:10px;height:10px;display:inline-block;border-radius:2px;margin-right:4px;vertical-align:0}.footer{margin-top:5px;color:#51665d;font-size:12px}.footer p{margin:2px 0}.axis{font-weight:600;color:#88451c}details{font-size:12px;margin-top:4px;color:#496157}summary{cursor:pointer}#layoutsolo{display:none}:host([standalone]) #layoutsolo{display:flex}.clean{appearance:none;border:0;background:none;color:#225b49;padding:0;min-height:20px} @media(max-width:630px){.shell{padding:4px}.bar{gap:5px 8px;font-size:12px}.right{margin-left:0}.grow{gap:3px 8px}.grow input{width:95px}.scene canvas{height:350px}.legend,.footer,.chips{font-size:11px}.chips{max-width:78%;left:5px;top:5px}.chip{font-size:10px}.bar label{gap:3px}}

[hidden]{display:none!important}
:host(:not([standalone])) .solo {display:none!important}
:host(:not([standalone])) .shell {width:100%;max-width:none;padding:0}
:host(:not([standalone])) .scene canvas {width:100%;height:clamp(180px,51dvh,1080px)}
.pathKey i{height:3px;vertical-align:3px}
:host([anchored][fast-render]) #routeChip{display:none!important}
:host([anchored]) #fitChip,:host([anchored]) #scopeChip,:host([anchored]) .detailsRead {display:none}
.chip.hit{background:#fff1ec;color:#8a231e}.chip.unknown{background:#fff8e7;color:#795214}
</style><div class="shell" aria-label="机械臂与打印工件三维场景">
<div class="bar"><label class="solo">安装 <select id="mount"><option value="floor">地装</option><option value="side" selected>侧装</option><option value="overhead">吊装</option></select></label><label class="solo">姿态 <select id="layer"><option value="free">姿态不限</option><option value="down">竖直朝下</option><option value="all25" selected>全部 25 种姿态</option><option value="threshold">至少指定个数</option></select></label><label class="solo" id="thresholdControl" hidden>至少 <input id="minPoses" type="range" min="1" max="25" value="25" style="width:95px"><output id="kOut">25</output> 种</label><label class="solo">点云范围 <select id="cloudScope"><option value="full">看整片空间</option><option value="slab">看当前打印高度</option></select></label><label><input type="checkbox" id="shellOn" checked>点云</label><label><input type="checkbox" id="cutOn" checked>剖面</label><label><input type="checkbox" id="fixtureOn" checked>支架</label><button type="button" id="overview" class="right">全景</button><button type="button" id="focus">放大当前</button><button type="button" id="reset">复位视角</button></div>
<div class="bar" id="layoutsolo"><label>底面 H / mm <select id="baseHeight"></select></label><label>零件高 / mm <select id="buildHeight"></select></label><label>方形边长 / mm <input id="workWidth" type="number" min="1" max="3000" value="500" style="width:75px"></label></div>
<div class="scene"><canvas id="view" tabindex="0" aria-label="拖动或用方向键旋转三维场景"></canvas><div class="chips"><span id="scopeChip" class="chip"></span><span id="fitChip" class="chip"></span><span id="routeChip" class="chip" hidden></span></div></div><p id="offscreen" style="display:none;margin:4px 0;color:#874326;font-size:12px" role="status"></p>
<div class="grow solo"><label>进度 <input id="grow" type="range" min="0" max="100" step="1" value="100"><output id="growOut"></output></label><button type="button" id="play">播放</button><label>喷嘴目标 <select id="position"><option value="center">当前层中心</option><option value="corner">当前层角点</option><option value="path">工件轮廓路径</option></select></label></div>
<div class="legend"><span><i style="background:#7994ac"></i>STEP 机械臂</span><span><i style="background:#efbb62"></i><b id="sizeLegend"></b> 方形件</span><span><i id="swatch" style="background:#af592c"></i>可达域</span><span id="bedLegend" hidden><i style="background:#3983a0"></i>参考热床</span><span id="routeLegend" class="pathKey" hidden><i style="background:#165f74"></i>轮廓路径　<i style="background:#c73b2c"></i>碰撞　<i style="background:#ba851d"></i>未决</span></div>
<details class="detailsRead"><summary>查看当前画面的喷嘴位置和关节角</summary><p id="status" role="status"></p><p id="axisText" class="axis"></p><p id="qRead"></p><p id="method"></p></details>
<details class="solo"><summary>参考热床</summary><div class="reportExtras"><label><input type="checkbox" id="bedOn">显示</label><label>中心 X / mm <input type="number" id="bedX" value="450"></label><label>中心 Y / mm <input type="number" id="bedY" value="0"></label><label>边长 / mm <input type="number" id="bedSide" value="200" min="1" max="3000"></label></div></details>
</div>`;
const D=window.UR7E_SCENE_GEOMETRY, E=id=>root.getElementById(id),canvas=E('view'),ctx=canvas.getContext('2d',{alpha:false});
const embedded=!host.hasAttribute('standalone');
const notify=detail=>host.dispatchEvent(new CustomEvent('robot-state',{detail}));

const modes=['free','down','all25'],colors={floor:'#007969',side:'#a64a16',overhead:'#564b93'},rgb={floor:'0,122,102',side:'161,72,26',overhead:'86,72,146'},names={floor:'地装',side:'侧装',overhead:'吊装'},labels={free:'姿态不限',down:'竖直朝下',all25:'全部 25 种姿态'},baseAxis={floor:[0,0,1],side:[1,0,0],overhead:[0,0,-1]},sign={floor:'+Z',side:'+X',overhead:'−Z'};
const range=(a,b,x)=>Math.min(b,Math.max(a,x)),num=x=>Number.isFinite(Number(x)),fmt=x=>Number(x).toLocaleString('zh-CN',{maximumFractionDigits:1}),vecOK=(x,n)=>Array.isArray(x)&&x.length===n&&x.every(v=>v!==null&&num(v));
const eye=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],down=[1,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,1],rad=Math.PI/180;
function mult(a,b){const c=new Array(16).fill(0);for(let i=0;i<4;i++)for(let k=0;k<4;k++)for(let j=0;j<4;j++)c[4*i+j]+=a[4*i+k]*b[4*k+j];return c}
const xyz=(m,x,y,z)=>[m[0]*x+m[1]*y+m[2]*z+m[3],m[4]*x+m[5]*y+m[6]*z+m[7],m[8]*x+m[9]*y+m[10]*z+m[11]];
function inv(m){let r=[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,0,0,0,1];const p=xyz(r,-m[3],-m[7],-m[11]);r[3]=p[0];r[7]=p[1];r[11]=p[2];return r}
function frames(q,mount){const poses=[D.poses[mount].base];for(let i=0;i<6;i++){const c=Math.cos(q[i]),s=Math.sin(q[i]),ca=Math.cos(D.dh.alpha[i]),sa=Math.sin(D.dh.alpha[i]),a=D.dh.a[i],d=D.dh.d[i];poses.push(mult(poses[i],[c,-s*ca,s*sa,a*c,s,c*ca,-c*sa,a*s,0,sa,ca,d,0,0,0,1]))}return poses}
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x)),limits=D.dh.limits;
function singularPitch(r,h,prefer){const a=D.dh.a[1],b=D.dh.a[2],d5=D.dh.d[4],lo=a*a+b*b+2*a*b*Math.cos(limits[2][1]),hi=(a+b)**2,c=r*r+h*h+d5*d5,amp=2*d5*Math.hypot(r,h),phase=Math.atan2(-r,h),t=prefer-phase;const value=c+amp*Math.cos(t);if(amp<=1e-9||(value>=lo-1e-7&&value<=hi+1e-7))return prefer;const upper=Math.min(1,(hi-c)/amp),lower=Math.max(-1,(lo-c)/amp);if(lower>upper+1e-12)return prefer;return phase+(Math.sin(t)<0?-1:1)*Math.acos(range(-1,1,range(lower,upper,Math.cos(t))))}
function downwardIK(p,mount){const world=down.slice();[world[3],world[7],world[11]]=p;const t=mult(mult(inv(D.poses[mount].base),world),inv(D.tool)),f=[t[2],t[6],t[10]],fx=[t[0],t[4],t[8]],w=[t[3]-D.dh.d[5]*f[0],t[7]-D.dh.d[5]*f[1],t[11]-D.dh.d[5]*f[2]],r=Math.hypot(w[0],w[1]),d4=D.dh.d[3],h=w[2]-D.dh.d[0],d5=D.dh.d[4],a=D.dh.a[1],b=D.dh.a[2],hits=[];if(r<d4-1e-9)return hits;
 for(const sh of [0,1]){const ss=sh?-1:1;let rr=ss*Math.sqrt(Math.max(0,(r-d4)*(r+d4))),q1=Math.atan2(w[1],w[0])+Math.atan2(d4,rr),cs=Math.cos(q1),sn=Math.sin(q1);const sgn=Math.sign(sn*f[0]-cs*f[1]),ac=-sgn*f[1],as=sgn*f[0],ar=ac*w[0]+as*w[1];if(Math.abs(f[2])<1e-15&&Math.abs(as*w[0]-ac*w[1]-d4)<1e-12&&ss*ar>=-1e-12){q1=Math.atan2(as,ac);cs=ac;sn=as;rr=ar}
 const zr=cs*f[0]+sn*f[1],cu=sn*f[0]-cs*f[1],mag=Math.hypot(zr,f[2]),xr=cs*fx[0]+sn*fx[1],xt=sn*fx[0]-cs*fx[1];for(const wr of [0,1]){const s=wr?-1:1,q5=Math.atan2(s*mag,cu);let t4=mag<1e-12?singularPitch(rr,h,Math.atan2(fx[2],xr)-(cu>=0?0:Math.PI)):Math.atan2(-s*f[2],-s*zr);const endpoint=()=>{const x=rr-d5*Math.sin(t4),y=h+d5*Math.cos(t4);return [x,y,(x*x+y*y-a*a-b*b)/(2*a*b)]};let [ex,ey,c3]=endpoint();if(mag>=1e-12&&mag<1e-5&&(c3>1||c3<Math.cos(limits[2][1]))){const t0=singularPitch(rr,h,t4);if(2*mag*Math.abs(Math.sin((t0-t4)/2))<1e-12){t4=t0;[ex,ey,c3]=endpoint()}}
 if(Math.abs(c3)>1+1e-12)continue;const e3=Math.acos(range(-1,1,c3)),cp=Math.cos(t4),sp=Math.sin(t4),q6=Math.atan2(-sp*xr+cp*fx[2],cu*(cp*xr+sp*fx[2])+s*mag*xt);for(const el of [0,1]){const q3=(el?-1:1)*e3,q2=Math.atan2(ey,ex)-Math.atan2(b*Math.sin(q3),a+b*Math.cos(q3)),q=[q1,q2,q3,t4-q3-q2,q5,q6].map(wrap);if(q.some((v,i)=>v<limits[i][0]-1e-9||v>limits[i][1]+1e-9))continue;const chain=frames(q,mount),tcp=mult(chain[6],D.tool),err=Math.hypot(tcp[3]-p[0],tcp[7]-p[1],tcp[11]-p[2]),angleError=Math.max(...[0,1,2,4,5,6,8,9,10].map(i=>Math.abs(tcp[i]-down[i])));if(err<1e-5&&angleError<1e-8)hits.push({b:4*sh+2*wr+el,q,chain,tcp,err})}}}return hits}
function pngBytes(code,n){return new Promise((resolve,reject)=>{const im=new Image();im.onerror=()=>reject(new Error('本地几何数据解码失败'));im.onload=()=>{try{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);const src=g.getImageData(0,0,c.width,c.height).data,dst=new Uint8Array(n);if(3*c.width*c.height<n)throw new Error('几何字节不足');for(let i=0;i<n;i++)dst[i]=src[4*Math.floor(i/3)+(i%3)];resolve(dst)}catch(e){reject(e)}};im.src='data:image/png;base64,'+code})}
const shells=new Map();async function loadShell(m,l){const key=m+'/'+l;if(!shells.has(key)){shells.set(key,(async()=>{const e=D.mesh[m][l],nb=Math.ceil(D.nxy*D.nxy*D.nz/8),bytes=await pngBytes(e.png,e.v*6+nb),view=new DataView(bytes.buffer),v=new Float32Array(3*e.v);for(let i=0;i<v.length;i++)v[i]=view.getInt16(2*i,true)/2;return {v,mask:bytes.subarray(6*e.v),bounds:e.bounds_mm}})())}return shells.get(key)}
const countFields=new Map(),countShells=new Map();
function isMode(name){return modes.includes(name)||name==='threshold'}
function shellKey(){return state.mount+'/'+state.mode+(state.mode==='threshold'?'/'+state.minPoses:'')}
function modeLabel(){return state.mode==='threshold'?'至少 '+state.minPoses+' / 25 种姿态':labels[state.mode]}
function selectShell(m,mode,k){
 if(mode!=='threshold')return loadShell(m,mode);
 if(k===25)return loadShell(m,'all25'); // This exact mask was compared block-by-block at export.
 const key=m+'/'+k;
 if(!countShells.has(key)){
  if(countShells.size>=6)countShells.delete(countShells.keys().next().value);
  const mountsField=D.threshold_grids[m],n=D.nxy,plane=n*n,voxels=D.nz*plane;
  if(!countFields.has(m))countFields.set(m,pngBytes(mountsField.png,voxels));
  countShells.set(key,countFields.get(m).then(grid=>{
   const expected=mountsField.counts[k-1],mask=new Uint8Array(Math.ceil(voxels/8));
   let nx=0,ny=0,nz=0,occupied=0;
   // Each axis-aligned occupancy change contributes exactly one isosurface
   // edge midpoint, including both walls of interior cavities. The export
   // verifies a full band of unoccupied cells around the domain at k=1.
   for(let i=0;i<voxels;i++){
    if(grid[i]<k)continue;mask[i>>3]|=1<<(i&7);occupied++;
    nx+=(grid[i-1]<k)+(grid[i+1]<k);ny+=(grid[i-n]<k)+(grid[i+n]<k);nz+=(grid[i-plane]<k)+(grid[i+plane]<k);
   }
   if(occupied!==expected)throw Error('姿态数量栅格与保存的占用计数不一致');
   const v=new Float32Array(3*(nx+ny+nz)),origin=-D.half_mm+D.xy_mm/2,hxy=D.xy_mm/2,hz=D.dz_mm/2;
   let offset=0;
   function append(x,y,z){v[offset++]=x;v[offset++]=y;v[offset++]=z}
   for(let z=1;z<D.nz-1;z++)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
    const i=z*plane+y*n+x;if(grid[i]<k)continue;
    const wx=origin+x*D.xy_mm,wy=origin+y*D.xy_mm,wz=D.z0+z*D.dz_mm;
    if(grid[i-1]<k)append(wx-hxy,wy,wz);if(grid[i+1]<k)append(wx+hxy,wy,wz);
    if(grid[i-n]<k)append(wx,wy-hxy,wz);if(grid[i+n]<k)append(wx,wy+hxy,wz);
    if(grid[i-plane]<k)append(wx,wy,wz-hz);if(grid[i+plane]<k)append(wx,wy,wz+hz);
   }
   if(offset!==v.length)throw Error('姿态数量边界提取不完整');
   return {v,mask,occupied};
  }));
 }
 return countShells.get(key)
}
async function loadCAD(){return Promise.all(D.cad.parts.map(async entry=>{const b=await pngBytes(entry.png,entry.v*12+entry.f*6),v=new Float32Array(b.buffer,0,3*entry.v),f=new Uint16Array(b.buffer,entry.v*12,3*entry.f);const n=new Float32Array(f.length);for(let k=0;k<f.length;k+=3){const a=3*f[k],b=3*f[k+1],c=3*f[k+2],x=v[b]-v[a],y=v[b+1]-v[a+1],z=v[b+2]-v[a+2],s=v[c]-v[a],t=v[c+1]-v[a+1],u=v[c+2]-v[a+2],nx=y*u-z*t,ny=z*s-x*u,nz=x*t-y*s,mag=Math.hypot(nx,ny,nz)||1;n[k]=nx/mag;n[k+1]=ny/mag;n[k+2]=nz/mag}return {v,f,n,p:new Float32Array(v.length)}}))}
let squareTableRequest=null;
function loadStandaloneSquares(){if(embedded||window.PRINT_COUNTS)return Promise.resolve();if(!squareTableRequest){squareTableRequest=new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src='count_data.js';tag.onload=()=>window.PRINT_COUNTS?resolve():reject(Error('方框数据未载入'));tag.onerror=()=>reject(Error('方框数据未载入'));document.head.appendChild(tag)}).catch(e=>{squareTableRequest=null;throw e})}return squareTableRequest}
const state={mount:'side',mode:'all25',minPoses:25,h:-650,build:300,side:500,center:null,square:null,placement:'best',percent:100,target:'center',spaceView:'full',bed:{visible:false,x_mm:450,y_mm:0,side_mm:200}};
let displayPose=null,reachOverlay=null,reachExplicit=host.hasAttribute('fixed-print-pose'),reachCache=null,reachSliceTiles=new WeakMap(),fastRenderer=null;
let footprint=null;
const footprintMasks=new Map();
let route=null,routeIndex=0,activeCollision=null,lastAck='',requestedPath=0;
const defaultCamera=reachExplicit?{center:[0,0,-45],verticalSpan:2350,az:.78,elevation:.31}:{center:[200,70,-145],verticalSpan:1820,az:.78,elevation:.31};
let shell=null,robot=null,witness=null,articulation=null,requested=0,queue=false,pointer=null,clock=null,az=defaultCamera.az,elevation=defaultCamera.elevation;
let centerWorld=defaultCamera.center.slice(),verticalSpan=defaultCamera.verticalSpan,cameraAction='默认固定镜头';
let placementView=null,cameraMove=null;
if(host.hasAttribute('fixed-print-pose')){
 host.framePlacement=({mount,x_mm,y_mm,h_mm})=>{
  const base=posXYZ(D.poses[mount].base);
  const table=[x_mm,y_mm,h_mm];
  const dx=x_mm-base[0],dy=y_mm-base[1];
  // The horizontal screen axis is (-sin(az), cos(az)). This angle puts the
  // table to the left and a little nearer to the viewer than the base.
  const heading=Math.hypot(dx,dy)>1e-6?Math.atan2(dy,dx)+.91:az;
  const first=placementView===null;
  if(!first && canvas.width && !matchMedia('(prefers-reduced-motion: reduce)').matches){
   const previousFrame=document.createElement('canvas');
   previousFrame.width=canvas.width;
   previousFrame.height=canvas.height;
   previousFrame.getContext('2d').drawImage(canvas,0,0);
   previousFrame.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
   canvas.parentElement.querySelector('canvas[data-transition]')?.remove();
   previousFrame.dataset.transition='';
   canvas.after(previousFrame);
   previousFrame.animate([{opacity:1},{opacity:0}],{duration:90,fill:'forwards'}).onfinish=()=>previousFrame.remove();
  }
  placementView={center:base.map((v,i)=>(v+table[i])/2),az:heading,elevation:.54};
  // Cut directly to the new composition. Only the final few degrees ease in.
  centerWorld=placementView.center.slice();
  az=heading-range(-.038,.038,wrap(heading-az));
  elevation=placementView.elevation;
  alignPlacement(first,verticalSpan,120);
 };
}
function alignPlacement(immediate,span,settleMs){
 const target=placementView;
 const turn=wrap(target.az-az);
 const distance=Math.hypot(...target.center.map((v,i)=>v-centerWorld[i]));
 cameraAction='摆位视角';
 const duration=immediate||matchMedia('(prefers-reduced-motion: reduce)').matches?0:
  (settleMs??Math.min(720,Math.max(Math.abs(turn)*220,distance*.65,Math.abs(target.elevation-elevation)*300,Math.abs(span-verticalSpan)*.22)));
 if(duration<16){
  cameraMove=null;centerWorld=target.center.slice();az+=turn;elevation=target.elevation;verticalSpan=span;
 }else{
  cameraMove={time:performance.now(),duration,center:centerWorld.slice(),az,elevation,span:verticalSpan,
   target,turn,endSpan:span,manualAngle:false,manualZoom:false};
 }
 requestDraw();
}
function advanceCamera(now){
 const move=cameraMove;
 if(!move)return;
 const t=range(0,1,(now-move.time)/move.duration);
 const eased=t*t*(3-2*t);
 centerWorld=move.center.map((v,i)=>v+(move.target.center[i]-v)*eased);
 if(!move.manualAngle){
  az=move.az+move.turn*eased;
  elevation=move.elevation+(move.target.elevation-move.elevation)*eased;
 }
 if(!move.manualZoom)verticalSpan=move.span+(move.endSpan-move.span)*eased;
 if(t<1)requestDraw();else cameraMove=null;
}
const reference=[12,-80,97,-82,70,36].map(v=>v*rad);let previous=null;
const posXYZ=(m)=>[m[3],m[7],m[11]];
function pathActive(){return state.target==='path'&&route!==null}
function currentZ(){return pathActive()?range(state.h,state.h+state.build,route.xyz_mm[routeIndex][2]):state.h+state.percent/100*state.build}
function printedZ(){return pathActive()&&route.batch?state.h+route.batch.frames[routeIndex].printed_height_mm:currentZ()}
function referenceSquare(){
 if(state.mode==='threshold'&&state.minPoses!==25){const r=window.PRINT_COUNTS?.at(state.mount,state.h,state.build,state.minPoses);return r&&r.square_mm>0&&vecOK(r.center_xy_mm,2)?[r.square_mm,...r.center_xy_mm]:null}
 const index=state.mode==='threshold'?2:modes.indexOf(state.mode);return D.squares[state.mount][String(state.h)]?.[D.builds.indexOf(state.build)]?.[index]||null
}
function stopPlay(){if(clock!==null){clearInterval(clock);clock=null}E('play').textContent='播放生长'}
function poseTarget(){if(displayPose)return displayPose.xyz_mm;if(pathActive())return route.xyz_mm[routeIndex];if(!state.center||state.target==='path')return null;const delta=state.target==='corner'?state.side/2:0;return [state.center[0]+delta,state.center[1]+delta,currentZ()]}
function updatePose(reset=false){
 if(footprint){
  activeCollision=null;witness=null;articulation=frames(footprint.q_rad,state.mount);
  E('routeChip').hidden=true;E('routeLegend').hidden=true;
  canvas.dataset.ik='stored-pose';canvas.dataset.q=JSON.stringify(footprint.q_rad);
  canvas.dataset.validatedNode='false';canvas.dataset.displayInterpolation='false';
  canvas.dataset.tcp=JSON.stringify(posXYZ(mult(articulation[6],D.tool)));
  canvas.dataset.target='null';canvas.dataset.branch='';E('qRead').textContent=footprint.q_rad.map(q=>fmt(q/rad)+'°').join('、');
  publishState();requestDraw();return;
 }
 if(state.target==='path'){setPathPose();return}activeCollision=null;E('routeChip').hidden=true;const p=poseTarget(),candidates=p?downwardIK(p,state.mount):[];let best=-Infinity,select=null;for(const c of candidates){const dx=state.center?state.center[0]:0,dy=state.center?state.center[1]:0;let inside=0;for(const t of c.chain.slice(2,6)){const pt=posXYZ(t);if(Math.abs(pt[0]-dx)<state.side/2+42&&Math.abs(pt[1]-dy)<state.side/2+42&&pt[2]>state.h-25&&pt[2]<currentZ()-30)inside++}
 const margin=Math.min(...c.q.map((v,i)=>Math.min(v-limits[i][0],limits[i][1]-v)));const conditioning=Math.abs(Math.sin(c.q[2])*Math.sin(c.q[4]));const temporal=!reset&&previous&&previous.m===state.mount?c.q.reduce((s,v,i)=>s+wrap(v-previous.q[i])**2,0):0;const score=conditioning+.10*margin-3*inside-.8*temporal;if(score>best){select=c;best=score}}
 witness=select;articulation=select?select.chain:frames(reference,state.mount);previous=select?{m:state.mount,q:select.q}:null;
 const displayed=select?select.q:reference;E('qRead').textContent=(select?'所示朝下构型':'所示固定参考构型')+'，关节角 '+displayed.map(v=>fmt(v/rad)+'°').join('、')+'。关节变化仅演示逐点构型。';
 E('status').textContent=select?'当前喷嘴目标 ('+p.map(fmt).join(', ')+') mm，朝下逆解分支 '+select.b+'，正解残差 '+(select.err<.001?'小于 0.001':fmt(select.err))+' mm。':p?'当前目标 ('+p.map(fmt).join(', ')+') mm 无通过正解复核的朝下构型。机械臂显示固定参考姿态。':'此高度段没有可放置方框的参考中心。工件轮廓在世界 XY 原点标示高度，机械臂显示固定参考姿态。';
 canvas.dataset.ik=select?'solved':p?'missing':'no-center';canvas.dataset.q=JSON.stringify(displayed);canvas.dataset.target=JSON.stringify(p);canvas.dataset.tcp=JSON.stringify(posXYZ(mult(articulation[6],D.tool)));canvas.dataset.branch=select?select.b:'reference';
 E('growOut').textContent=fmt(currentZ()-state.h)+' / '+fmt(state.build)+' mm';E('grow').value=state.percent;E('routeLegend').hidden=true;publishState();requestDraw()}
function report(){E('axisText').textContent='基座轴 世界 '+sign[state.mount]+'。底面 '+fmt(state.h)+' mm，目标顶面 '+fmt(state.h+state.build)+' mm。'+(state.center?'工件中心 XY ('+state.center.map(fmt).join(', ')+') mm。':'无已选中心。');
 E('scopeChip').textContent=names[state.mount]+' · '+modeLabel();const sq=state.square,chip=E('fitChip'),same=!!(sq&&state.center&&Math.abs(sq[1]-state.center[0])<1e-6&&Math.abs(sq[2]-state.center[1])<1e-6);chip.classList.toggle('warn',!sq||sq[0]<state.side||!same);
 chip.textContent=!sq?'没有找到各层都能到达的方形':sq[0]<state.side?'最大边长 '+fmt(sq[0])+' mm，放不下这个零件':same?fmt(state.side)+' mm 方形内，每层采样点均可达':'已移动工件，见右侧位置检查';E('swatch').style.background=colors[state.mount];E('sizeLegend').textContent=fmt(state.side)+' mm';E('bedLegend').hidden=!state.bed.visible;
 const thresholdNote=state.mode==='threshold'?'每个位置单独计数。不同位置能用的具体姿态可能不同。':'';
 E('method').textContent=thresholdNote+'基座安装中心是世界坐标原点，+Z 竖直向上。原始水平格距 '+D.fine_xy_mm+' mm，显示点云格距 '+D.xy_mm+' × '+D.xy_mm+' × '+D.dz_mm+' mm，每个水平显示块中至少半数细格须满足所选姿态条件。横截面取最接近当前打印高度的报告层。7 件机械臂来自本地 STEP，细线连接法兰与历史 TCP。工装按示意尺寸参与路径碰撞采样，工作空间保留运动学边界。';
 canvas.dataset.center=JSON.stringify(state.center);canvas.dataset.maxSquare=JSON.stringify(sq);canvas.dataset.h=state.h;canvas.dataset.build=state.build;canvas.dataset.height=currentZ();canvas.dataset.widthMm=state.side;canvas.dataset.bed=JSON.stringify(state.bed);canvas.dataset.spaceView=state.spaceView;canvas.dataset.minPoses=state.mode==='threshold'?state.minPoses:state.mode==='all25'?25:'';canvas.dataset.mode=state.mode}
function physicalKey(){return JSON.stringify([state.mount,state.h,state.build,state.side,state.center])}
function routeMatches(result){const p=result?.params;return !!(p&&state.center&&p.mount===state.mount&&[p.h_mm-state.h,p.d_mm-state.build,p.side_mm-state.side,p.center_xy_mm?.[0]-state.center[0],p.center_xy_mm?.[1]-state.center[1]].every(v=>Math.abs(v)<1e-6))}
function validateRoute(result){return !!(result&&result.schema===1&&typeof result.id==='string'&&routeMatches(result)&&Array.isArray(result.xyz_mm)&&result.xyz_mm.length>0&&result.xyz_mm.every(p=>vecOK(p,3))&&Array.isArray(result.q_rad)&&result.q_rad.length===result.xyz_mm.length&&result.q_rad.every(q=>q===null||vecOK(q,6))&&Array.isArray(result.states)&&result.states.length===result.xyz_mm.length)}
function collisionStatus(s){if(!s)return null;const code=v=>['hit','clear','unknown'].includes(v)?v:'unknown';return {...s,self:code(s.self),fixture:code(s.fixture),part:code(s.part)}}
function collisionLevel(s){if(!s)return 'unknown';const values=[s.self,s.fixture,s.part];return values.includes('hit')?'hit':values.every(x=>x==='clear')?'clear':'unknown'}
function checkRouteFrame(index,item=route){
 const p=item?.xyz_mm[index],q=item?.q_rad[index];
 if(!q||!q.every((v,i)=>v>=limits[i][0]-1e-8&&v<=limits[i][1]+1e-8))return null;
 const chain=frames(q,state.mount),tcp=mult(chain[6],item.anchored?.tool_mm??D.tool),world=posXYZ(tcp),stored=item.fk_xyz_mm?.[index];
 const err=Math.hypot(...world.map((v,i)=>v-p[i]));
 const savedMatch=vecOK(stored,3)?Math.hypot(...world.map((v,i)=>v-stored[i]))<.001:item.batch?true:err<.001;
 const goal=item.anchored?.entry_rotations[index]??item.anchored?.print_rotation;
 const trace=goal?[0,1,2,4,5,6,8,9,10].reduce((sum,k,j)=>sum+tcp[k]*goal[j],0):tcp[0]-tcp[5]-tcp[10];
 const rotError=Math.acos(range(-1,1,(trace-1)/2));
 return savedMatch&&err<=Number(item.bounds?.position_bound_mm??.5)+.001&&rotError<=(Number(item.bounds?.orientation_bound_deg??.5)+.001)*rad?{chain,tcp,b:item.branch,q,err}:null;
}
host.addEventListener('robot-check-path',ev=>{
 const r=ev.detail.route;
 if(!r?.batch||!validateRoute(r)){ev.detail.check={ok:false};return}
 let maximum=0;
 for(let i=0;i<r.q_rad.length;i++){
  const pose=checkRouteFrame(i,r);
  if(!pose){ev.detail.check={ok:false,message:'跨层路径第 '+(i+1)+' 个节点未通过此模型的关节限位或 TCP 正解核验。'};return}
  maximum=Math.max(maximum,pose.err);
 }
 ev.detail.check={ok:true,max_error_mm:maximum};
});
function setPathPose(){const p=poseTarget(),q=displayPose?displayPose.q_rad:pathActive()?route.q_rad[routeIndex]:null,good=displayPose?{chain:frames(q,state.mount),tcp:mult(frames(q,state.mount)[6],route.anchored?.tool_mm??D.tool),q,b:route.branch,err:0}:pathActive()?checkRouteFrame(routeIndex):null;
 witness=good;articulation=good?good.chain:frames(reference,state.mount);previous=null;activeCollision=good?collisionStatus(route.states[routeIndex]):null;const level=collisionLevel(activeCollision),chip=E('routeChip');let message;
 if(!route)message='当前布局的路径未计算';else if(!good)message='节点 '+(routeIndex+1)+' 没有经验证的路径构型';else if(route.batch)message='已存批量模拟 · 第 '+(routeIndex+1)+' 个节点';else if(level==='hit'){const hits=[];if(activeCollision.self==='hit')hits.push('本体');if(activeCollision.fixture==='hit')hits.push('工装');if(activeCollision.part==='hit')hits.push('已打印工件');message='当前节点命中'+hits.join('、')}else if(level==='clear')message='当前轮廓点未发现接触';else message='当前节点碰撞结果未决';
 if(good&&displayPose)message='显示插帧 · 未新增验证点';else if(good&&route?.anchored)message=routeIndex<route.anchored.seam?'从起姿进场':routeIndex===route.anchored.seam?'到达起印角':'沿已验刀路打印';
 chip.textContent=message;chip.hidden=false;chip.className='chip '+(good&&route?.batch?'':good&&level==='hit'?'hit':!good||level==='unknown'?'unknown':'');const legend=E('routeLegend');legend.hidden=!route;
 if(route&&host.hasAttribute('anchored')&&host.hasAttribute('fast-render')){if(legend.dataset.type!=='simple'){legend.dataset.type='simple';legend.innerHTML='<i style="background:#125777"></i>打印路径'}}else if(route&&legend.dataset.type!==(route.batch?'batch':'contour')){legend.dataset.type=route.batch?'batch':'contour';legend.innerHTML=route.batch?'<i style="background:#125777"></i>已走路径　<i style="background:#92a2aa"></i>后续路径　虚线抬升':'<i style="background:#165f74"></i>轮廓路径　<i style="background:#c73b2c"></i>碰撞　<i style="background:#ba851d"></i>未决'}
 const last=!good&&pathActive()&&route.known_prefix_count>0?checkRouteFrame(Math.min(routeIndex,route.known_prefix_count-1)):null;if(last)articulation=last.chain;
 const suffix=route?'。节点 '+(routeIndex+1)+' / '+route.xyz_mm.length+'，整条路径 '+(route.kinematic_passed?'有连续运动学见证':'未通过连续运动学验证')+'。':'';E('status').textContent=message+suffix+(good?'':last?'。机械臂停留在最后一个有效节点。':'。机械臂显示固定参考姿态。');E('qRead').textContent=good?(displayPose?'显示插帧关节角（未新增验证） ':'路径原始关节角 ')+q.map(v=>fmt(v/rad)+'°').join('、')+(route?.batch?'。坐标来自逐节点正解。':'。CAD 判断针对所存样本。'):'此节点没有发布的有效路径关节角。';
 canvas.dataset.displayInterpolation=String(!!displayPose);canvas.dataset.validatedNode=String(!displayPose);canvas.dataset.ik=good?'solved':route?'reference':'path-unavailable';canvas.dataset.q=JSON.stringify(good?q:null);canvas.dataset.tcp=JSON.stringify(posXYZ(mult(articulation[6],route?.anchored?.tool_mm??D.tool)));canvas.dataset.branch=good?route.branch:'reference';canvas.dataset.target=JSON.stringify(p);canvas.dataset.height=currentZ();E('grow').value=state.percent;E('growOut').textContent=route?(routeIndex+1)+' / '+route.xyz_mm.length+' 点':'—';publishState();requestDraw()}
function publishState(){const c=canvas.dataset,p=poseTarget();canvas.dataset.pathId=route?.id||'';canvas.dataset.pathIndex=pathActive()?routeIndex:-1;canvas.dataset.collision=JSON.stringify(activeCollision);if(!embedded)return;
 const message={type:'ur7e-scene-state',target:state.target,target_xyz_mm:p,tcp_xyz_mm:witness?posXYZ(witness.tcp):null,q_rad:witness?witness.q:null,mode:state.mode,min_poses:state.mode==='threshold'?state.minPoses:state.mode==='all25'?25:null,reference_tcp_xyz_mm:witness?null:posXYZ(mult(articulation[6],D.tool)),ik:c.ik,mount:state.mount,h_mm:state.h,d_mm:state.build,progress_pct:state.percent,path_id:route?.id||null,path_index:pathActive()?routeIndex:null,path_length:route?.xyz_mm.length||0,collision:activeCollision,space_view:state.spaceView};const key=JSON.stringify(message);if(lastAck!==key){lastAck=key;notify(message)}}
function assignRoute(result,index=0){displayPose=null;if(result!==null&&!validateRoute(result))return false;route=result;routeIndex=route?range(0,route.xyz_mm.length-1,Math.round(index)||0):0;if(pathActive())state.percent=route.xyz_mm.length>1?100*routeIndex/(route.xyz_mm.length-1):100;updatePose(true);return true}
function seek(v){displayPose=null;if(v.path_id&&route&&v.path_id!==route.id)return false;if(num(v.progress_pct))state.percent=range(0,100,Number(v.progress_pct));if(['center','corner','path'].includes(v.target))state.target=v.target;if(pathActive()){if(num(v.path_index))routeIndex=range(0,route.xyz_mm.length-1,Math.round(Number(v.path_index)));else if(num(v.progress_pct))routeIndex=Math.round(state.percent*(route.xyz_mm.length-1)/100);state.percent=route.xyz_mm.length>1?100*routeIndex/(route.xyz_mm.length-1):100}E('position').value=state.target;return true}
function readDisplay(d){if(['full','slab'].includes(d.space_view))state.spaceView=d.space_view;if(d.bed&&typeof d.bed==='object'){const b=d.bed;state.bed={visible:typeof b.visible==='boolean'?b.visible:state.bed.visible,x_mm:num(b.x_mm)?Number(b.x_mm):state.bed.x_mm,y_mm:num(b.y_mm)?Number(b.y_mm):state.bed.y_mm,side_mm:num(b.side_mm)?range(1,3000,Number(b.side_mm)):state.bed.side_mm}}E('cloudScope').value=state.spaceView;E('bedOn').checked=state.bed.visible;E('bedX').value=state.bed.x_mm;E('bedY').value=state.bed.y_mm;E('bedSide').value=state.bed.side_mm}
function fetchStandaloneRoute(){if(embedded||!state.center||state.target!=='path')return;const layer=state.build*state.percent/100;const result=(window.BRIEF_CONTOURS||[]).find(r=>routeMatches(r)&&Math.abs(r.params.layer_mm-layer)<1e-6);if(result)assignRoute(result,0);}
function applyLayout(change,external=false){stopPlay();const old=shellKey(),previousKey=physicalKey();state.mount=names[change.mount]?change.mount:state.mount;state.mode=isMode(change.mode)?change.mode:state.mode;if(state.mode==='threshold'&&Number.isInteger(change.min_poses)&&change.min_poses>=1&&change.min_poses<=25)state.minPoses=change.min_poses;state.h=num(change.h)?Number(change.h):state.h;state.build=num(change.build)?range(0,3000,Number(change.build)):state.build;state.side=num(change.width_mm??change.side)?range(1,3000,Number(change.width_mm??change.side)):state.side;state.placement=change.placement||'best';
 const ownRef=referenceSquare();state.square=Object.hasOwn(change,'reference_square_mm')?vecOK(change.reference_square_mm,3)?change.reference_square_mm.map(Number):null:ownRef;
 const center=change.center_xy_mm??change.center;if(Object.hasOwn(change,'center_xy_mm')||Object.hasOwn(change,'center'))state.center=vecOK(center,2)?center.map(Number):null;else state.center=state.square?state.square.slice(1):null;
 if(physicalKey()!==previousKey){route=null;routeIndex=0;requestedPath++}readDisplay(change);seek(change);E('workWidth').value=state.side;E('baseHeight').value=state.h;E('buildHeight').value=state.build;E('mount').value=state.mount;E('layer').value=state.mode;E('minPoses').value=state.minPoses;E('kOut').textContent=state.minPoses;E('thresholdControl').hidden=state.mode!=='threshold';E('grow').value=state.percent;const modelChanged=old!==shellKey();if(!reachExplicit&&(modelChanged||!shell)){const ticket=++requested;shell=null;selectShell(state.mount,state.mode,state.minPoses).then(g=>{if(ticket===requested){shell=g;requestDraw()}}).catch(e=>{E('status').textContent=e.message})}report();updatePose(true);if(!external&&!route)fetchStandaloneRoute();
 if(!embedded&&state.mode==='threshold'&&state.minPoses<25&&!window.PRINT_COUNTS){const pending=JSON.stringify([shellKey(),state.h,state.build,state.side,state.placement]);loadStandaloneSquares().then(()=>{if(pending===JSON.stringify([shellKey(),state.h,state.build,state.side,state.placement]))applyLayout(change,external)}).catch(()=>{E('fitChip').textContent='当前工件方框数据未载入'})}
}
host.addEventListener('robot-command',event=>{const d=event.detail;if(d.type==='ur7e-layout'){if(names[d.mount]&&isMode(d.mode)&&num(d.h)&&num(d.build)&&(d.mode!=='threshold'||Number.isInteger(d.min_poses)&&d.min_poses>=1&&d.min_poses<=25))applyLayout(d,true)}else if(d.type==='ur7e-path'){if(d.data===null||validateRoute(d.data))assignRoute(d.data,d.path_index??0)}else if(d.type==='ur7e-playback'){if(!seek(d))return;readDisplay(d);report();updatePose()}});
for(const h of D.heights)E('baseHeight').add(new Option(String(h),String(h)));for(const h of D.builds)E('buildHeight').add(new Option(String(h),String(h)));
function requestDraw(){if(!queue){queue=true;requestAnimationFrame(draw)}}
for(const id of ['mount','layer','baseHeight','buildHeight','workWidth','minPoses'])E(id).onchange=()=>applyLayout({mount:E('mount').value,mode:E('layer').value,h:+E('baseHeight').value,build:+E('buildHeight').value,width_mm:+E('workWidth').value,min_poses:+E('minPoses').value});
E('minPoses').oninput=E('minPoses').onchange;
for(const id of ['cutOn','shellOn','fixtureOn'])E(id).onchange=requestDraw;E('cloudScope').onchange=()=>{readDisplay({space_view:E('cloudScope').value});report();requestDraw()};for(const id of ['bedOn','bedX','bedY','bedSide'])E(id).onchange=()=>{readDisplay({bed:{visible:E('bedOn').checked,x_mm:+E('bedX').value,y_mm:+E('bedY').value,side_mm:+E('bedSide').value}});report();requestDraw()};E('position').onchange=()=>{stopPlay();seek({target:E('position').value});updatePose(true);if(!route)fetchStandaloneRoute()};
E('grow').oninput=()=>{stopPlay();seek({progress_pct:Number(E('grow').value)});report();updatePose()};E('play').onclick=()=>{if(clock!==null){stopPlay();return}if(state.target==='path'&&(!route||route.known_prefix_count===0))return;if(pathActive()&&routeIndex>=route.known_prefix_count-1)seek({path_index:0});else if(state.percent>=100)seek({progress_pct:0});E('play').textContent='暂停';report();updatePose(true);clock=setInterval(()=>{if(pathActive()){const end=route.known_prefix_count-1;seek({path_index:Math.min(end,routeIndex+Math.max(1,Math.ceil(route.xyz_mm.length/100)))});if(routeIndex>=end)stopPlay()}else{seek({progress_pct:Math.min(100,state.percent+2)});if(state.percent>=100)stopPlay()}report();updatePose()},120)};
function rotate(x,y){if(cameraMove)cameraMove.manualAngle=true;az-=x;elevation=range(-1.31,1.35,elevation+y);requestDraw()}
canvas.addEventListener('pointerdown',e=>{if(cameraMove)cameraMove.manualAngle=true;pointer=[e.clientX,e.clientY,e.pointerId];canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(pointer&&pointer[2]===e.pointerId){rotate((e.clientX-pointer[0])*.008,(e.clientY-pointer[1])*.008);pointer=[e.clientX,e.clientY,e.pointerId]}});for(const e of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(e,()=>pointer=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(cameraMove)cameraMove.manualZoom=true;verticalSpan=range(450,8000,verticalSpan*Math.exp(e.deltaY*.001));cameraAction='手动缩放';requestDraw()},{passive:false});canvas.addEventListener('keydown',e=>{const s={ArrowLeft:[-.13,0],ArrowRight:[.13,0],ArrowUp:[0,.13],ArrowDown:[0,-.13]}[e.key];if(s){e.preventDefault();rotate(...s)}});E('reset').onclick=()=>{if(placementView){alignPlacement(false,defaultCamera.verticalSpan);return}az=defaultCamera.az;elevation=defaultCamera.elevation;centerWorld=defaultCamera.center.slice();verticalSpan=defaultCamera.verticalSpan;cameraAction='默认固定镜头';requestDraw()};
E('overview').onclick=()=>{cameraMove=null;centerWorld=placementView?placementView.center.slice():[0,0,30];verticalSpan=4150;cameraAction='全景镜头';requestDraw()};E('focus').onclick=()=>{cameraMove=null;focusCurrent()};
const boxIndices=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],edgesBox=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
function block(x,y,z,dx,dy,dz){return [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[x+v[0]*dx/2,y+v[1]*dy/2,z+v[2]*dz/2])}
function layoutBoxes(){if(pathActive()&&Array.isArray(route.model_boxes)){const hits=new Set((activeCollision?.fixture_pairs||[]).map(p=>p[1]));return route.model_boxes.filter(b=>b.role==='fixture'&&vecOK(b.center_mm,3)&&vecOK(b.size_mm,3)).map(b=>({v:block(...b.center_mm,...b.size_mm),color:hits.has(b.id)?[202,89,68]:b.id==='platform'?[157,177,172]:b.id==='mount_plate'?[96,126,136]:[135,152,152]}))}const xy=state.center||[0,0],h=state.h,bottom=Math.min(h-260,-420),platform=state.side+140;const objects=[];
 const add=(x,y,z,dx,dy,dz,color)=>objects.push({v:block(x,y,z,dx,dy,Math.max(5,dz)),color});
 if(!footprint){
  add(xy[0],xy[1],h-18,platform,platform,36,[157,177,172]);
  for(const i of [-1,1])for(const j of [-1,1]){const d=platform/2-38;add(xy[0]+i*d,xy[1]+j*d,(h-36+bottom)/2,28,28,h-36-bottom,[151,166,165])}
 }
 if(state.mount==='floor'){add(0,0,-15,230,230,30,[105,131,139]);add(0,0,(bottom-30)/2,100,100,-30-bottom,[136,152,158]);add(0,0,bottom+8,300,300,16,[117,135,137])}
 else if(state.mount==='side'){add(-14,0,0,28,210,210,[96,126,136]);add(-85,0,(bottom+100)/2,112,115,100-bottom,[126,145,152]);add(-85,0,bottom+8,295,295,16,[114,132,138])}
 else{add(0,0,16,230,220,32,[98,131,142]);add(-360,0,77,890,115,90,[135,153,158]);add(-765,0,(bottom+76)/2,90,100,76-bottom,[134,150,152]);add(-765,0,bottom+8,270,245,16,[116,135,136])}return objects}
let cam=null;function basis(x,y,z){return [-x*cam.sa+y*cam.ca,-(x*cam.ca+y*cam.sa)*cam.se+z*cam.ce,(x*cam.ca+y*cam.sa)*cam.ce+z*cam.se]}
function project(p){const x=p[0],y=p[1],z=p[2],f=x*cam.ca+y*cam.sa;return [cam.cx+cam.k*(-x*cam.sa+y*cam.ca),cam.cy-cam.k*(-f*cam.se+z*cam.ce),f*cam.ce+z*cam.se]}
function aim(w,h){cam={ca:Math.cos(az),sa:Math.sin(az),ce:Math.cos(elevation),se:Math.sin(elevation)};const f=basis(...centerWorld),k=Math.min(w/1.12,h)/verticalSpan;Object.assign(cam,{w,h,k,cx:w*.5-k*f[0],cy:h*.51+k*f[1]})}
function focusCurrent(){if(!cam)return;const xy=state.center||[0,0],work=footprint?.vertices||block(xy[0],xy[1],state.h+state.build/2,state.side,state.side,state.build),points=[...work,[0,0,0]];if(E('fixtureOn').checked)for(const b of layoutBoxes())points.push(...b.v);for(const t of articulation||[])points.push(posXYZ(t));
 if(placementView)centerWorld=placementView.center.slice();
 else{
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const p of points)for(let j=0;j<3;j++){min[j]=Math.min(min[j],p[j]);max[j]=Math.max(max[j],p[j])}
  centerWorld=min.map((v,i)=>(v+max[i])/2);
 }
 const local=points.map(p=>basis(p[0]-centerWorld[0],p[1]-centerWorld[1],p[2]-centerWorld[2]));const ax=2*Math.max(...local.map(p=>Math.abs(p[0]))),ay=2*Math.max(...local.map(p=>Math.abs(p[1])));const fit=Math.min((cam.w-62)/Math.max(400,ax),(cam.h-65)/Math.max(450,ay));verticalSpan=range(450,8000,Math.min(cam.w/1.12,cam.h)/fit);cameraAction='当前工件与机体';requestDraw()}
function line(a,b,color,width=1,dash=[]){const p=project(a),q=project(b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.setLineDash([])}
function boxFaces(v,colors,alpha=1){const proj=v.map(project);return boxIndices.map((ids,i)=>{const weight=[.73,1,.86,.69,.79,.9][i];const p=ids.map(k=>proj[k]);return {p,d:p.reduce((s,a)=>s+a[2],0)/4,c:'rgba('+colors.map(v=>Math.round(v*weight)).join(',')+','+alpha+')'}})}
function drawPolys(faces){faces.sort((a,b)=>a.d-b.d);for(const f of faces){ctx.fillStyle=f.c;ctx.beginPath();ctx.moveTo(f.p[0][0],f.p[0][1]);for(let i=1;i<f.p.length;i++)ctx.lineTo(f.p[i][0],f.p[i][1]);ctx.closePath();ctx.fill()}}
const shellTiles=new Map();function tile(g,layer,m,key){const id=key+'/'+layer;if(shellTiles.has(id))return shellTiles.get(id);const off=document.createElement('canvas');off.width=off.height=D.nxy;const cg=off.getContext('2d'),pix=cg.createImageData(D.nxy,D.nxy),col=rgb[m].split(',').map(Number);for(let i=0;i<D.nxy*D.nxy;i++){const idx=layer*D.nxy*D.nxy+i;if(g.mask[idx>>3]&(1<<(idx&7))){const k=4*i;pix.data[k]=col[0];pix.data[k+1]=col[1];pix.data[k+2]=col[2];pix.data[k+3]=75}}cg.putImageData(pix,0,0);if(shellTiles.size>24)shellTiles.delete(shellTiles.keys().next().value);shellTiles.set(id,off);return off}
function crossSection(m,key){if(reachExplicit){drawReachSection(m);return;}const layer=Math.round((currentZ()-D.z0)/D.dz_mm);if(!shell||!E('cutOn').checked||layer<0||layer>=D.nz)return;const z=D.z0+layer*D.dz_mm,p=project([-D.half_mm,-D.half_mm,z]),px=project([-D.half_mm+D.xy_mm,-D.half_mm,z]),py=project([-D.half_mm,-D.half_mm+D.xy_mm,z]);ctx.save();ctx.transform(px[0]-p[0],px[1]-p[1],py[0]-p[0],py[1]-p[1],p[0],p[1]);ctx.imageSmoothingEnabled=false;ctx.drawImage(tile(shell,layer,m,key),0,0);ctx.restore()}
function pointCloud(m){if(reachExplicit){drawReachOverlay(m);return;}if(!shell||!E('shellOn').checked){delete canvas.dataset.displayedZ;canvas.dataset.cloudCount=0;return}const a=shell.v,stride=Math.max(1,Math.ceil((a.length/3)/27000)),full=state.spaceView==='full',top=currentZ(),tol=.51*D.dz_mm;ctx.fillStyle='rgba('+rgb[m]+(full?',.24)':',.43)');const size=cam.w>660?1.35:1.0;let lo=Infinity,hi=-Infinity,count=0;for(let i=0;i<a.length;i+=3*stride){const x=a[i],y=a[i+1],z=a[i+2];if(!full&&(z>top+tol||z<state.h-tol))continue;lo=Math.min(lo,z);hi=Math.max(hi,z);count++;const r=x*cam.ca+y*cam.sa,u=cam.cx+cam.k*(-x*cam.sa+y*cam.ca),v=cam.cy-cam.k*(-r*cam.se+z*cam.ce);ctx.fillRect(u,v,size,size)}canvas.dataset.cloudCount=count;canvas.dataset.displayedZ=JSON.stringify(count?[lo,hi]:null)}
function referenceBed(){if(!state.bed.visible)return;const b=state.bed,z=state.h,half=b.side_mm/2,s=block(b.x_mm,b.y_mm,z-2,b.side_mm,b.side_mm,4);drawPolys(boxFaces(s,[78,155,177],.36));for(let i=0;i<4;i++)line(s[4+i],s[4+(i+1)%4],'#28758a',2);for(let i=1;i<4;i++){const a=-half+i*b.side_mm/4;line([b.x_mm+a,b.y_mm-half,z],[b.x_mm+a,b.y_mm+half,z],'rgba(31,112,133,.48)',.9);line([b.x_mm-half,b.y_mm+a,z],[b.x_mm+half,b.y_mm+a,z],'rgba(31,112,133,.48)',.9)}canvas.dataset.bedZ=z}
let projectedRoute=null,projectedRouteKey='';
function batchLine(record){
 const key=JSON.stringify([route.id,cam.w,cam.h,cam.k,cam.cx,cam.cy,cam.ca,cam.sa,cam.ce,cam.se]);if(key!==projectedRouteKey){projectedRoute=route.xyz_mm.map(project);projectedRouteKey=key;canvas.dataset.routeProjectionBuilds=String((Number(canvas.dataset.routeProjectionBuilds)||0)+1)}const projected=projectedRoute;let prior='';
 for(let i=1;i<projected.length;i++){
  const kind=record.frames[i].kind,phase=i<=routeIndex?'done':'next',group=phase+'/'+(kind==='lift'?'lift':kind==='infill'?'infill':'stroke');
  if(group!==prior){if(prior)ctx.stroke();prior=group;ctx.beginPath();
   ctx.setLineDash(kind==='lift'?[5,4]:[]);ctx.lineWidth=phase==='done'?2.5:1.1;
   ctx.strokeStyle=phase==='next'?'rgba(100,122,135,.52)':kind==='infill'?'#126c6a':'#165777';ctx.moveTo(projected[i-1][0],projected[i-1][1]);}
  ctx.lineTo(projected[i][0],projected[i][1]);
 }
 if(prior)ctx.stroke();ctx.setLineDash([]);
}
function routeLine(){if(!pathActive())return;if(route.batch){batchLine(route.batch);return}const coords=route.xyz_mm;if(coords.length<2)return;const projected=coords.map(project);let bucket='',drawing=false;const close=()=>{if(drawing)ctx.stroke();drawing=false};for(let i=1;i<coords.length;i++){const prev=route.states[i-1],curr=route.states[i];const noQ=!route.q_rad[i]||!route.q_rad[i-1];const hit=collisionLevel(collisionStatus(prev))==='hit'||collisionLevel(collisionStatus(curr))==='hit';const uncertain=collisionLevel(collisionStatus(prev))==='unknown'||collisionLevel(collisionStatus(curr))==='unknown';const key=noQ?'missing':hit?'hit':uncertain?'unknown':i<=routeIndex?'traced':'planned';if(key!==bucket){close();bucket=key;ctx.beginPath();ctx.setLineDash(key==='missing'?[4,4]:key==='unknown'?[6,3]:[]);ctx.lineWidth=key==='hit'?3.5:key==='traced'?2.9:1.9;ctx.strokeStyle={hit:'#c4332c',unknown:'#a77919',missing:'#797773',traced:'#125777',planned:'#588fa2'}[key];ctx.moveTo(projected[i-1][0],projected[i-1][1]);drawing=true}ctx.lineTo(projected[i][0],projected[i][1])}close();ctx.setLineDash([])}
let robFrames=null,worldCache=null;const robotPalette=[.6,.87,.88,.83,.76,.72,.61];
function drawRobot(){if(!robot||!articulation)return;if(host.hasAttribute('fast-render')&&window.UR7EAnchoredPlayback?.createMeshRenderer){if(fastRenderer===null)fastRenderer=window.UR7EAnchoredPlayback.createMeshRenderer()||false;if(fastRenderer){const head=pathActive()?route.anchored?.head:footprint?.head,hits=new Set;for(const pair of activeCollision?.self_pairs||[])for(const id of pair)if(Number.isInteger(id))hits.add(id);for(const id of activeCollision?.part_links||[])hits.add(id);for(const pair of activeCollision?.fixture_pairs||[])hits.add(pair[0]);const image=fastRenderer.draw({parts:robot,articulation,cam,dpr:Math.min(1.65,window.devicePixelRatio||1),head,headMatrix:head?mult(articulation[6],head.flange_from_head):null,hitLinks:hits});ctx.drawImage(image,0,0,cam.w,cam.h);canvas.dataset.robotRenderer='webgl';canvas.dataset.headBoxes=head?head.boxes.length:0;return}}canvas.dataset.robotRenderer='canvas2d';if(robFrames!==articulation){worldCache=robot.map((part,i)=>{const v=new Float32Array(part.v.length),n=new Float32Array(part.n.length),t=articulation[i];for(let k=0;k<v.length;k+=3){const p=xyz(t,part.v[k],part.v[k+1],part.v[k+2]);v[k]=p[0];v[k+1]=p[1];v[k+2]=p[2]}for(let k=0;k<n.length;k+=3){const x=part.n[k],y=part.n[k+1],z=part.n[k+2];n[k]=t[0]*x+t[1]*y+t[2]*z;n[k+1]=t[4]*x+t[5]*y+t[6]*z;n[k+2]=t[8]*x+t[9]*y+t[10]*z}return {v,n}});robFrames=articulation}
 const tris=[];const palettes=robotPalette.map(t=>Array.from({length:20},(_,j)=>{const f=.35+.63*j/19;return 'rgb('+[192,207,223].map(v=>Math.round(38+(v-38)*f*t)).join(',')+')'}));const lx=.21*cam.ca*cam.ce+.40*cam.sa,ly=.21*cam.sa*cam.ce-.40*cam.ca,lz=.79;
 for(let i=0;i<robot.length;i++){const part=robot[i],v=worldCache[i].v,n=worldCache[i].n,p=part.p;for(let k=0;k<v.length;k+=3){const x=v[k],y=v[k+1],z=v[k+2],r=x*cam.ca+y*cam.sa;p[k]=cam.cx+cam.k*(-x*cam.sa+y*cam.ca);p[k+1]=cam.cy-cam.k*(-r*cam.se+z*cam.ce);p[k+2]=r*cam.ce+z*cam.se}const f=part.f;for(let k=0;k<f.length;k+=3){const a=3*f[k],b=3*f[k+1],c=3*f[k+2];const det=(p[b]-p[a])*(p[c+1]-p[a+1])-(p[b+1]-p[a+1])*(p[c]-p[a]);if(Math.abs(det)<.015)continue;const light=range(0,1,.15+.85*Math.abs(n[k]*lx+n[k+1]*ly+n[k+2]*lz));tris.push([p[a+2]+p[b+2]+p[c+2],i,a,b,c,Math.round(19*light)])}}
 const hitLinks=new Set;if(activeCollision){for(const pair of activeCollision.self_pairs||[])if(Array.isArray(pair))for(const id of pair)if(Number.isInteger(id))hitLinks.add(id);for(const id of activeCollision.part_links||[])if(Number.isInteger(id))hitLinks.add(id);for(const pair of activeCollision.fixture_pairs||[])if(Array.isArray(pair)&&Number.isInteger(pair[0]))hitLinks.add(pair[0])}canvas.dataset.hitLinks=JSON.stringify([...hitLinks].sort());const collisionColors=Array.from({length:20},(_,j)=>'rgb('+[160+Math.round(j*4),43+Math.round(j*2),33+Math.round(j*1.9)].join(',')+')');
 const head=pathActive()?route.anchored?.head:footprint?.head,headFaces=[];
 if(head){
  const world=mult(articulation[6],head.flange_from_head);
  for(const b of head.boxes){
   const verts=block(...b.center_cad_mm,...b.size_mm).map(v=>xyz(world,...v));
   headFaces.push(...boxFaces(verts,[159,110,63],.83));
  }
  headFaces.sort((a,b)=>a.d-b.d);
 }
 canvas.dataset.headBoxes=head?head.boxes.length:0;
 let face=0;tris.sort((a,b)=>a[0]-b[0]);ctx.lineWidth=.50;for(const t of tris){
  while(face<headFaces.length&&3*headFaces[face].d<=t[0])drawPolys([headFaces[face++]]);
  const p=robot[t[1]].p,a=t[2],b=t[3],c=t[4],color=hitLinks.has(t[1])?collisionColors[t[5]]:palettes[t[1]][t[5]];ctx.fillStyle=color;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p[a],p[a+1]);ctx.lineTo(p[b],p[b+1]);ctx.lineTo(p[c],p[c+1]);ctx.closePath();ctx.fill();ctx.stroke()}
 if(face<headFaces.length)drawPolys(headFaces.slice(face))}
function label(p,text,color,xShift,yShift){const s=project(p);ctx.font='600 12px system-ui,Microsoft YaHei,sans-serif';const wid=ctx.measureText(text).width,x=range(3,cam.w-wid-5,s[0]+xShift),y=range(17,cam.h-5,s[1]+yShift);ctx.fillStyle='rgba(251,252,249,.9)';ctx.fillRect(x-2,y-12,wid+4,15);ctx.fillStyle=color;ctx.fillText(text,x,y)}
function marker(){const p=poseTarget();if(!p)return;const s=project(p);if(witness){const flange=posXYZ(articulation[6]);line(flange,p,'#5f4642',2.3,[3,2]);const status=pathActive()&&!route.batch?collisionLevel(activeCollision):null;ctx.fillStyle=pathActive()&&route.batch?'#165777':status==='hit'?'#b7322c':status==='unknown'?'#ad7919':status==='clear'?'#35667a':'#3b6333';ctx.beginPath();ctx.arc(s[0],s[1],pathActive()?5:3.8,0,6.3);ctx.fill();ctx.strokeStyle='#fff';ctx.stroke()}else{ctx.strokeStyle='#b23a2c';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(s[0]-5,s[1]-5);ctx.lineTo(s[0]+5,s[1]+5);ctx.moveTo(s[0]-5,s[1]+5);ctx.lineTo(s[0]+5,s[1]-5);ctx.stroke()}}
function triad(){const o=project([0,0,0]),bx=43,by=cam.h-32;ctx.save();ctx.font='600 10px system-ui';for(const [v,a,c] of [[[1,0,0],'X','#995d3b'],[[0,1,0],'Y','#48755e'],[[0,0,1],'Z','#536c91']]){const p=project(v),x=bx+(p[0]-o[0])*22/cam.k,y=by+(p[1]-o[1])*22/cam.k;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(x,y);ctx.strokeStyle=c;ctx.lineWidth=1.4;ctx.stroke();ctx.fillStyle=c;ctx.fillText(a,x+(x>=bx?2:-7),y+(y>=by?6:-2))}ctx.restore()}
function cameraOverlay(work){const px=200*cam.k,x=cam.w-16-px,y=cam.h-12;ctx.save();ctx.strokeStyle='#253e34';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x,y);ctx.lineTo(x+px,y);ctx.lineTo(x+px,y-4);ctx.stroke();ctx.fillStyle='#243e32';ctx.font='600 11px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('200 mm',x+px/2,y-7);ctx.restore();
 const screen=(footprint?footprint.vertices.slice(footprint.vertices.length/2):work.slice(4)).map(project),topVisible=screen.every(p=>p[0]>=0&&p[0]<=cam.w&&p[1]>=0&&p[1]<=cam.h);const note=E('offscreen');note.style.display=topVisible?'none':'block';if(!topVisible)note.textContent='目标顶面 '+fmt(state.h+state.build)+' mm 超出当前视野。选择「全景」查看位置，或「放大当前」对准机器人和工件。';
 canvas.dataset.cameraCenter=JSON.stringify(centerWorld);canvas.dataset.verticalSpan=String(verticalSpan);canvas.dataset.scale=cam.k.toFixed(12);canvas.dataset.rulerPx=px.toFixed(9);canvas.dataset.topVisible=String(topVisible);canvas.dataset.roll='0';canvas.dataset.cameraAction=cameraAction;
 const origin=project([0,0,0]),axisEnd=project([0,0,200]);canvas.dataset.zScreenDx=(axisEnd[0]-origin[0]).toFixed(9);canvas.dataset.zScreenDy=(axisEnd[1]-origin[1]).toFixed(9)}
function draw(){queue=false;if(host.hasAttribute('anchored')&&host.hasAttribute('fast-render')&&!root.querySelector('.legend').dataset.simple){const labels=root.querySelectorAll('.legend>span');labels[0].lastChild.textContent='机械臂';E('sizeLegend').hidden=true;labels[1].lastChild.textContent=footprint?'床面与打印高度':'工件';labels[2].lastChild.textContent='可达边界';root.querySelector('.legend').dataset.simple='true';}const r=canvas.getBoundingClientRect(),w=r.width,h=r.height;if(!w||!h)return;const dpr=Math.min(1.65,window.devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f4f7f4';ctx.fillRect(0,0,w,h);
 advanceCamera(performance.now());
 const m=state.mount,xy=state.center||[0,0],topZ=printedZ(),work=footprint?.bounds||block(xy[0],xy[1],state.h+state.build/2,state.side,state.side,state.build),grown=block(xy[0],xy[1],(state.h+topZ)/2,state.side,state.side,topZ-state.h),boxes=E('fixtureOn').checked?layoutBoxes():[];aim(w,h,boxes,work);
 if(state.h<0){const xymax=750;for(let n=-500;n<=500;n+=250){line([n,-xymax,state.h],[n,xymax,state.h],'rgba(100,125,117,.12)',.7);line([-xymax,n,state.h],[xymax,n,state.h],'rgba(100,125,117,.12)',.7)}}
 pointCloud(m);drawPolys(boxes.flatMap(b=>boxFaces(b.v,b.color,.84)));delete canvas.dataset.bedZ;
 if(footprint){
  drawFootprintMask();
  drawFootprint();
 }else{
 crossSection(m,shellKey());referenceBed();if(topZ>state.h)drawPolys(boxFaces(grown,activeCollision?.part==='hit'?[219,87,47]:[244,183,82],.22));
 for(const [a,b] of edgesBox){const bottom=a<4&&b<4,top=a>=4&&b>=4;line(work[a],work[b],bottom?'#46627c':top?'#a55a25':'#bd8c4c',top||bottom?1.65:1.05,top&&topZ<state.h+state.build?[4,3]:[])}if(topZ>state.h&&topZ<state.h+state.build){for(let i=4;i<8;i++)line(grown[i],grown[4+(i-3)%4],'#c88624',1.6)}
 }
 const a=baseAxis[m],end=a.map(v=>v*350);line(a.map(v=>-110*v),end,'#915024',1.5,[5,4]);routeLine();drawRobot();if(!footprint)marker();label(end,'基座 '+sign[m],'#88411f',4,-4);
 const topOutline=footprint?footprint.vertices.slice(footprint.vertices.length/2):work.slice(4);
 const topPoint=topOutline.reduce((best,p)=>project(p)[0]>project(best)[0]?p:best);
 const basePoint=[topPoint[0],topPoint[1],state.h],top=project(topPoint),bottom=project(basePoint);if(top[1]>=0&&top[1]<h&&top[0]>=0&&top[0]<w)label(topPoint,'顶 '+fmt(state.h+state.build)+' mm','#875124',5,-4);if(bottom[1]>=0&&bottom[1]<h&&bottom[0]>=0&&bottom[0]<w)label(basePoint,'底 '+fmt(state.h)+' mm','#37546b',5,13);triad();cameraOverlay(work);
 canvas.dataset.printedHeight=String(topZ-state.h);canvas.dataset.pathKind=pathActive()&&route.batch?route.batch.frames[routeIndex].kind:'';canvas.dataset.azimuth=az.toFixed(4);canvas.dataset.elevation=elevation.toFixed(4);canvas.dataset.height=currentZ();canvas.dataset.parts=robot?robot.length:0;canvas.dataset.cloud=E('shellOn').checked?'shown':'off';canvas.dataset.section=E('cutOn').checked?'shown':'off';canvas.dataset.fixtures=boxes.length;
 if(reachExplicit&&robot){canvas.dataset.rendered=reachOverlay?.id??'';canvas.dataset.boundaryPoints=reachOverlay?.points.length??0;delete canvas.dataset.triangles}else if(shell&&robot){canvas.dataset.rendered=shellKey();canvas.dataset.boundaryPoints=shell.v.length/3;if(state.mode==='threshold'&&state.minPoses!==25)delete canvas.dataset.triangles;else canvas.dataset.triangles=D.mesh[m][state.mode==='threshold'?'all25':state.mode].f}else{delete canvas.dataset.rendered;delete canvas.dataset.boundaryPoints}}
// Candidate beds use the same world frame and camera as the recorded paths.
// A loop may outline a separate slab or the hole inside a ring.
function drawFootprint(){
 const layers=footprint.loops.map(loop=>({
  bottom:loop.map(p=>project([...p,state.h])),
  top:loop.map(p=>project([...p,state.h+state.build]))
 }));
 const face=(level,fill,stroke)=>{
  ctx.beginPath();
  for(const layer of layers){
   const p=layer[level];
   ctx.moveTo(p[0][0],p[0][1]);
   for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);
   ctx.closePath();
  }
  ctx.fillStyle=fill;ctx.fill('evenodd');ctx.strokeStyle=stroke;ctx.lineWidth=1.25;ctx.stroke();
 };
 face('bottom','rgba(230,165,56,.68)','#855914');
 const sides=[];
 for(const {bottom,top} of layers){
  for(let i=0;i<bottom.length;i++){
   const next=(i+1)%bottom.length;
   const p=[bottom[i],bottom[next],top[next],top[i]];
   sides.push({p,d:p.reduce((sum,v)=>sum+v[2],0)/4,c:'rgba(202,141,44,.10)'});
  }
 }
 drawPolys(sides);
 for(const {bottom,top} of layers){
  // Corners describe rectangular modules. On a round bed a few meridians suffice.
  const step=bottom.length<=8?1:Math.max(1,Math.round(bottom.length/4));
  ctx.strokeStyle='rgba(159,104,35,.63)';ctx.lineWidth=.85;
  for(let i=0;i<bottom.length;i+=step){
   ctx.beginPath();ctx.moveTo(bottom[i][0],bottom[i][1]);ctx.lineTo(top[i][0],top[i][1]);ctx.stroke();
  }
 }
 face('top','rgba(248,209,126,.15)','#a07229');
}
function loadFootprintMask(url,mount){
 if(!url)return;
 const key=mount+'|'+url;
 if(footprintMasks.has(key))return;
 footprintMasks.set(key,null);
 const image=new Image();
 image.onload=()=>{
  try{
   // The exported 260 x 260 PNG samples the common footprint from -1300 to
   // +1300 mm at 10 mm. Its first row is at +Y, and its background is opaque.
   const mask=document.createElement('canvas');
   mask.width=image.naturalWidth;mask.height=image.naturalHeight;
   const g=mask.getContext('2d');g.drawImage(image,0,0);
   const pixels=g.getImageData(0,0,mask.width,mask.height);
   const color=rgb[mount].split(',').map(Number);
   for(let i=0;i<pixels.data.length;i+=4){
    const inside=pixels.data[i]===191;
    for(let j=0;j<3;j++)pixels.data[i+j]=color[j];
    pixels.data[i+3]=inside?62:0;
   }
   g.putImageData(pixels,0,0);footprintMasks.set(key,mask);
   if(footprint?.maskKey===key)requestDraw();
  }catch{footprintMasks.delete(key)}
 };
 image.onerror=()=>footprintMasks.delete(key);
 image.src=url;
}
function drawFootprintMask(){
 delete canvas.dataset.sectionZ;
 const mask=footprintMasks.get(footprint.maskKey);
 if(!mask||!E('cutOn').checked)return;
 const z=state.h,p=project([-1300,1300,z]),px=project([1300,1300,z]),py=project([-1300,-1300,z]);
 ctx.save();
 ctx.transform((px[0]-p[0])/mask.width,(px[1]-p[1])/mask.width,
  (py[0]-p[0])/mask.height,(py[1]-p[1])/mask.height,p[0],p[1]);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(mask,0,0);ctx.restore();canvas.dataset.sectionZ=z;
}
host.setFootprint=spec=>{
 if(spec&&(!names[spec.mount]||!Number.isFinite(spec.h)||!(spec.d>0)||!spec.loops?.length||
  !spec.loops.every(loop=>loop.length>=3&&loop.every(p=>vecOK(p,2)))||!vecOK(spec.q_rad,6)))return false;
 const legend=root.querySelectorAll('.legend>span');
 const layerLabel=E('cutOn').parentNode.lastChild;
 footprint=null;
 delete canvas.dataset.footprint;delete canvas.dataset.footprintLoops;
 if(!spec){
  legend[1].lastChild.textContent='工件';layerLabel.textContent='剖面';
  requestDraw();return true;
 }
 const xy=spec.loops.flat();
 const x=xy.map(p=>p[0]),y=xy.map(p=>p[1]);
 const xmin=Math.min(...x),xmax=Math.max(...x),ymin=Math.min(...y),ymax=Math.max(...y);
 const center=[(xmin+xmax)/2,(ymin+ymax)/2];
 const vertices=[...xy.map(p=>[...p,spec.h]),...xy.map(p=>[...p,spec.h+spec.d])];
 const bounds=block(...center,spec.h+spec.d/2,xmax-xmin,ymax-ymin,spec.d);
 footprint={...spec,vertices,bounds,maskKey:spec.mount+'|'+spec.mask_url};
 displayPose=null;route=null;routeIndex=0;requestedPath++;
 applyLayout({mount:spec.mount,mode:'down',h:spec.h,build:spec.d,width_mm:Math.max(xmax-xmin,ymax-ymin),
  center_xy_mm:center,placement:'custom',target:'path',progress_pct:100},true);
 legend[1].lastChild.textContent='床面与打印高度';layerLabel.textContent='整件可达底面';
 canvas.dataset.footprint=spec.id;canvas.dataset.footprintLoops=spec.loops.length;
 loadFootprintMask(spec.mask_url,spec.mount);
 return true;
};
// Explicit overlays never fall back to a different dataset, including while loading.
host.setReachOverlay=data=>{reachExplicit=true;reachOverlay=data&&Array.isArray(data.points)?data:null;reachCache=null;reachSliceTiles=new WeakMap();requestDraw()};
host.setReplayPose=f=>{if(!pathActive()||!vecOK(f?.q_rad,6))return false;const q=f.q_rad;if(q.some((v,j)=>v<limits[j][0]||v>limits[j][1]))return false;routeIndex=range(0,route.q_rad.length-1,Math.floor(f.left_index)||0);const tcp=mult(frames(q,state.mount)[6],route.anchored?.tool_mm??D.tool);displayPose={q_rad:q.slice(),xyz_mm:posXYZ(tcp),alpha:range(0,1,Number(f.alpha)||0)};state.percent=100*(routeIndex+displayPose.alpha)/Math.max(1,route.q_rad.length-1);f.tcp_xyz_mm=displayPose.xyz_mm.slice();setPathPose();return true};
host.getReplayPath=()=>route;
host.seekReplay=index=>{if(!pathActive())return false;seek({path_index:index});updatePose();return true};
host.benchmarkRendering=({frames:count=30,fast=false}={})=>{if(!robot||!articulation)return null;const enabled=host.hasAttribute('fast-render'),saved=articulation,q=witness?.q??reference;host.toggleAttribute('fast-render',fast);const timings=[];for(let i=0;i<count+3;i++){const moving=q.slice();moving[0]+=.001*i;articulation=frames(moving,state.mount);const t=performance.now();draw();if(i>=3)timings.push(performance.now()-t)}articulation=saved;host.toggleAttribute('fast-render',enabled);requestDraw();timings.sort((a,b)=>a-b);return {renderer:fast&&fastRenderer?'webgl':'canvas2d',frames:count,triangles:D.cad.parts.reduce((s,p)=>s+p.f,0),median_ms:timings[Math.floor(count/2)],p95_ms:timings[Math.min(count-1,Math.floor(count*.95))],mean_ms:timings.reduce((a,b)=>a+b,0)/count}};
function drawReachOverlay(m){if(!reachOverlay||reachOverlay.mount!==m||!E('shellOn').checked){canvas.dataset.cloudCount=0;return}const points=reachOverlay.points,full=state.spaceView==='full',top=currentZ();const key=JSON.stringify([cam.w,cam.h,cam.k,cam.cx,cam.cy,cam.ca,cam.sa,cam.ce,cam.se,full,full?null:state.h,full?null:top]);if(!reachCache||reachCache.key!==key){const image=document.createElement('canvas');image.width=Math.ceil(cam.w);image.height=Math.ceil(cam.h);const cg=image.getContext('2d');cg.fillStyle='rgba('+rgb[m]+',.32)';let count=0;for(const p of points){if(!vecOK(p,3)||!full&&(p[2]<state.h-.01||p[2]>top+.01))continue;const projected=project(p);cg.fillRect(projected[0],projected[1],1.4,1.4);count++}reachCache={key,image,count};canvas.dataset.reachProjectionBuilds=String((Number(canvas.dataset.reachProjectionBuilds)||0)+1)}ctx.drawImage(reachCache.image,0,0);canvas.dataset.cloudCount=reachCache.count;canvas.dataset.cloudSource='explicit_world_overlay'}
function drawReachSection(m){delete canvas.dataset.sectionZ;if(!reachOverlay||reachOverlay.mount!==m||!E('cutOn').checked||!reachOverlay.slices)return;const target=pathActive()&&route.batch?printedZ():currentZ(),allowed=reachOverlay.layer_z_mm;const entries=Array.isArray(reachOverlay.slices)?reachOverlay.slices:Object.values(reachOverlay.slices);const slice=entries.find(s=>Math.abs(s.z_mm-target)<.51&&(!Array.isArray(allowed)||allowed.some(z=>Math.abs(z-s.z_mm)<.01)));if(!slice)return;if(Array.isArray(slice.rows)){let image=reachSliceTiles.get(slice);if(!image){image=document.createElement('canvas');image.width=image.height=slice.n;const cg=image.getContext('2d');cg.fillStyle='rgba('+rgb[m]+',.35)';for(const row of slice.rows)cg.fillRect(row[1],row[0],row[2]-row[1]+1,1);reachSliceTiles.set(slice,image)}const origin=slice.first_center_mm-slice.pitch_mm/2,z=slice.z_mm,p=project([origin,origin,z]),px=project([origin+slice.pitch_mm,origin,z]),py=project([origin,origin+slice.pitch_mm,z]);ctx.save();ctx.transform(px[0]-p[0],px[1]-p[1],py[0]-p[0],py[1]-p[1],p[0],p[1]);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0);ctx.restore()}else if(Array.isArray(slice.points)){ctx.fillStyle='rgba('+rgb[m]+',.45)';for(const p of slice.points){if(!vecOK(p,3))continue;const a=project(p);ctx.fillRect(a[0],a[1],2.3,2.3)}}else return;canvas.dataset.sectionZ=slice.z_mm;label([0,0,slice.z_mm],'截面高度 '+fmt(slice.z_mm)+' mm','#38685b',0,-6)}

applyLayout({mount:'side',mode:reachExplicit?'down':'all25',h:-650,build:300},true);loadCAD().then(parts=>{robot=parts;requestDraw();if(embedded){lastAck='';notify({type:'ur7e-shape-ready'})}}).catch(e=>{E('status').textContent='机械臂模型未载入。'+e.message});new ResizeObserver(requestDraw).observe(canvas);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay()});

 }
}
customElements.define('robot-scene',RobotScene);
