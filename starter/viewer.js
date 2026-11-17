import {fk, pos, mul, validate} from './kinematics.js';
import {MeshRenderer, validateVisual} from './mesh.js';

const el = id => document.getElementById(id);
const canvas = el('view'), context = canvas.getContext('2d');
const renderer = new MeshRenderer(el('mesh'));
const plans = [], visualCache = new Map(), resultCache = new Map();
let catalog = null, data = null, index = 0, playing = false, last = 0, ticket = 0;
let azimuth = .85, elevation = .4, zoom = 1, center = [0, 0, 0], radius = 600;
let activeVisual = null, currentPlan = null, drag = null;

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error('文件未能读取 ' + url);
  return response.json();
}

async function bytesHash(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}

async function fetchVisual(entry) {
  if (!visualCache.has(entry.robot_sha256)) {
    const response = await fetch(entry.url);
    if (!response.ok) throw Error('模型文件未能读取');
    const bytes = await response.arrayBuffer();
    if (!entry.sha256 || await bytesHash(bytes) !== entry.sha256) throw Error('模型文件校验值不匹配');
    const visual = JSON.parse(new TextDecoder().decode(bytes));
    validateVisual(visual, entry.robot_sha256);
    visualCache.set(entry.robot_sha256, visual);
  }
  return visualCache.get(entry.robot_sha256);
}

function pause() {
  playing = false;
  el('play').textContent = '播放';
}

function enableControls(enabled) {
  for (const id of ['play', 'progress', 'first', 'middle', 'last', 'fit']) el(id).disabled = !enabled;
}

function showError(error) {
  el('error').textContent = error.message;
  el('error').hidden = false;
}

function fact(label, value) {
  const row = el('facts').insertRow();
  row.insertCell().textContent = label;
  row.insertCell().textContent = value;
}

function populateFacts(error) {
  const scene = data.scene, piece = scene.workpiece;
  el('facts').replaceChildren();
  fact('机械臂', data.robot.id);
  fact('安装', scene.label || scene.id);
  if (piece) {
    fact('工件 / mm', [piece.width_mm, piece.depth_mm, piece.height_mm].join(' × '));
    fact('中心 XY / mm', piece.center_xy_mm.join(', '));
    fact('底面 Z / mm', piece.bottom_z_mm);
  }
  fact('回放节点', data.samples.length.toLocaleString());
  fact('目标点位', data.assessment.reachability === 'sampled_pass' ? '已存节点通过' : '未在共享版复验目标');
  fact('关节连续性', data.assessment.path === 'sampled_continuity_pass' ? '相邻节点通过' : '未检查');
  fact('碰撞', {not_checked: '共享版未检查', sampled_clear: '导入记录采样通过', hit: '导入记录检出碰撞'}[data.assessment.collision]);
  fact('任务', data.solver.task === 'position_only' ? '短直线，工具朝向自由' : data.solver.orientation);
  if (data.assessment.reachability === 'sampled_pass') fact('最大目标误差', error.toFixed(5) + ' mm');
  fact('模型', activeVisual ? '已配准连杆外形' : '运动学骨架');
  el('joints').replaceChildren();
  for (const joint of data.robot.joints) {
    const row = el('joints').insertRow();
    row.insertCell().textContent = joint.name;
    row.insertCell();
  }
  el('identity').textContent = 'robot ' + data.robot_sha256 + ' · scene ' + data.scene_sha256 +
    ' · solver ' + data.solver.name + ' / ' + data.solver.source_sha256;
}

function fit() {
  if (!data) return;
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  function include(point) {
    point.forEach((value, i) => { low[i] = Math.min(low[i], value); high[i] = Math.max(high[i], value); });
  }
  for (const sample of data.samples) include(pos(sample.world_T_tcp));
  const frames = fk(data.robot, data.scene, data.samples[Math.floor(index)].q_rad);
  frames.chain.forEach(t => include(pos(t)));
  const piece = data.scene.workpiece;
  if (piece) for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [0, 1]) {
    include([piece.center_xy_mm[0] + x*piece.width_mm/2, piece.center_xy_mm[1] + y*piece.depth_mm/2,
      piece.bottom_z_mm + z*piece.height_mm]);
  }
  center = low.map((value, i) => (value + high[i])/2);
  radius = Math.max(150, Math.hypot(...high.map((value, i) => value-low[i]))/2);
  zoom = 1;
  draw();
}

function attachVisual(visual) {
  activeVisual = visual;
  renderer.setVisual(visual);
  el('geometryNote').textContent = visual ? '连杆外形 · 拖动旋转 / 滚轮缩放' : '运动学骨架 · 可导入匹配外形';
  canvas.dataset.parts = String(visual?.parts.length || 0);
}

