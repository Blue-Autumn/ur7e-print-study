export const mul=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*b[k][j],0)));
export const pos=t=>[t[0][3],t[1][3],t[2][3]];
export function fk(robot,scene,q){
 let t=scene.world_T_base,chain=[t];
 robot.joints.forEach((j,i)=>{
  const angle=j.sign*q[i]+j.offset_rad,c=Math.cos(angle),s=Math.sin(angle),ca=Math.cos(j.alpha_rad),sa=Math.sin(j.alpha_rad);
  t=mul(t,[[c,-s*ca,s*sa,j.a_mm*c],[s,c*ca,-c*sa,j.a_mm*s],[0,sa,ca,j.d_mm],[0,0,0,1]]);chain.push(t);
 });return {chain,tcp:mul(t,scene.flange_T_tcp)};
}
function canonical(value){
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('数值必须有限');const [m,e]=value.toExponential(12).split('e');return {$number:m+'e'+Number(e)}}
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
export async function hash(value){const bytes=new TextEncoder().encode(JSON.stringify(canonical(value)));const result=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result),x=>x.toString(16).padStart(2,'0')).join('')}
export function rigid(t){
 if(!Array.isArray(t)||t.length!==4||t.some(row=>!Array.isArray(row)||row.length!==4||row.some(x=>!Number.isFinite(x))))throw Error('变换矩阵格式错误');
 if(t[3].some((x,i)=>Math.abs(x-[0,0,0,1][i])>1e-8))throw Error('矩阵末行错误');
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(Math.abs(t.reduce((s,row,k)=>s+(k<3?row[i]*row[j]:0),0)-(i===j?1:0))>1e-6)throw Error('旋转矩阵错误');
 const det=t[0].slice(0,3).reduce((s,x,j)=>s+x*(t[1][(j+1)%3]*t[2][(j+2)%3]-t[1][(j+2)%3]*t[2][(j+1)%3]),0);if(Math.abs(det-1)>1e-6)throw Error('坐标系必须右手');
}
export async function validate(data){
 if(data.schema!=='six-r-result-v1'||data.robot.schema!=='six-r-dh-v1'||data.scene.schema!=='six-r-scene-v1')throw Error('结果接口版本不匹配');
 if(data.robot.units.length!=='mm'||data.robot.units.angle!=='rad'||data.robot.joints.length!==6)throw Error('需要六轴、毫米和弧度');
 for(const j of data.robot.joints){if(j.type!=='revolute'||![1,-1].includes(j.sign)||!['a_mm','d_mm','alpha_rad','offset_rad'].every(k=>Number.isFinite(j[k]))||j.limits_rad.length!==2||!j.limits_rad.every(Number.isFinite)||j.limits_rad[0]>=j.limits_rad[1])throw Error('DH 或限位错误')}
 rigid(data.scene.world_T_base);rigid(data.scene.flange_T_tcp);
 if(await hash(data.robot)!==data.robot_sha256||await hash(data.scene)!==data.scene_sha256)throw Error('模型或工具/场景身份不匹配，请重新计算');
 if(!data.solver.name||!data.solver.source_sha256)throw Error('缺少求解器版本');
 const assessment=data.assessment;
 if(!['sampled_pass','not_checked'].includes(assessment.reachability)||!['sampled_continuity_pass','not_checked'].includes(assessment.path)||!['not_checked','sampled_clear','hit'].includes(assessment.collision)||assessment.geometry!=='kinematic_skeleton')throw Error('判定状态错误');
 if(assessment.collision!=='not_checked'&&!data.collision_evidence)throw Error('缺少碰撞检查出处');
 if(!Array.isArray(data.samples)||data.samples.length<2||data.samples.length>100000)throw Error('节点数量错误');
 let maximum=0,previous=null;
 for(const sample of data.samples){
  const q=sample.q_rad;if(q.length!==6||!q.every((x,i)=>Number.isFinite(x)&&x>=data.robot.joints[i].limits_rad[0]&&x<=data.robot.joints[i].limits_rad[1]))throw Error('关节角越限或格式错误');
  rigid(sample.world_T_tcp);const actual=fk(data.robot,data.scene,q).tcp;
  if(actual.some((row,i)=>row.some((x,j)=>Math.abs(x-sample.world_T_tcp[i][j])>1e-5)))throw Error('FK 与轨迹/模型不一致');
  if(assessment.reachability==='sampled_pass'){
   if(sample.target_xyz_mm.length!==3||!sample.target_xyz_mm.every(Number.isFinite))throw Error('目标坐标错误');
   const error=Math.hypot(...pos(actual).map((x,i)=>x-sample.target_xyz_mm[i]));maximum=Math.max(maximum,error);if(error>.05)throw Error('目标误差超过 0.05 mm');
  }
  if(previous&&assessment.path==='sampled_continuity_pass'&&q.some((x,i)=>Math.abs(x-previous[i])>.1))throw Error('相邻绝对关节角变化超过 0.1 rad');previous=q;
 }
 if(data.samples[0].q_rad.some((x,i)=>Math.abs(x-data.scene.start_q_rad[i])>1e-8))throw Error('首节点与场景初姿不一致');
 return maximum;
}
