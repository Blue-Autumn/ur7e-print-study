# 给接入 AI 的说明

目标是让接收者先复跑样例，再替换机械臂参数并获得第一条自己的轨迹。仅在 `starter/` 或其独立副本工作。公开汇报其他目录由原项目维护。

## 先跑通

1. 阅读 README，执行 `python run.py compute --out reproduced.json`，再执行 `python run.py serve --result reproduced.json`。
2. 执行 `python run.py serve`，检查左侧连杆外形、右侧四个方案按钮、工件、关节表、TCP、播放/暂停、拖动、三处定位、旋转和缩放。地装、侧装、吊装为已存打印回放，短直线示例可由内置求解器复算。
3. 保留原输入副本，换一个臂长、基座或 TCP 后重算。确认模型身份变化，逐节点 FK 核对通过，显示与输出均变化。任何改变都要重新计算对应轨迹、点云和面积。

## 集中索取的资料

- 型号及机构拓扑，是否六个串联转动关节。
- 厂家 DH 表或 URDF、各轴方向与零位定义、关节顺序、绝对限位及允许圈数。校准参数有则一起提供。
- 基座相对工作世界坐标的定位，法兰坐标定义、TCP 工具变换、目标轨迹和所需喷嘴朝向。
- 做碰撞时所需的各连杆/喷头/支架/工件几何、单位、各几何相对连杆变换和需要忽略的相邻对。

缺资料时集中列出，继续保留可运行样例，明确新型号的未验证字段。未知外形用骨架显示。只有尺寸或一张照片时，不能据此宣称已确定运动学零位或碰撞几何。

## 输入和单位

`robot.json` 是机器人描述，`scene.json` 是工具与场景。长度全部为 mm，角度全部为 rad。关节顺序为基座到法兰 J1…J6。关节数值是保留圈数的绝对值，+2π 与 0 对应不同的走线状态，不作自动归一化。

每轴只支持标准 DH，单轴矩阵为 `Rz(sign*q + offset_rad) Tz(d_mm) Tx(a_mm) Rx(alpha_rad)`。`sign` 为 ±1。`q` 的限位约束的是输入绝对关节角，零位偏置仅用于运动链。修改 DH 或导入 URDF 时必须确认坐标转换，不能把修改后的 DH 直接送入原项目 UR7e 专用解析 IK 或平面公式。

全部 4×4 矩阵为嵌套行数组，右手坐标，用列向量。`A_T_B` 把 B 坐标表达的点变为 A 坐标。矩阵平移栏为 mm，旋转栏无单位。`world_T_tcp = world_T_base × base_T_flange(q) × flange_T_tcp`。显示器按实际矩阵绘制，未假定安装面水平。

## 小计算与外部求解器

`run.py` 的 `forward` 支持上述参数化六轴链。`solve_position` 是阻尼最小二乘数值位置 IK，只约束 XYZ，朝向自由，不穷举分支或保证全局收敛。`calculate` 从已知初姿出发生成短直线，输出已存相邻点检查结果。

需要固定工具方向、扫描工作空间、避障或完整打印路径时，用接收者的求解器计算，再导入同一查看器。若用 RoboDK，只连接接收者已经打开的仿真实例，连接失败即报错，不启动实例、不连接或控制实机。此包没有 RoboDK 运行依赖。外部求解器使用的 DH 链须与本展示器一致，否则先校准/转换模型与关节编码再导入。

## 结果接口

`example.json` 是完整最小样例，必须保留以下字段。

| 字段 | 含义 |
| --- | --- |
| `schema` | `six-r-result-v1` |
| `robot`, `scene` | 本次实际使用的完整描述，含 `id`、`revision`、单位、限位、工具和基座 |
| `robot_sha256`, `scene_sha256` | 使用 `run.fingerprint` 对输入生成身份；禁止沿用其他输入的结果 |
| `solver` | 名称/版本 `name`、算法源或构建 SHA-256 `source_sha256`、任务 `task`、朝向约束描述 `orientation` |
| `assessment.reachability` | `sampled_pass` 或 `not_checked` |
| `assessment.path` | `sampled_continuity_pass` 或 `not_checked` |
| `assessment.collision` | `not_checked`、`sampled_clear` 或 `hit` |
| `assessment.geometry` | 当前查看器固定为 `kinematic_skeleton` |
| `samples[]` | 各节点的 `q_rad` 六维绝对角、`world_T_tcp`、要求可达时的 `target_xyz_mm`；首节点须匹配 `scene.start_q_rad` |
| `collision_evidence` | 碰撞已检查时必须提供几何版本/哈希、算法、采样间距、对象对和出处；导入器只核对字段存在，不独立证明碰撞结论 |