async function selectPlan(plan) {
  const request = ++ticket;
  currentPlan = plan;
  pause(); data = null; activeVisual = null;
  canvas.dataset.ready = 'false';
  canvas.dataset.plan = plan.id;
  el('error').hidden = true;
  el('loading').hidden = false;
  el('loading').textContent = '正在载入并核对所选方案…';
  enableControls(false);
  renderer.setVisual(null);
  context.clearRect(0, 0, canvas.width, canvas.height);
  renderer.draw([], [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]], canvas.width, canvas.height);
  el('facts').replaceChildren(); el('joints').replaceChildren(); el('tcp').textContent = '';
  for (const button of el('plans').children) button.setAttribute('aria-pressed', String(button.dataset.plan === plan.id));
  el('planTitle').textContent = plan.label;
  el('planDescription').textContent = plan.description || '';
  try {
    if (!resultCache.has(plan.id)) resultCache.set(plan.id, await json(plan.result));
    const result = resultCache.get(plan.id);
    const maximumError = await validate(result);
    const visualEntry = catalog.visuals?.find(v => v.robot_sha256 === result.robot_sha256);
    let visual = visualCache.get(result.robot_sha256) || null;
    let visualError = null;
    if (!visual && visualEntry) {
      try { visual = await fetchVisual(visualEntry); }
      catch (error) { visualError = error; }
    }
    if (request !== ticket) return;
    data = result;
    index = Number.isInteger(plan.initial_node) ? Math.max(0, Math.min(data.samples.length-1, plan.initial_node)) : 0;
    attachVisual(visual);
    populateFacts(maximumError);
    el('status').textContent = '模型身份与逐节点正运动学校验通过';
    el('progress').max = data.samples.length-1;
    el('loading').hidden = true;
    enableControls(true);
    fit();
    canvas.dataset.ready = 'true';
    if (visualError) showError(visualError);
    if (plan.result && location.protocol !== 'file:') {
      const url = new URL(location.href);
      url.searchParams.set('plan', plan.id);
      history.replaceState(null, '', url);
    }
  } catch (error) {
    if (request !== ticket) return;
    data = null;
    el('loading').textContent = '方案未载入';
    el('status').textContent = '结果校验未通过';
    showError(error);
  }
}

function addPlan(plan) {
  if (!plan.id || plans.some(p => p.id === plan.id)) throw Error('方案编号为空或重复');
  plans.push(plan);
  const button = document.createElement('button');
  button.dataset.plan = plan.id;
  button.textContent = plan.label;
  if (plan.subtitle) {
    const note = document.createElement('small'); note.textContent = plan.subtitle; button.append(note);
  }
  button.onclick = () => selectPlan(plan);
  el('plans').append(button);
}

function draw() {
  if (!data) return;
  const width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(devicePixelRatio, 2);
  canvas.width = width*dpr; canvas.height = height*dpr; context.scale(dpr, dpr);
  const scale = Math.min(width, height)*.42/radius*zoom;
  const ca = Math.cos(azimuth), sa = Math.sin(azimuth), ce = Math.cos(elevation), se = Math.sin(elevation);
  const right = [-sa, ca, 0], up = [-ca*se, -sa*se, ce], depth = [ca*ce, sa*ce, se];
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v*b[i], 0);
  const projection = [
    [...right.map(v => v*2*scale/width), -dot(right, center)*2*scale/width],
    [...up.map(v => v*2*scale/height), -dot(up, center)*2*scale/height-.06],
    [...depth.map(v => -v/(radius*10)), dot(depth, center)/(radius*10)],
    [0, 0, 0, 1]
  ];
  function project(point) {
    const local = point.map((v, i) => v-center[i]);
    return [width/2 + dot(right, local)*scale, height*.53 - dot(up, local)*scale];
  }
  function line(points, color, size = 1) {
    context.strokeStyle = color; context.lineWidth = size; context.lineCap = 'round'; context.beginPath();
    points.forEach((p, i) => { const [x, y] = project(p); if (i) context.lineTo(x, y); else context.moveTo(x, y); });
    context.stroke();
  }
  const left = Math.floor(index), next = Math.min(data.samples.length-1, left+1), fraction = index-left;
  const sample = data.samples[left];
  const q = sample.q_rad.map((v, i) => v+(data.samples[next].q_rad[i]-v)*fraction);
  const frames = fk(data.robot, data.scene, q);
  renderer.draw(frames.chain, projection, canvas.width, canvas.height);
  const ground = data.scene.world_T_base[2][3], span = radius*1.15;
  for (let i = -5; i <= 5; i++) {
    const d = i*span/5;
    line([[center[0]-span, center[1]+d, ground], [center[0]+span, center[1]+d, ground]], '#b2c5b638');
    line([[center[0]+d, center[1]-span, ground], [center[0]+d, center[1]+span, ground]], '#b2c5b638');
  }
  const piece = data.scene.workpiece;
  if (piece) {
    const heightNow = Math.max(0, Math.min(piece.height_mm, sample.printed_height_mm || 0));
    const layer = z => [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([x,y]) =>
      [piece.center_xy_mm[0]+x*piece.width_mm/2, piece.center_xy_mm[1]+y*piece.depth_mm/2, piece.bottom_z_mm+z]);
    const bottom = layer(0), top = layer(heightNow);
    line(bottom, '#718d8377'); line(top, '#cb8a35', 2);
    for (let i = 0; i < 4; i++) line([bottom[i], top[i]], '#cb8a3577');
  }
  if (el('showPath').checked) line(data.samples.map(s => pos(s.world_T_tcp)), '#d38436aa', 1.5);
  if (!activeVisual || el('showSkeleton').checked) line(frames.chain.map(pos), '#0c867e', 4);
  line([pos(frames.chain[6]), pos(frames.tcp)], '#346d81', 4);
  const tip = pos(frames.tcp);
  ['#b64d42', '#39854b', '#386cbe'].forEach((color, j) => line([tip, tip.map((v,i)=>v+frames.tcp[i][j]*radius*.08)], color, 2));
  el('progress').value = left;
  el('frame').textContent = (left+1)+' / '+data.samples.length;
  q.forEach((value, j) => el('joints').rows[j].cells[1].textContent = (value*180/Math.PI).toFixed(2));
  el('tcp').textContent = 'TCP 世界坐标 ('+tip.map(v => v.toFixed(2)).join(', ')+') mm';
  el('stage').textContent = sample.stage || '节点 '+(left+1);
  canvas.dataset.node = String(left); canvas.dataset.tcp = JSON.stringify(tip); canvas.dataset.robot = data.robot_sha256;
  canvas.dataset.triangles = String(activeVisual ? activeVisual.parts.reduce((n,p)=>n+p.triangles.length,0) : 0);
}

