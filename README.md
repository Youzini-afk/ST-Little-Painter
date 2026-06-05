# ST-Little Painter

简体中文 | [English](./README_EN.md)

SillyTavern 扩展 —— 自动从聊天上下文生成 Stable Diffusion 配图提示词，并调用图像后端出图。

> 不污染主聊天模型的角色扮演/故事输出。通过独立的 tagger LLM 管线提取标签 → 编译提示词 → 调用图像后端 → 将结果插入聊天。

---

## 功能

- **自动/手动配图**：聊天事件后自动触发，或从输入栏魔棒菜单手动打开控制台生成
- **7 屏控制台**：Dashboard、Tag API、Compiler、Backends、Knowledge、Regex、Debug
- **4 种图像后端**：SD WebUI / Forge、NovelAI、ComfyUI、Natural Image（OpenAI 兼容）
- **独立标签管线**：上下文收集 → 世界书注入 → 场景规划器 → tagger LLM → 后处理 → 标签预算 → 正则清理
- **知识运行时**：技能选择器、标签词典、提示词 packs、标签冲突处理、别名规范化
- **BME 兼容**：vendor 了 ST-BME 运行时，世界书解析、MVU 清理、正则阶段
- **Hires Fix / ADetailer**：SD WebUI 原生支持
- **移动端控制台**：console overlay 全屏，<=768px 自适应，<=430px 精调
- **中英界面**：默认跟随酒馆语言，可在设置中切中文 / English

---

## 管线流程

```
聊天上下文
  → 上下文收集（聊天记录 / 角色卡 / 元数据）
  → MVU / 思考块清理
  → 世界书解析与注入
  → 场景规划器（smart / expert 模式）
  → 技能选择 + 词典提示
  → tagger LLM 请求（独立 API）
  → JSON 提取与校验
  → 后处理（合并 / 规范化 / 替换 / 冲突 / 预算）
  → 正则最终清理
  → 编译最终提示词
  → 调用图像后端
  → 插入图像到聊天
```

---

## 支持的图像后端

| 后端 | 默认地址 | 关键参数 |
|------|---------|---------|
| **SD WebUI / Forge** | `http://127.0.0.1:7860` | txt2img，模型/VAE/采样器/调度器/放大算法/LoRA 列表拉取，Hires Fix，ADetailer，Basic Auth |
| **NovelAI** | `https://image.novelai.net` | NAI Diffusion 3，ucPreset，qualityToggle，SM / SM Dyn，Dynamic Thresholding |
| **ComfyUI** | `http://127.0.0.1:8188` | Workflow JSON + 占位符替换，轮询完成，可配置间隔和最大轮询次数 |
| **Natural Image** | `https://api.openai.com/v1` | OpenAI 兼容：`/images/generations` 或 `/chat/completions`，指令前后缀，size/quality |

---

## 安装

1. 将整个文件夹放入 SillyTavern 的扩展目录：

   ```
   data/<user>/extensions/ST-Little_Painter/
   ```

   或

   ```
   SillyTavern/public/scripts/extensions/third-party/ST-Little_Painter/
   ```

2. 重启酒馆或刷新页面
3. 在扩展设置中启用 ST-Little Painter
4. 配置 Tag API 端点（用于标签生成）
5. 配置图像后端（SD WebUI / NovelAI / ComfyUI / Natural Image）
6. 从输入栏右下角魔棒菜单（三条杠）点击 **Little Painter** 打开控制台

---

## 控制台 7 屏

| 页面 | 功能 |
|------|------|
| **Dashboard** | 管线就绪状态、编译预览、插入目标选择、最近生成缩略图、快捷入口 |
| **Tag API** | 第二 API 端点配置，响应契约预览，诊断步进器 |
| **Compiler** | 模式切换（fast/smart/expert），提示词 profile，固定正/负提示词，CompiledPrompt 预览 |
| **Backends** | 后端配置，SD 资源刷新（模型/VAE/采样器等），各后端 payload 预览 |
| **Knowledge** | 世界书解析状态，词典/技能检索预览，技能选择器 |
| **Regex** | 内置清理规则，自定义规则，实时清理测试 |
| **Debug** | 管线时间线 trace，最新 trace 摘要，插入诊断 |

---

## 测试

```bash
# UI 基础测试
npm run test:ui-foundation

# 知识管线端到端
npm run test:prompt-knowledge

# 后端适配器契约
node tools/test-backend-adapters.mjs

# JSON fallback
node tools/test-call-json-fallback.mjs

# 默认正则规则
node tools/test-default-regex.mjs

# 插入计划
node tools/test-insertion-plan.mjs

# 世界书代理
node tools/test-worldbook-delegate.mjs
```

---

## 项目结构

```
src/
├── backend/          # 图像后端适配器（SD / NAI / ComfyUI / Natural）
├── context/          # 上下文收集、清理、MVU 剥离
├── core/             # 常量与 DOM 选择器
├── debug/            # 管线 trace 日志（含敏感键脱敏）
├── dictionary/       # 标签词典、规范化、冲突、负面 packs
├── host/             # 设置存储与 profile 管理
├── image/            # 生成记录、插入计划、聊天渲染
├── llm/              # Tag API 调用与 JSON 提取
├── pipeline/         # 主生成管线编排入口
├── planner/          # 场景规划器提示词与 schema
├── postprocess/      # 合并、规范化、替换、预算、正则
├── promptProfiles/   # 各后端编译 profile
├── reference/        # 参考素材编译
├── regex/            # 默认/用户正则规则
├── skills/           # 技能注册与选择
├── tagger/           # Tagger 提示词构建、CompiledPrompt schema
├── ui/               # Console shell、i18n、字段绑定
├── vendor/st-bme/    # Vendor 的 ST-BME 运行时
└── worldbook/        # 世界书解析器适配器与代理
```

---

## 许可

与 SillyTavern 一致。

---

## 贡献

欢迎提交 Issue 和 PR。

---

*ST-Little Painter v0.1.0*
