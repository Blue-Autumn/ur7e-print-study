# 六轴机械臂最小共享版

先打开[在线查看页](https://blue-autumn.github.io/ur7e-print-study/starter/viewer.html)。左侧是可旋转的 UR7e 连杆外形与路径，右侧点击地装、侧装、吊装方案，切换到对应工件和关节轨迹。可以播放/暂停、拖动进度、定位起点/中点/终点，也可以切换正视、俯视和全景。

本目录可以独立复制。它包含完整查看器、七个已配准连杆网格、三个原汇报的打印关节回放，以及可复算的 30 mm 直线示例。右侧“参数计算”示例使用演示用 100 mm 轴向 TCP，其余方案使用各自归档工具和安装变换。每条结果都带输入身份并重新核对正运动学，原回放的碰撞与原生求解在共享版中未重算。

## 收到后先运行

安装 Python 3.10 或更新版，使用系统终端。此目录只使用 Python 标准库和浏览器，无需安装 Python 包。

下载[独立 starter.zip](https://blue-autumn.github.io/ur7e-print-study/starter.zip)，解压，进入包含 `run.py` 的目录。也可以从仓库取出 `starter/`。

```sh
python run.py serve
```

打开终端打印的 `http://127.0.0.1:8766/viewer.html`。点击右侧任一方案即可查看。若端口被占用，加 `--port 8767`。在终端按 Ctrl+C 停止服务。

## 做一次小计算

```sh
python run.py compute --out my-result.json
```

随后展开右侧“接入自己的结果与模型”，在“结果”中选择 `my-result.json`，页面会新增方案按钮。可一次选择多条结果。也可以重启为 `python run.py serve --result my-result.json`，只查看这一条结果。

要验证参数有效，可将 `robot.json` 中 J2 的 `a_mm` 从 `-425` 改成 `-450`，修改 `id` 或 `revision`，再次计算并导入。起点 TCP 和关节解都会变化。输入身份改变后，旧 UR7e 外形会自动停用，显示新参数骨架，直到导入匹配外形。修改 `scene.json` 可改变基座、工具 TCP、初始绝对关节角和直线路径位移。

此计算使用通用六轴标准 DH 的数值位置逆解，逐点沿用前一点关节角。它约束 TCP 的 XYZ，喷嘴朝向自由。样例验证目标位置误差 ≤0.05 mm、关节限位和相邻节点变化 ≤0.1 rad。求解器可能在奇异位形或其他初姿失败；失败会报错并保留原输出。它未做全空间搜索、完整打印姿态求解、碰撞、刚度或实物验证。

## 接入另一台机械臂

把本目录和型号资料交给自己的 AI，按 [AGENTS.md](AGENTS.md) 替换机器人描述并先运行这个小任务。内置计算入口支持六个转动关节的串联标准 DH 链，包括关节方向、零位偏置、绝对限位、基座和 TCP 变换。闭链、移动轴、柔性关节或非标准 DH 模型需要适配求解器。

若使用 RoboDK 或自己的求解器，输出 `example.json` 同样的 `six-r-result-v1` 结构，然后执行一次检查/导入。

```sh
python run.py import other-result.json --out imported.json
```

页面直接选择 `imported.json` 即可查看。带关节角和 TCP 目标的结果会重新核对模型身份、正运动学和状态字段。原始 UR7e 结果只属于随附的 UR7e 输入，新型号应重新计算。

## 接入外形与多方案页面

对方准备各连杆的 STL 或三角网格 JSON，并按 [AGENTS.md](AGENTS.md) 编写 `my-parts.json`，记录每个网格属于哪个 DH 连杆、相对该连杆的变换。所有网格先换算成 mm。

```sh
python run.py visual --robot robot.json --parts my-parts.json --out my-visual.json
```

在页面“外形”中选择 `my-visual.json`，就能用同一查看器驱动新机器人外形。可先在附带的 `mesh-packing/parts.json` 上试跑此命令，确认 STL 与变换导入流程。该测试网格是法兰端小立方体。

要把自己的多个结果永久列成按钮，运行以下命令，再启动 `python run.py serve`。

```sh
python run.py catalog result-a.json result-b.json --visual my-visual.json
```

`catalog.json` 中可修改方案名称、描述、排序及文件地址。网页、样例与模型全部使用相对路径，可整体复制到其他静态网站。原始模型和结果仍由提供方求解与配准，方案选择、网格加载、关节驱动、结果表格和回放界面已包含在本目录。

## 来源

本目录整理自 Blue-Autumn 的 UR7e 打印实验项目。UR7e 外形提取自原项目已经公开展示的分连杆网格，来源、网格/原模型校验值及局限保留在 `ur7e-visual.json`。三个打印示例保留原轨迹文件校验值和原汇报链接。本目录的通用 DH 正运动学沿用 `lab/ur7e_kinematics.py` 的标准 DH 约定，并提供独立的小型数值求解与查看器。

UR7e 名义尺寸来源于 [Universal Robots DH 参数表](https://www.universal-robots.com/articles/ur/application-installation/dh-parameters-for-calculations-of-kinematics-and-dynamics/)，关节范围来源于 [UR7e 用户手册](https://www.universal-robots.com/manuals/EN/HTML/SW5_25/Content/prod-usr-man/complianceUR7e/H_g5_sections/appendix_g5/tech_spec_data_7e.htm)。`robot.json` 保留这些来源。此整理沿用已有作者与来源信息，未为整个研究项目新增许可证。

原[完整汇报](https://blue-autumn.github.io/ur7e-print-study/results/anchored_search/mounts/index.html)可继续访问。