el('play').onclick = () => {
  playing = !playing;
  if (index >= data.samples.length-1) index = 0;
  el('play').textContent = playing ? '暂停' : '播放'; last = performance.now();
};
el('progress').oninput = event => { pause(); index = +event.target.value; draw(); };
for (const [id, fraction] of [['first',0], ['middle',.5], ['last',1]]) {
  el(id).onclick = () => { pause(); index = Math.round(fraction*(data.samples.length-1)); draw(); };
}
el('fit').onclick = fit;
el('front').onclick = () => { azimuth = -Math.PI/2; elevation = 0; draw(); };
el('topview').onclick = () => { azimuth = -Math.PI/2; elevation = Math.PI/2; draw(); };
el('showPath').onchange = draw; el('showSkeleton').onchange = draw;
canvas.onpointerdown = event => { drag = [event.clientX,event.clientY]; canvas.setPointerCapture(event.pointerId); };
canvas.onpointerup = () => drag = null; canvas.onpointercancel = () => drag = null;
canvas.onpointermove = event => {
  if (!drag) return;
  azimuth += (event.clientX-drag[0])*.008;
  elevation = Math.max(-1.4, Math.min(1.4, elevation+(event.clientY-drag[1])*.008));
  drag = [event.clientX,event.clientY]; draw();
};
canvas.addEventListener('wheel', event => { event.preventDefault(); zoom = Math.max(.2,Math.min(5,zoom*Math.exp(-event.deltaY*.001))); draw(); }, {passive:false});
new ResizeObserver(draw).observe(canvas);

el('file').onchange = async event => {
  const added = [];
  for (const file of event.target.files) {
    try {
      const result = JSON.parse(await file.text()); await validate(result);
      const id = 'import-'+plans.length;
      const plan = {id, label: result.label || file.name, description:'导入结果 · '+result.robot.id};
      resultCache.set(id, result); addPlan(plan); added.push(plan);
    } catch (error) { showError(Error(file.name+' · '+error.message)); }
  }
  el('importStatus').textContent = '已新增 '+added.length+' 个方案';
  if (added.length) await selectPlan(added[0]);
};
el('visualFile').onchange = async event => {
  try {
    if (!data) throw Error('请先选择一个已载入的方案');
    const visual = JSON.parse(await event.target.files[0].text());
    validateVisual(visual, data.robot_sha256);
    visualCache.set(data.robot_sha256, visual); attachVisual(visual); draw();
    el('importStatus').textContent = '已接入匹配的 '+visual.parts.length+' 个连杆外形';
  } catch (error) { showError(error); }
};

function animate(now) {
  if (playing && data) {
    const speed = Math.max(8, data.samples.length/35);
    index = Math.min(data.samples.length-1, index+(now-last)*speed/1000);
    draw(); if (index >= data.samples.length-1) pause();
  }
  last = now; requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
try {
  catalog = await json('catalog.json');
  if (catalog.schema !== 'six-r-catalog-v1' || !catalog.plans?.length) throw Error('方案清单格式错误');
  catalog.plans.forEach(addPlan);
  const requested = new URLSearchParams(location.search).get('plan');
  await selectPlan(plans.find(p=>p.id===requested) || plans[0]);
} catch (error) { showError(error); el('loading').textContent = '请按 README 启动本机服务'; }
