# 六轴机械臂最小共享版

先打开[在线样例](https://blue-autumn.github.io/ur7e-print-study/starter/viewer.html)，旋转骨架、播放、拖动进度，或定位起点/中点/终点。每个结果自带机器人、工具、场景和求解器身份，页面加载时会重新核对全部节点的正运动学。

本目录可以独立复制。它包含六轴标准 DH 参数、一个 UR7e 名义模型样例、一个 30 mm 直线路径小计算、结果导入和同一套三维查看器。UR7e 样例采用演示用 100 mm 轴向 TCP。初姿和工具均为演示配置。

## 收到后先运行

安装 Python 3.10 或更新版，使用系统终端。此目录只使用 Python 标准库和浏览器，无需安装 Python 包。

下载[独立 starter.zip](https://blue-autumn.github.io/ur7e-print-study/starter.zip)，解压，进入包含 `run.py` 的目录。也可以从仓库取出 `starter/`。

```sh
python run.py serve
```

打开终端打印的 `http://127.0.0.1:8766/viewer.html`。已有样例包含 41 个节点，可直接播放。若端口被占用，加 `--port 8767`。在终端按 Ctrl+C 停止服务。

## 做一次小计算

```sh
python run.py compute --out my-result.json
```

随后在页面的“导入结果”选择 `my-result.json`。也可以重启为 `python run.py serve --result my-result.json`。

要验证参数有效，可将 `robot.json` 中 J2 的 `a_mm` 从 `-425` 改成 `-450`，修改 `id` 或 `revision`，再次计算并导入。骨架、起点 TCP 和关节解都会随新参数变化。修改 `scene.json` 可改变基座、工具 TCP、初始绝对关节角和直线路径位移。

此计算使用通用六轴标准 DH 的数值位置逆解，逐点沿用前一点关节角。它约束 TCP 的 XYZ，喷嘴朝向自由。样例验证目标位置误差 ≤0.05 mm、关节限位和相邻节点变化 ≤0.1 rad。求解器可能在奇异位形或其他初姿失败；失败会报错并保留原输出。它未做全空间搜索、完整打印姿态求解、碰撞、刚度或实物验证。三维显示为关节运动学骨架。

## 接入另一台机械臂

把本目录和型号资料交给自己的 AI，按 [AGENTS.md](AGENTS.md) 替换机器人描述并先运行这个小任务。内置计算入口支持六个转动关节的串联标准 DH 链，包括关节方向、零位偏置、绝对限位、基座和 TCP 变换。闭链、移动轴、柔性关节或非标准 DH 模型需要适配求解器。

若使用 RoboDK 或自己的求解器，输出 `example.json` 同样的 `six-r-result-v1` 结构，然后执行一次检查/导入。

```sh
python run.py import other-result.json --out imported.json
```

页面直接选择 `imported.json` 即可查看。带关节角和 TCP 目标的结果会重新核对模型身份、正运动学和状态字段。原始 UR7e 结果只属于随附的 UR7e 输入，新型号应重新计算。

## 来源

本目录整理自 Blue-Autumn 的 UR7e 打印实验项目。原项目的解析逆解、快速面积公式、实测/仿真记录和外壳模型保留在各自来源中。本目录的通用 DH 正运动学沿用 `lab/ur7e_kinematics.py` 的标准 DH 约定，并提供独立的小型数值求解与查看器。

UR7e 名义尺寸来源于 [Universal Robots DH 参数表](https://www.universal-robots.com/articles/ur/application-installation/dh-parameters-for-calculations-of-kinematics-and-dynamics/)，关节范围来源于 [UR7e 用户手册](https://www.universal-robots.com/manuals/EN/HTML/SW5_25/Content/prod-usr-man/complianceUR7e/H_g5_sections/appendix_g5/tech_spec_data_7e.htm)。`robot.json` 保留这些来源。此整理沿用已有作者与来源信息，未为整个研究项目新增许可证。

原[完整汇报](https://blue-autumn.github.io/ur7e-print-study/results/anchored_search/mounts/index.html)可继续访问。
