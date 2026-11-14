/* The batch archive contains world TCP targets in mm and lifted DH joint angles in degrees. */
window.makeBatchReplay = function makeBatchReplay(record, expectedId, layout) {
  function fail(text) { throw Error(text); }
  const arrayOf=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
  if(record?.schema!==1 || record.id!==expectedId || record.stage!=='infill_path' ||
     !Number.isInteger(record.branch) || record.branch<0 || record.branch>7 ||
     !/^[a-f0-9]{64}$/.test(record.joint_path_sha256 || ''))fail('轨迹文件的工况、阶段或关节记录标识不完整。');
  const candidate=record.candidate, dimensions=[['h_mm',layout.h],['d_mm',layout.d],
    ['side_mm',layout.width],['x_mm',layout.x],['y_mm',layout.y]];
  if(!candidate || candidate.mount!==layout.mount || layout.placement!=='custom' || layout.mode!=='down' ||
     !dimensions.every(([key,v])=>Number.isFinite(candidate[key]) && Math.abs(candidate[key]-v)<=1e-6))
    fail('轨迹文件与当前安装、工件或中心不匹配。');
  if(!Array.isArray(record.frames)||record.frames.length<2 || !Array.isArray(record.layer_offsets_mm) ||
     !record.layer_offsets_mm.length || !record.layer_offsets_mm.every(z=>Number.isFinite(z)&&z>=0&&z<=layout.d))
    fail('轨迹文件缺少逐节点记录或层高。');
  const xyz=[],joints=[];
  for(const f of record.frames) {
    if(!arrayOf(f?.q_deg,6)||!arrayOf(f.xyz_mm,3)||typeof f.kind!=='string'||!f.kind ||
       !Number.isFinite(f.layer_mm)||!Number.isFinite(f.printed_height_mm) ||
       f.printed_height_mm<-.001 || f.printed_height_mm>layout.d+.001 ||
       f.layer_mm<-.001 || f.layer_mm>layout.d+.001 ||
       Math.abs(f.xyz_mm[2]-layout.h-f.layer_mm)>.01)
      fail('已存路径的关节、目标或实体层高不完整。');
    xyz.push(f.xyz_mm);
    joints.push(f.q_deg.map(x=>x*Math.PI/180));
  }
  return {schema:1,id:expectedId,batch:record,branch:record.branch,
          params:{mount:layout.mount,h_mm:layout.h,d_mm:layout.d,side_mm:layout.width,
                  center_xy_mm:[layout.x,layout.y],layer_mm:layout.d},
          xyz_mm:xyz,q_rad:joints,states:new Array(xyz.length).fill(null),
          bounds:{position_bound_mm:.5,orientation_bound_deg:.5},known_prefix_count:xyz.length,
          kinematic_passed:true};
};