`assessment.geometry` 表示结果的求解/检查模型范围，查看器另按外形文件的机器人身份加载已配准网格。显示外形不改变碰撞检查状态。`scene.workpiece` 可选，含 `center_xy_mm`、`width_mm`、`depth_mm`、`height_mm`、`bottom_z_mm`。`samples[].printed_height_mm` 驱动当前已打印工件的轮廓高度，`samples[].stage` 显示阶段。`label` 可作为导入后的方案名称。

## 连杆模型与方案接入

查看器分为 `viewer.html`、`viewer.css`、`viewer.js`、`kinematics.js`、`mesh.js`。普通接入只改机器人、场景、结果、模型和 `catalog.json`。`catalog.json` 的 `plans[]` 使用唯一 `id`、`label`、`result` 相对路径，可附 `subtitle` 与 `description`。`visuals[]` 含相对 `url`、匹配的 `robot_sha256` 和文件原始字节 SHA-256 `sha256`。多个方案可以共用模型，机器人身份不匹配时显示骨架。导入新结果会新增按钮，切换时同步更新模型、轨迹、工件和结果表。

模型接口为 `six-r-visual-v1`。顶层 `units` 固定 `mm`，`robot_sha256` 由 `run.fingerprint(robot)` 产生。`parts[]` 每项包含 `name`、`link_index`、`link_T_mesh`、`vertices_mm`、`triangles`、`color_rgb` 或逐面 `colors_rgb`。顶点为 N×3 数组，面为 M×3 零起始整数索引。`link_index=0` 为静态基座，1…6 分别随 DH 第1…6轴之后的坐标系运动。网格世界变换为 `world_T_link(q) × link_T_mesh`，网格顶点位于 mesh 局部系。多个几何可以绑定同一连杆。URDF 的 link/visual 原点要先换算到此标准 DH 约定。

可用 `python run.py visual --parts my-parts.json --robot robot.json --out my-visual.json` 打包。`my-parts.json` 顶层含 `units: "mm"`、`sources` 和 `parts[]`，每项给出 `name`、`file`、`link_index`、`link_T_mesh`、可选 `color_rgb`。`file` 相对清单目录，可为 ASCII/二进制 STL 或含 `vertices_mm`、`triangles` 的 JSON。附带的 `mesh-packing/` 是可实际运行的打包示例。STL 没有单位字段，必须先确认尺寸并换算。显示网格限制总计 500,000 三角面，可在转换时简化。该过程不生成碰撞结论。

用 `python run.py catalog result-a.json result-b.json --visual my-visual.json` 生成自己的清单，随后 `python run.py serve` 打开。外部求解器写好约定结果即可沿用整个界面。原 UR7e 三个打印示例只展示原归档角度，以名义模型复核 FK，未在共享版重跑原生碰撞。保留其 `provenance` 和来源说明。

哈希由 `run.fingerprint` 产生。递归排序对象键，数值变为 `{"$number":"尾数e指数"}`，尾数采用 12 位小数的科学计数法，指数为带可选负号的十进制整数，其余保留，UTF-8 紧凑 JSON 后取 SHA-256。Python 与浏览器均实现此规则。它用于防止误配数据，不构成签名或真实性证明。

全姿态约束的外部求解器还须自行验收旋转目标及工具方向误差，并把结论与阈值写入 `solver` 额外字段。`world_T_tcp` 核对的是模型 FK。`target_xyz_mm` 核对的是目标位置，当前接口没有独立目标旋转验证。仅点位可达时把 `path` 设为 `not_checked`。连续性通过仅表示已存相邻绝对角变化 ≤0.1 rad，未证明节点间无碰撞。工具轴/物理约束与实物打印能力需要独立验证。

## 接收验收

运行 `python run.py import RESULT.json --out imported.json`，必须通过输入哈希、刚体变换、绝对限位、逐节点 FK 全矩阵误差 ≤1e-5、目标位置误差 ≤0.05 mm，以及所声明的相邻节点检查。至少用厂家/独立求解器给出的一个已知构型核对 TCP、轴方向及零位；本包内部 Python/JS 一致性不足以单独确认新型号真实参数。

浏览器选择导入结果后重复播放与定位。故意只改结果中的机器人臂长而保留旧身份/轨迹，必须拒绝；改身份但保留旧 TCP 轨迹，也必须因 FK 不匹配拒绝。保留作者、来源、已有授权信息，避免带入私人记录、凭据或个人绝对路径。
