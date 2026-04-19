# LenguaViva — 西班牙语文本分析工具

> **⚠️ 测试版本** — 本项目仍在开发中，分析结果可能存在错误，仅供学习参考。

LenguaViva 是一款面向中文母语者的西班牙语文本分析工具。输入任意西班牙语文本，即可获得词性标注、句子成分解析、从句结构、动词变位、语法注释等多维度分析，帮助理解西班牙语句子结构。

## 功能

- **词性标注** — 彩色高亮显示名词、动词、形容词等词性
- **句子成分分析** — 主语、谓语、宾语、修饰语等角色标注（基于 spaCy 神经网络引擎）
- **从句结构可视化** — 识别关系从句、条件从句、原因从句等，树状展示
- **动词变位分析** — 显示时态、语气、人称，附中文说明
- **构词法分析** — 拆解词缀、词根
- **音节与重音标注** — 标注音节划分和重音位置
- **代词·语序分析** — 分析宾格/与格/反身代词结构，简化 SVO 语序标注
- **CEFR 难度标注** — 词汇和语法结构的 A1–C2 等级标注
- **生词本** — 内置间隔重复复习系统
- **翻译** — 句子翻译及高频词释义
- **语音朗读** — 浏览器原生 TTS 及 Edge 神经网络语音

## 安装与启动

### 前置要求

- Python 3.10+
- 现代浏览器（推荐 Chrome / Edge）

### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/<your-username>/LenguaViva.git
cd LenguaViva

# 2. 创建虚拟环境并安装依赖
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. 下载 spaCy 西班牙语模型
python -m spacy download es_core_news_md

# 4. 启动服务器
python server.py
```

打开浏览器访问 `http://localhost:5001`，即可使用。

> **注意：** 如果 spaCy 后端未启动，工具会自动回退到客户端规则分析（准确度较低），页面上会显示引擎状态提示。

## 技术栈

- **前端** — 纯 HTML/CSS/JavaScript，使用 [es-compromise](https://github.com/nlp-compromise/es-compromise) 进行客户端分词
- **后端** — Python Flask + [spaCy](https://spacy.io/)（`es_core_news_md` 模型）提供依存句法分析
- **翻译** — MyMemory API
- **语音** — Web Speech API + Edge TTS

## 致谢

本项目的前端架构受 [Fudoki](https://github.com/iamcheyan/fudoki)（日语文本分析工具，MIT 许可）启发。西班牙语分析模块、语法引擎、spaCy 后端等核心功能为独立开发。

## 许可

[MIT License](LICENSE)
