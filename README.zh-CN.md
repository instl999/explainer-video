# explainer-video：素材视频 + 文案 → 16:9 讲解成片

<!-- repository-catalog:start -->
**分类：视频创作与剪辑** · [同类仓库](https://github.com/instl999?tab=repositories&q=topic%3Avideo-creation)

一个 Claude Code Skill：把素材视频和文案剪成 16:9 中文财经讲解成片——重写钩子、核实事实、火山方舟配音、动效、自动配乐与音效、质检。

相关项目：[douyin-paper-video-maker](https://github.com/instl999/douyin-paper-video-maker) · [vox-director](https://github.com/instl999/vox-director) · [douyin-daodaoshou-tool](https://github.com/instl999/douyin-daodaoshou-tool)

[English](README.md)
<!-- repository-catalog:end -->

[English](README.md) | 简体中文

给 Claude Code 一段素材视频和文案，说"精剪成横屏 16:9 财经讲解短视频"，剩下的交给这个 Skill：

1. **看素材**：生成切点列表和逐秒缩略图，自动避开带烧录字幕、水印的片段。
2. **围绕钩子重写文案**，把前 20 秒做成强钩子；**逐条核实**数字、研究和引文，核实不了的就加限定或在画面上写明假设。
3. **配音**：火山引擎 豆包语音合成模型2.0（默认 解说小明 2.0），带逐字时间戳；也可退而使用火山方舟 Agent Plan Key。
4. **剪辑和动效**：1920×1080、30fps 的画布引擎。讲道理用纸面手绘图解，素材上加标注、圈画和印章；
   文字逐字跟着配音弹出，转场和镜头运动都对齐到词。
5. **用你自己的素材库配乐**：按文件名前的情绪标签选 BGM，自动算好切入点让重拍落在关键词上；约 66 种音效角色随动作出现。
6. **混音和质检**：人声闪避、限幅、−14 LUFS 响度、人声高于背景的检查、黑帧和定帧检测，再出逐帧缩略图人工复查；
   最后交付 `<标题>_16比9讲解版.mp4`、`.srt`，以及横版 + 竖版封面（`_封面横版.jpg`、`_封面竖版.jpg`）。

配音约 ¥0.1/分钟，并且有缓存，所以预览和重渲染都不花钱。

## 需要什么

- Windows 10/11 上的 [Claude Code](https://claude.com/claude-code)。
- Node.js 24+（直接运行 TypeScript）和 FFmpeg：`winget install OpenJS.NodeJS.LTS`、`winget install Gyan.FFmpeg`。
- **豆包语音合成模型2.0** 的凭证（火山引擎语音控制台：API Key，或 App ID + Access Token）。火山方舟 Agent Plan Key 可作为备选。
- **你自己的** BGM 文件夹（文件名以情绪标签开头，例如 开头紧张、解释、结尾升华）和音效库，仓库里都不包含。
  `engine/src/sfx-roles.ts` 里的通用音效角色指向名为「布斯的音效库」的音效库，换成你自己的库时改一下路径即可
  （`npm run check` 会列出找不到的文件）。

## 安装

```bash
git clone https://github.com/instl999/explainer-video "%USERPROFILE%/.claude/skills/explainer-video"
```

设置都放在 **`%USERPROFILE%\.explainer-video\.env`**。第一次新建项目时，会按 [`.env.example`](.env.example) 自动生成这个文件，
之后填入 Key 即可。项目文件夹里自己的 `.env` 会覆盖它，环境变量再覆盖二者。

| 键 | 必填 | 默认值 | 用途 |
|---|---|---|---|
| `VOLC_TTS_API_KEY` | 是* | — | 豆包语音合成2.0 API Key（新版控制台），作为 `X-Api-Key` 发送；不会打印到日志 |
| `VOLC_TTS_APP_ID` + `VOLC_TTS_ACCESS_TOKEN` | 是* | — | 或填旧版控制台的 App ID + Access Token |
| `ARK_API_KEY` | 否 | — | 备选：以上都没填时，使用 Agent Plan Key（Agent Plan TTS 接口） |
| `BGM_DIR` | 否 | `~/Desktop/bgm` | 配乐库 |
| `SFX_DIR` | 否 | `~/Desktop/布斯的音效库` | 音效库（音效角色的路径相对于它） |
| `OUTPUT_DIR` | 否 | 项目所在文件夹 | 成片复制到哪里 |
| `CACHE_DIR` | 否 | `~/.explainer-video/cache` | 配音缓存（重跑免费） |
| `TTS_SPEAKER` | 否 | `zh_male_jieshuoxiaoming_uranus_bigtts` | 默认音色（解说小明 2.0） |
| `TTS_RESOURCE_ID` | 否 | `seed-tts-2.0` | TTS 2.0 音色的资源 ID |
| `FFMPEG_DIR` | 否 | 自动查找 | `ffmpeg.exe`/`ffprobe.exe` 所在文件夹 |
| `JP_FONT` | 否 | Yu Gothic Bold | 含日文字形的字体 |

\* 两种豆包凭证至少填一种（或使用 `ARK_API_KEY` 备选）。

## 使用

在 Claude Code 里附上视频和文案直接说，例如：*"把这个视频精剪为财经讲解短视频，配音用解说小明2.0，横屏16:9，bgm 和音效从我的文件夹里选"*。
Skill 会自己建项目、走完整个流程。

想手动跑一个项目：

```bash
node "%USERPROFILE%/.claude/skills/explainer-video/scripts/new-project.mjs" "C:/videos/my-video" "C:/footage/source.mp4" --title=标题
cd C:/videos/my-video
npm run check -- --tts   # 检查环境和 Key（会发一次极小的付费请求）
npm run scan             # 素材切点列表 + 缩略图
npm run voice -- --times # 按 script.json 生成配音（付费，有缓存）
npm run render           # 完整渲染（4 路并行）
npm run mix              # 配乐 + 音效 + 人声，合成 out/final.mp4
npm run qa               # 格式、响度、黑帧/定帧、人声高于背景
npm run review           # 成片逐帧缩略图
npm run deliver          # 把 <标题>_16比9讲解版.mp4/.srt 和横竖版封面复制到 OUTPUT_DIR
```

每个视频只需写 `script.json`、`src/clips.ts`、`src/scenes.ts`、`src/timeline.ts` 四个文件，其余是共用引擎。

## 目录

```text
SKILL.md              Claude 执行的说明
.env.example          所有设置项及说明
scripts/              new-project.mjs（建项目）
engine/               复制进每个项目的共用引擎：src/（配音、渲染、混音、字幕、质检、kit、props、sfx-roles…）、
                      tools/（check、scan、sheet、onsets、vob、sfxinfo）、fonts/
template/             每个视频的起始文件
reference/            安装、风格、引擎 API、配乐目录、TTS 要点、踩坑记录
examples/             四个已发布视频的文案、片段表、动效、时间线和配乐选择，附技法索引
```

## 许可

- 代码与文档：[MIT](LICENSE)。
- 附带字体均采用 SIL Open Font License 1.1（许可文本在 `engine/fonts/`）：得意黑 Smiley Sans（atelierAnchor）、
  Noto Sans SC（Adobe/Google）、DSEG7（keshikan）。
- examples 里是作者本人已发布视频的文案；不含任何音乐、音效或视频素材。
