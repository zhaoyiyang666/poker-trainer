# 德扑训练大师 · 纯学习练习工具

> 德州扑克策略学习、概率训练与决策复盘的**纯教学练习工具**。
> 无真钱、无充值、无真人对战、无变现 —— 全程本地离线运行。

一款移动端优先的 PWA（可安装到手机主屏幕），采用 **TRAE IDE 风格**暗色主题。所有筹码均为无现金价值的练习道具。

## 🔗 在线体验 / 安装

**访问地址：** https://zhaoyiyang666.github.io/poker-trainer/

**安装到 iPhone（PWA）：**
1. 用 **Safari** 打开上面的地址
2. 点底部**分享**按钮 → **「添加到主屏幕」**
3. 桌面出现「德扑训练」图标，点开即全屏运行、可离线使用

> iOS 仅 Safari 支持「添加到主屏幕」。Android 用 Chrome 打开后会自动提示安装。

## ✨ 功能

| 模块 | 说明 |
| --- | --- |
| 🃏 **AI 模拟对局** | 6/9 人桌 · 多难度 AI（新手 / 均衡 / 激进 / 紧凶）· 完整下注流程与结算点评 |
| 📊 **胜率计算器** | 蒙特卡洛模拟手牌 + 公共牌胜率、平局率，含底池赔率 |
| 📝 **策略刷题** | 高频决策场景题库 · 逐题解析 · 错题复盘 |
| 📈 **数据统计** | 入池率、加注率、答题正确率等训练数据 |
| 📖 **学习手册** | 牌型规则、位置策略、赔率基础 |
| ⚙️ **设置** | 本地数据管理与偏好设置 |

## 🧠 核心引擎（`src/engine/`）

- `handEvaluator.ts` —— 牌型识别与强弱排名
- `equity.ts` / `equity.worker.ts` —— 蒙特卡洛胜率模拟（Web Worker 并行计算）
- `potOdds.ts` —— 底池赔率
- `preflop.ts` —— 翻前起手牌评估
- `ai.ts` —— 基于规则的 AI 决策引擎（含难度分级）
- `game.ts` —— 对局状态机（下注轮、街推进、摊牌）
- `cards.ts` —— 牌模型与工具函数

所有核心引擎均带单元测试（`*.test.ts`，使用 Vitest）。

## 🛠 技术栈

- **React 18 + TypeScript + Vite**
- **React Router**（HashRouter，兼容子路径部署）
- **PWA**：Web App Manifest + Service Worker（离线缓存）
- **本地存储**：localStorage 持久化对局记录、刷题数据与设置
- **测试**：Vitest

## 🚀 本地开发

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器（默认 http://localhost:5173）
npm run build      # 类型检查 + 生产构建（输出到 dist/）
npm run serve      # 局域网预览构建产物（手机同 Wi-Fi 可访问）
npm test           # 运行单元测试
npm run icons      # 重新生成 PWA 图标（需要 Python + Pillow）
```

## 📦 部署

推送到 `main` 分支即触发 **GitHub Actions** 自动构建并部署到 GitHub Pages（见 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)）：

```bash
git add -A && git commit -m "你的改动说明" && git push
```

约 1 分钟后线上地址即更新。

## ⚖️ 合规声明

本项目是**纯学习练习工具**，专注德州扑克策略学习与决策训练：

- ❌ 无真钱、无充值、无提现
- ❌ 无真人对战、无社交博弈、无任何变现路径
- ✅ 筹码为无现金价值的练习道具
- ✅ 数据全程本地离线存储，不上传

## 📁 目录结构

```
src/
├── engine/       核心算法引擎（牌力、胜率、AI、对局状态机）
├── pages/        各功能页面
├── components/   通用组件（扑克牌、选牌器等）
├── data/         题库等静态数据
├── storage/      本地存储与统计
└── styles/       全局主题样式
public/           PWA manifest、Service Worker、图标
```
