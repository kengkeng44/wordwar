# 拾光 (Pickup) — Project Context for Claude

> **Brand: 拾光 (Pickup)** — 原名 WordWar，v0.9 完成 rebrand。資料夾仍保留 `Desktop\wordwar` 路徑（避免打斷工作目錄）。
> 這份文件是給「下次來接手拾光的 Claude session」看的 onboarding。讀完應該能無縫繼續開發、做出符合作者意圖的決定。

---

## 📑 Table of Contents

1. [Vision & 情感核心](#-vision--情感核心)
2. [Version History](#-version-history)
3. [主打故事：小貓回家路（8 章 + false-ending）](#-主打故事小貓回家路-8-章--false-ending)
4. [Core Mechanics](#-core-mechanics)
5. [Visual Language](#-visual-language)
6. [Audio](#-audio)
7. [Tech Stack & Architecture](#-tech-stack--architecture)
8. [Code Structure](#-code-structure)
9. [Development Convention](#-development-convention)
10. [Decision Log](#-decision-log重要設計取捨)
11. [Open Questions](#-open-questionsv013--v014-待決定)
12. [Roadmap](#-roadmap)
13. [Don't Do（踩過的雷）](#-dont-do踩過的雷)
14. [Working Style With User](#-working-style-with-user作者-鄭成功-偏好)
15. [External Links](#-external-links)
16. [Onboarding Checklist](#-onboarding-checklist新-claude-session-接手時)

---

## 🎯 Vision & 情感核心

**拾光 (Pickup) = 給上班族的「下班逃逸」式英文養成遊戲。**

- **Tagline**：「學英文，撿回時間」(v0.9 改自原 「學英文，贏對戰」)
- **目標客群**：台灣中文母語、A2-B1 程度、想學英文但下班已經夠累的上班族
- **核心情緒**：「下班逃逸」 — 不是「下班再體驗一次上班」。所以**避開**留學夢 / 跨國辦公 / 創業 simulator 那種真實人生劇本，**走向**動物、玄幻、治癒系故事
- **美學定位**：Studio Ghibli 暖色手繪風（不是日系扁平、不是像素藝術、不是 Material Design）
- **學習機制**：cloze（填空）為核心，4 選 1，搭配科學間隔複習（SRS lite）+ 難度系統 (easy/medium/hard)

---

## 📅 Version History

| 版本 | 重點交付 |
|-----|---------|
| v0.8-0.13 | 5→8 章 + Ghibli 美學 + 難度 + 極簡 splash(歸檔,不再展開) |
| v1.0-v1.7.5 | rebrand → Pickup, isometric chibi 風格主角(grandma + shiba), 4-tab BottomNav(Home/Tasks/Profile/Alerts), 進站轉場 PawDoro-style cat + zoom in/out + 中心 cream disc, code-split Phaser, vite WebP 轉檔 |
| **v1.7.6-v1.9.7(2026-05-27 autonomous loop)** | **整段 Duolingo parity 改造** |
| v1.7.6 | 全 6 POV scene PNG(rembg)|
| v1.7.10 | code-split Phaser + banner shadow 同色系 |
| v1.7.11 | Listening TTS + node activity sheet + XP/Level + press feedback |
| v1.7.13 | iOS TTS unlock warmup + listening UI replace sentence with 🔊 |
| v1.7.15 | grandma+shiba duo on map + listening reveal full sentence |
| v1.8.0 | TOEIC 風 Ch1 重寫(4 題型 + 1st-person POV) + warm banner peach |
| v1.8.3 | tap-tiles + tap-pairs UI(Duolingo 經典題型) |
| v1.8.6 | CHECK 答錯 auto-reset + Story per-sentence narration with 🔊 |
| v1.8.7 | 砍 PlayScene 底部 nav(immersive)+ char back to beside-current-node |
| v1.8.8 | smaller story 🔊 SVG icon + map character idle bob loop |
| v1.8.9 | Type What You Hear(text input)— 第 5 題型 |
| v1.9.0 | Dashed-underline 點詞翻譯 via WordHint(章節介紹頁)|
| v1.9.1 | Map top HUD bar(Chapters/XP/Level icons + values)|
| v1.9.2 | Duolingo X close button(lesson 頂左,有 confirm)|
| v1.9.3 | npcGrandma 換 isometric PNG(替代舊 Suntera SVG)|
| v1.9.4 | Persistent daily streak(localStorage)+ HUD 加 🔥 |
| v1.9.5 | Profile streak 用 persistent + Begin CTA 文字依模式 |
| v1.9.6 | Tasks tab 加 Daily Streak hero card |
| v1.9.7 | Achievements 8 badges in Alerts tab(streak/XP/chapter milestones)|
| v1.9.8 | CLAUDE.md autonomous-loop sync |
| v1.9.9 | Confetti burst on chapter complete |
| v1.9.10 | Listen / Replay speaker buttons subtle pulse(tap-me cue)|
| v1.9.11 | Key Sentences overlay(paw icon → bubbles with audio + dashed underline + ZH)|
| v1.9.12 | Global click SFX(sfxCardPress on any button tap)|
| v1.9.13 | Agent-audited WordHint dictionary coverage(填 7 個 Ch1 漏字)|
| v1.9.14 | CLAUDE.md sync |
| v1.9.15 | Duolingo HUD(Flag/Crown tier/Gem/Energy SVG)+ nav 去字 |
| v1.9.16 | HUD crown 依 difficulty 不是 level + 獨立金幣計數器 |
| v1.9.17 | 12 user-generated icon PNGs 整合(HUD/Nav/Map nodes) |
| v1.9.18-19 | 角色位置 v3 / v4 iteration |
| v1.9.20 | 角色位置 v5 — 候選 Y scoring 避開節點密集區 |
| v1.9.21-22 | 節點 icon 多樣化 + filter 調校 |
| v1.9.23 | Profile Stats 加 Coins 卡 |
| v1.9.24 | Map char vertical-Y scoring + node icon 多樣化 + lock SVG padlock |
| **v1.9.25 (audit pass 1)** | **Crown 解耦 difficulty 改 level-mapped(audit #3)+ Lesson HUD 砍 streak/timer(audit #1+#4)+ 抽 SpeakerButton 共用組件(audit #5)** |
| v1.9.26 (audit #2) | HUD streak icon 從閃電 webp 改成內嵌火焰 SVG;色票對齊火橙 #ff7a3a;routing 改 → tasks tab |
| v1.9.27 (audit #6) | tap-tiles + type-what-you-hear 答錯流程改 blind-retry parity:flash 後保留 user 輸入/排列,只解鎖 CHECK,不再從零開始 |
| v1.9.28 (audit #7 pass 1) | 新檔 src/ui/tokens.ts 集中 COLOR_*;ClozeUI / EndOverlay / ModeMenu 改 import,3 套同值常數歸 1。TapInputUI/GameHUD 暖色系另一組未動 |
| v1.9.29 (audit #8) | domUtil.ts 加 attachPressFeedback(el, opts) helper;7 個 callsite(SpeakerButton/StoryMapView/EndOverlay/ModeMenu×2/ChapterEnd/ChapterIntro)從複製貼上變一行;ClozeUI 有 lock gate 跳過 |
| v1.9.30 (audit #9) | 11 個 raw PNG(~6.5MB)從 public/mascots/ 移到 tools/raw-mascots/,不再上 CDN |
| v1.9.31 (audit #11) | BottomNav 4 icon 下加 10px label;HUD button 加 aria-label 含 value(Crown level 2 / Streak 5 days etc),screen reader 可讀 |
| v1.9.32 (audit #10 部分) | index.html reduce-motion `svg.tear-cat` → `img.tear-cat` 修死 selector;mascots.ts 經 audit 並非死碼(5 處使用),保留 |
| **v1.9.33 (audit #12 → 12/12 完工)** | StoryMapView node static styles 抽 `.pickup-map-node` CSS class;每 node inline style 18→6,8 node mount 省 96 次 DOM write |
| v1.9.34 (audit-2 F1+F2) | TapInputUI tap-tiles + type-what-you-hear 兩處 72px emoji 🔊 換 SpeakerButton lg primary pulse;PlayScene listen pill 把 emoji 換 SVG;Lesson HUD 加 chapter chip "qN/total" 錨 story mode 左邊 |
| v1.9.35 (audit-2 F5+F6) | GameHUD streak 從 ×N 改 🔥N(去 close-button × 衝突);xp=0 首訪 user HUD coin/streak 不顯示「0」,改加 "🐾 Tap any node to begin" dashed amber 微文案 banner |
| v1.9.36 (audit-2 F4) | tokens.ts 從 Duo bright 全面換 Ghibli warm:green #58cc02→olive #7d9a4f,red #ff4b4b→terracotta #c84a3a。ClozeUI / EndOverlay / ModeMenu 透過 import 同步,整個 app 答對 / 答錯色終於統一 |
| v1.9.37 (audit-2 F3) | Crown HUD slot 下加 4px mini progress bar 顯示 levelProgress(xp).fraction;aria-label 含進度百分比;L1 user 看見 XP 累積朝下一階段 |
| v1.9.38 (audit-2 F10) | PRAISE 池全面雙語化(中文 · English 格式);TTS rate 從 0.92 → 0.85,A2 Taiwanese learners 聽得清 |
| v1.9.39 (audit-2 F9) | deriveCurrentNodeIdx Ch1 完成時改回傳 -1(原本回 5)— pulse class 不再貼錯在 completed node 上 |
| **v1.9.40 (audit-2 F8 → 10/10 收工)** | Mascot.ts 加 setMascotImage(src) 方法;PlayScene story mode 改用 calico-anchor.webp 代替 SVG mascot,map 上看到的三花貓也出現在 lesson screen,brand 連結成立 |
| **v1.9.41 (Duo-flat icon batch 1+2+3 = 12 icons)** | 用戶生 3 張 1024×1024 grid PNG,Python 切+rembg+WebP 出 12 個無線 flat-shape icon。Code swap:SpeakerButton SVG→PNG;StoryMapView welcome 🐾 / HUD streak / locked node / Key Sentences banner;GameHUD streak label;StoryModeScene Daily Streak hero。flag-en/crown-gold/coin-gold/node-paw/node-headphones/node-book 覆寫成 flat 版 |
| v1.9.42 (achievements PNG 接入) | Achievement interface 加 iconSrc?;6/8 badge 接 PNG(paw/flame/lightning/icon-star/node-star/trophy);剩 ☂️/🎯 沒對應 PNG 留 emoji。Alerts tab 八格從 emoji 排版升 flat-icon 排版 |
| **v1.9.43 (Duo flat-light pass)** | 砍違反 Duo 風的「光」:GameHUD progress fill inset glossy / timer pill inset darken / StoryModeScene 2 卡 linear-gradient 全拆;加 Duo 招牌「flat top highlight 帶」(StoryMapView banner + StoryModeScene daily card + XP hero card);新 helper lighten();Chapter Intro/End/StoryEnding CTA box-shadow 從 v1.9.36 殘留 bright green leak 改 olive |
| **v1.9.44 (色塊打光 ≠ 光暈,全清 blur halo)** | 用戶澄清「不要光暈,要色塊打光」。砍所有 blur box-shadow + drop-shadow halo(14 TS callsite + 5 CSS 動畫)。Pulse 從 box-shadow 0→10px 環擴 → 改 transform scale 1→1.03 / 1.05 / 1.04。Map node 平壓 3D depth(remove cast shadow blur);grandma+shiba mascot 移除 drop-shadow;BottomNav blur top halo 改 solid 3px border-top |
| v1.9.45 (mascot solid ellipse floor) | v1.9.44 後 mascot 脫地補回 solid 橢圓地影色塊(zero blur,rgba(60,42,28,0.28-0.30)):StoryMapView grandma+shiba 雙橢圓;Mascot.ts setMascotImage 加 wrapper ellipse 給 calico-anchor lesson 內也接地 |
| **v1.9.46 (audit-3 critical 3 + 動畫加強)** | #1 EndOverlay radial-gradient bg → flat cream + yellow textShadow blur halo 砍;#2 map node radial-gradient gloss → composite inset top stripe + 3D depth(對齊 banner);#3 GameHUD streak ≥5 dynamic drop-shadow halo 砍;#6 pickup-pulse scale 1.03 → 1.05 補回 halo 拿掉後的注意力 |
| **v1.9.47 (audit-3 收尾 8/8)** | #4 3D depth 3-tier scale lock(card 4 / hero 6 / interactive 10 + 3 press);#5 白卡片 4 處(Free Practice / scenario / stat / achievement)補 amber top stripe `inset 0 4px 0 rgba(231,164,74,0.15-0.18)`;#7 BottomNav active tab 加 3px amber `borderTop` 色塊指示條 + `translateY(-2px)` 浮起,inactive = transparent;#8 POV scene linear-gradient carve-out 註解豁免 |
| v1.9.48 (audit-4 #3+#4+#5 安全 ship) | #3 kt-ch1-06 sentence 從 meta "Match the Ch1 words..." → flow "These are the words I will remember.";#4 boot 偵測 localStorage 寫入失敗 → 紅 banner 提醒 "進度無法儲存 — 請關閉私密瀏覽";#5 iOS TTS race fallback:auto-speak 後 1s 檢測,如未起動則 reveal sentence + "🔇 Audio unavailable" 微文案。#1 Ch1 擴充 + #2 sessionStorage resume 因 AFK 風險過大延後 |
| v1.9.49 (audit-5 全 8 AFK-safe polish) | F1 砍 orphaned energy-bolt.webp;F2-F4 Ch1 explanationZh 從 jargon → story voice(去 "Comprehension 題" / "干擾 tile" / UX 細節 leak);F5 welcome banner 雙語 "從第一顆節點開始 · Tap to begin";F6 PRAISE_TIMEOUT 拿掉「green button」字眼(palette olive 後不準了 + 也回避 blindRetry 違反);F7 Ch1-q1 sentence 兩句合一 "I wake up and the rain is falling hard."(TTS intonation 順);F8 explanationZh 標點正規化 |
| **v1.9.50 (Ch1 grandma-v4 上線)** | 市場 pivot:adult Ghibli → 兒童童話。Ch1 重寫成「奶奶睡前故事」框架(糰糰=三花貓敘事者,花花=柴犬,奶奶因女兒住遠每晚對牠們說故事)。Ch1 從 6 題擴成 8 題(3 prologue 設定世界 + 3 奶奶說的雨夜故事 + 1 Goodnight + 1 tap-pairs review)。Schema max(6)→max(8),`STORY_QUESTIONS_PER_CHAPTER` 6→8,`NODE_PATH` 8→10 位置(8 Ch1 + 2 Ch2 lock),`CH1_BEAT_LABELS` 重寫 |
| v1.9.51 (Ch1 narration + title 同步 grandma-v4) | 漏改的 ChapterIntroScene narration + outro 更新成 cat POV / 糰糰+花花;titleZh 「流落街頭」→「我們的第一天」;titleEn 「A Rainy Night」→「The First Story」。**deploy lesson**:wrangler 不加 `--branch=main` 才上 production root,加 flag = 卡 Preview |
| v1.9.24 | Locked nodes SVG padlock 取代 🔒 emoji |

**當前版本：v1.9.24。** 整個 autonomous loop 期間 user 在睡覺,我照 Duolingo 對比清單一輪一輪補完。
**下個目標**:剩餘 polish + Ch2-8 內容回補(目前只有 Ch1)。

## 📋 待辦(user 2026-05-27 確認)

- **Drag-and-drop tap-tiles**(complexity 評估 ~3-4 hr,iOS Safari 多坑)— **暫緩**,等用戶主動 unblock
- **Listen + Image / Sentence Shuffle 新題型** — 需圖庫
- **角色站位規則 v4**(2026-05-27 確定):mean dx 偏右 → 角色貼 container 左 28px margin,垂直在節點群中段
- 更多 user-generated icons(目前 12 個已整合)

---

## 🐈‍⬛ 主角設定：三花貓的性格（v1.7.0）

> **一句話**：**愛哭鬼,但很堅韌。**

- 看到雨會哭、看到大影子會哭、被拒絕會哭 — 情緒外顯不掩飾
- 但每次哭完都會擦掉眼淚繼續走 — 韌性是她的底色
- 這個雙面情緒**故意**設計來反映目標客群（下班疲憊上班族）— 「我也累、我也想哭,但我還是要再試一次」
- 視覺化:**v1.7.0 進站轉場**就是這個性格的縮影 — 橘底貓臉 + 一滴眼淚滑落 + 化作奶油色擴張蓋滿螢幕

### 落地到產品的位置

| 位置 | 怎麼體現 |
|------|---------|
| 進站轉場(v1.7.0) | Suntera 風橘底貓臉,藍淚滴落 → 擴張為奶油色 reveal 主畫面 |
| 答錯 microcopy | "Cry later · try again" / "Sniffle, then keep going" 等帶情緒的鼓勵語 |
| 答對 microcopy | "Brave!" / "Tears off, paws on!" — 認可堅韌那一面 |
| Ch1 雨夜場景 | POV 第一視角的雨、寒、孤獨,情緒鋪墊 |
| Ch6 寒冬考驗 | 「我是 someone」覺醒,韌性集大成 |

**不要**走那種「主角永遠勇敢、永遠樂觀」的美式英雄套路 — 那不是這隻貓,也不是這個 app 的客群。

---

## 🐈 主打故事：小貓回家路 (8 章 + false-ending)

**8 章成長弧全部已實作 (v0.10)。** Ch5 從「永遠的家」改成 false-ending — 小貓以為到家了，結果窗沒鎖被吹開，又流落街頭。Ch6-8 是真正的成長弧。

| 章 | 標題 | 成長級 | 姿態 / 情緒 | 故事 turning point |
|---|------|--------|------------|-------------------|
| Ch1 | 🌧️ 雨夜的開始 | 0 — 純粹脆弱 | 縮成一團、半閉眼、耳朵下垂 | 被動接受陌生人善意 |
| Ch2 | 🛕 街頭智者 | 1 — 開始學習 | 坐姿端正、大眼觀察 | 從被動 → 主動找導師（老黑死後獨自背負所學） |
| Ch3 | 🥐 麵包店的選擇 | 2 — 第一次說「不」 | 站立、抬頭、尾巴翹起 | 第一次主動拒絕安全選項 |
| Ch4 | 👧 小女孩的秘密 | 3 — 學會愛 + 學會放手 | 柔軟、會主動 purr | 第一次心碎、撐過 |
| Ch5 | 🏠 永遠的家（**FALSE ending**） | 4 — 假抵達 | 看似溫暖、暗藏脆弱 | **未鎖的窗 → 又流落街頭** — 戲劇 reset |
| Ch6 | ❄️ 寒冬考驗 | 5 — 存在的選擇 | 雪中前行、眼神堅毅 | 老黑 ghost mentor 重現，儀式性「成年式」；身份覺醒「**我是 someone**」 |
| Ch7 | ⛩️ 神社的相遇 | 6 — 命運的承接 | 沉穩、有靈氣、有故事的眼神 | 神社靈出場；意識到「**沒有人是偶然**」— 命運網絡 |
| Ch8 | 🐾 選擇了家人 | 7 — 抵達 / 圓滿 | 從容自信、像中年貓 | 美美找到她；但她**選了街頭家人**（布魯托）。Outro：「她有過家。她現在，選了家人。」+ "I→We" cloze pivot |

**Ch8 結局基調**：從「回家」改成「**留街頭**」— per user feedback「夠戲劇 + 勵志」。

---

## 🧠 Core Mechanics

### 1. Cloze 答題（核心）
- 一個英文句子有空格 → 4 選 1
- 答錯：blindRetry flow — **只標紅錯誤鈕，不揭露正確答案**，玩家自己試到對為止（v0.13 強化）
- 答錯選項：保留原位（訓練位置記憶），不 shuffle
- 答對：簡短解答 + 自動推進 2-4 秒（也可按 Continue 加速）

### 2. SRS Lite（簡化間隔重複）
- 答錯的題進 localStorage 復習庫
- **下一章開頭前 3 題會復習你之前答錯的**
- 目前是「答對一次就移出」，**不是** 完整 SM-2（open question — 要不要升級成真 SRS）

### 3. 難度系統 (v0.12)
- 178 cloze 全標 `difficulty: easy | medium | hard`
- UI：BootScene splash 上的**折疊難度 pill**（v0.13 縮到啟動畫面）
- 持久化：`localStorage.pickup.difficulty`
- 出題：依當前 difficulty filter 池

### 4. 故事模式 vs 自由練習
- **故事模式**：force-correct + blindRetry、無 HP、不能死、跟著章節推進
- **自由練習**：130 題大池（80 cloze + 50 scenario 題），有 HP，傳統 cloze 體驗
- 還有 5 個情境模式（餐廳 / 機場 / 醫院 / 辦公室 / 飯店），每個 10 題

### 5. DEV_UNLOCK_ALL flag
- `src/data/storyKitten.ts` 內常數，true 時所有章節解鎖（dev 用）
- **production ship 前要切回 `false`**

---

## 🎨 Visual Language

### Semantic Color Tokens (v0.11 Duolingo-tier overhaul)

```css
--pickup-success    /* 答對綠 */
--pickup-error      /* 答錯紅 */
--pickup-streak     /* 連勝橘 */
--pickup-xp         /* 經驗藍 */
--pickup-info       /* 通用資訊 */
--pickup-bg         /* 奶油 #fef8ed */
--pickup-accent     /* 琥珀 #e7a44a */
--pickup-text       /* warm dark */
```

❌ **避免**：v0.4 亮綠 `#58cc02` 已淘汰。

### Typography Tokens

```css
--font-display    /* 標題 */
--font-body       /* 內文 */
--font-button     /* CTA */
--font-stat       /* 數字 */
--font-microcopy  /* 微文案 */
```

### Animations (v0.11)
- `pickup-bounce` / `pickup-pulse` / `pickup-wobble` / `pickup-fade-up`
- `pickup-streak-pop` / `pickup-confetti-burst` / `pickup-glow`
- 250ms breathing pace
- **`prefers-reduced-motion` respected**

### Microcopy (中文，6-variant rotation)
- **答對**：太棒了！／厲害！／你抓到了！／一發入魂！／答對啦！／就是這個！
- **答錯**：再試試／差一點（blindRetry：不再揭露正確答案）
- **Continue**：「繼續 →」（含箭頭）
- **完成**：「完成一輪！」+ italic sub-tagline

### Mascot 美術 (v1.7.6 視覺方向重定)

**現行決策(2026-05-26):所有出場角色統一 isometric Duolingo chibi 風**(類 Lin / Junior / Lily)。

- **角色 art**(貓 / NPC / 人物)= **isometric chibi**,大頭小身、純色塊無黑邊、坐在白色 tile 平台上、軟陰影
- **POV 場景背景**(Ch1 q1-q6)= 保留 painterly Ghibli(painterly + atmospheric,因貓不在場景中)
- **小裝飾 / icons** = 可混用其他 style

**生圖管道**:
- 用戶手動 ChatGPT / Gemini(DALL-E 3 / GPT-4o / Imagen 對 Duolingo style 比 SDXL 準)
- Prompt doc:`Desktop\wordwar\Pickup-isometric-character-prompts.md`(anchor + 7 NPC + refine 指令)
- ❌ **SDXL via Stable Horde 對這個風格無效**(會生成 3D render / Sanrio 公仔,不是扁平向量)— POC `public/mascots/iso-calico-poc.png` 留作反例對比

**取代清單(等用戶交 PNG 後)**:
- 進站 tear-intro SVG 貓臉 → 新 isometric PNG
- 地圖 sitting cat SVG → 新 isometric PNG
- Loader 旋轉貓頭 SVG → 新 isometric PNG  
- 舊 `public/mascots/calico-anchor.png`(Suntera sticker)→ 廢棄

### 歷史 mascot 美術(歸檔)
- v0.8.3-0.8.4 RUMBO sticker 風(粗黑邊 + 平塗 + radial halo + drop shadow + 16 mascots)— 已淘汰
- v1.4 sticker 三花貓(user-generated via ChatGPT + rembg 去背)— v1.7.6 後也淘汰
- 動畫：CSS keyframe（不在 Phaser canvas 內）— idle bounce / 答對開心彈跳 / 答錯難過搖頭

### Layout
- **直立手機 app 風**（400×800 portrait）
- v0.13 splash：單 mascot + 拾光 title + 開始 CTA + 折疊難度 + 字置中
- 從上到下：Header（streak + progress + HP）→ Scenario chip → Mascot → Sentence card → 4 個垂直按鈕 → 反饋面板
- 用 `100dvh` + `safe-area-inset`（iPhone notch / home bar 正確留白）
- 短螢幕自動 scroll，Mascot 響應式縮小

---

## 🎵 Audio

### BGM (v0.13)
- **曲目**：Peace! by ryoish (Pixabay)
- **規格**：3:50 piano loop，`public/audio/peace.mp3`
- **實作**：`src/audio/bgm.ts` 從程序合成改寫為 mp3 streaming（150 行 → 63 行）
- **機制**：AudioBufferSourceNode loop、cached、race-safe stop
- 檔案 7.36 MB 在 `public/`（**不進 bundle**），CF Pages CDN 直送

### SFX
- 答對 / 答錯音效：4 諧波鐘聲 / 正弦下行（仍程序合成）

---

## 🛠️ Tech Stack & Architecture

| 層 | 選擇 | 理由 |
|----|------|------|
| 遊戲引擎 | Phaser 3.90 | 內建 Arcade 物理 / 場景管理；但**只當狀態機用**，不負責畫面 |
| 語言 / 打包 | TypeScript + Vite | strict mode、tsc + vite build |
| 狀態管理 | Zustand 4.5 | 比 Redux 輕，比 Context 結構化 |
| 資料驗證 | Zod 3.25 | scenarios / vocab JSON 進來都過 schema |
| 部署 | Cloudflare Pages（Wrangler 4.94） | `pickupwords.pages.dev` |
| Repo | `github.com/kengkeng44/pickup`（public） | portfolio 可見；舊 `wordwar` 自動 redirect 1 年 |

### ⚠️ Phaser 重大架構決策（v0.6）

**所有畫面渲染搬到 DOM，Phaser canvas 設 `display:none`。**

理由：
1. **題目模糊**（v0.4 之前）：Phaser canvas 是 bitmap，手機 DPR 2-3x 放大會糊。DOM 用瀏覽器原生抗鋸齒，絕對清晰
2. **layout overlap**（v0.5）：Phaser canvas + DOM 混用會 absolute position 打架。改成純 DOM flex column 就一勞永逸
3. **觸控穩定性**（v0.2）：Phaser tap event 在某些手機 browser 失靈，DOM `button` 元素絕對穩

Phaser 現在只負責：背景色 / 螢幕閃 / 鏡頭抖（CSS keyframe 也能做這些，未來可能完全移除 Phaser）。

---

## 📂 Code Structure

```
src/
├── scenes/                  # Phaser scenes (state machine layer)
│   ├── BootScene.ts        # 啟動 splash + 難度 pill 折疊（v0.13 極簡化）
│   ├── MenuScene.ts        # 主選單（自由 / 情境 / 故事）
│   ├── PlayScene.ts        # 主答題場景
│   ├── StoryModeScene.ts   # 小貓回家路章節網格（8 章）
│   ├── ChapterIntroScene.ts # 每章 NPC 場景卡 + 旁白
│   ├── ChapterEndScene.ts  # 每章結束狀態變化
│   ├── StoryEndingScene.ts # Ch8 cinematic（選了家人 outro）
│   └── EndScene.ts         # 自由 / 情境模式結束（Duolingo 風完成頁）
├── store/
│   └── runStore.ts         # Zustand：分數 / HP / 章節進度 / SRS 庫 / 難度
├── ui/                      # DOM rendering layer
│   ├── ClozeUI.ts          # 4 選 1 + 反饋面板 + blindRetry flow
│   ├── GameHUD.ts          # Header：streak + progress + HP + timer
│   ├── Mascot.ts           # 動畫 wrapper
│   ├── mascots.ts          # SVG inline 定義（mascot 重做中）
│   ├── ModeMenu.ts         # 自由 / 情境 / 故事 模式切換
│   ├── EndOverlay.ts       # Duolingo 風完成 overlay
│   ├── Confetti.ts         # 破紀錄彩帶
│   └── domUtil.ts          # 共用 DOM helpers
├── data/
│   ├── vocab.ts            # 基礎詞彙
│   ├── sentences.ts        # 80 cloze A2 題目
│   ├── scenarios.ts        # 5 情境 × 10 題 = 50 情境題
│   ├── storyKitten.ts      # 小貓回家路 48 題（Ch1-8）+ DEV_UNLOCK_ALL flag
│   └── roundGenerator.ts   # 出題邏輯：池洗牌、SRS 注入、難度 filter
├── audio/
│   └── bgm.ts              # mp3 streaming（v0.13 從程序合成改寫，63 行）
└── assets/                  # 共用 assets

public/
├── audio/
│   └── peace.mp3           # BGM, 7.36 MB, CDN-served not bundled
└── vocab.json              # 玩家可見的字庫（user-editable）

tools/                       # 開發用 scripts
```

---

## 🚀 Development Convention

### Commit message 格式
```
vX.Y[.Z]: short description
```
範例：
- `v0.13: minimalist splash + blindRetry + BGM mp3 streaming`
- `v0.11: Duolingo-tier UI overhaul — semantic tokens + 7 animations + 6-variant microcopy`

語氣：**列重點不寫散文**，用 `+`、`—`、`fix` 分段。

### Deploy flow
每次改動完跑這 3 個：
```bash
git add . && git commit -m "vX.Y: ..."
git push origin master                          # 推 GitHub (pickup repo)
npx wrangler pages deploy dist \
  --project-name=pickupwords --branch=master \
  --commit-message="vX.Y deploy"                # ASCII commit msg override
```

⚠️ **build 要先過**：`npm run build`（tsc + vite build）。如果 tsc 失敗，**不要 deploy**。

⚠️ **Cloudflare project name**：`pickupwords`（`pickup` / `shiguang` 都被佔了，全球 namespace unique）。舊 `wordwar` project **已刪除，wordwar.pages.dev 是 404**。

### Build budget
- 目標：< 1 MB raw、< 400 KB gzip
- 現況 (v0.13)：**1407 KB raw / 371 KB gzip**（baseline 1324/354，+83/+17）
- 增幅來源：SVG mascots + difficulty JSON + animation CSS（peace.mp3 在 public/ 不算 bundle）
- 加東西時要量 raw 增幅，超 10KB 要思考

---

## 📜 Decision Log（重要設計取捨）

| 決策 | 為什麼 |
|------|-------|
| Phaser canvas `display:none`，全 DOM 渲染 | 手機 DPR 模糊 + layout 衝突，徹底解 |
| 故事模式無 HP、force-correct + blindRetry | 「下班逃逸」核心情緒 — 不能讓玩家有「失敗焦慮」；blindRetry 強化「自己想出來」的成就感 |
| 答錯保留正確選項位置不 shuffle | 訓練位置記憶 + 減少作弊感 |
| Zustand 不用 Redux | 輕量、夠用、TypeScript 體驗好 |
| Cloudflare Pages 不用 Vercel | 免費額度大、CDN 快、邊緣計算 future-proof |
| Ghibli 暖色取代 Duolingo 亮綠（v0.8） | 配合小貓故事的治癒感，亮綠太「健身房」 |
| 暫不做完整 SM-2 SRS | MVP 先驗證玩家會不會回來，再投資複雜算法 |
| **BGM 程序合成 → mp3 streaming (v0.13)** | 程序合成 piano 不夠 Ghibli vibe；mp3 走 CDN 不進 bundle，零 perf 代價 |
| **Ch8 narrative：回家 → 留街頭 (v0.10)** | per user feedback「夠戲劇 + 勵志」— 跳出迪士尼套路 |
| **Bypass mode L3 + 6 deny guardrails** | settings.json defaultMode `bypassPermissions`，per user 授權（搭配 deny list 兜底） |
| **Claude Design 不能 invoke，只能瀏覽器手動** | workflow 限制 documented，mascot 重做必須手動操作 |

---

## 📋 Open Questions（v0.13 → v0.14 待決定）

1. **Mascot 重做進度**：外部 AI image gen 還在迭代，Claude Design 手動 + Pollinations fallback
2. **Ch6-8 視覺強化**：題目已就位，但對應 NPC art / 場景 art 還沒到 v0.11 視覺水準
3. **Step 7 housekeeping**：`wordwar-*` CSS classnames 還沒全部 refactor 成 `pickup-*`
4. **Hook encoding fix v4.1 (ASCII suffix)**：still untested on next 80% threshold
5. **SRS 升級**：「答對一次就移出」要不要改「連對 N 次才移出」真 SM-2？
6. **完成 8 章後解鎖什麼**：B1 等級題庫 / 續集故事 / 寵物收藏 cosmetic？
7. **DEV_UNLOCK_ALL flip 時機**：v1.0 ship 前要切回 false + 加 paywall gate

---

## 🗺️ Roadmap

### Phase 1 — MVP 驗證（✅ 完成）
- ✅ 5 章 → 8 章小貓回家路全上線 (v0.10)
- ✅ Ghibli 美學 + force-correct + blindRetry + SRS lite
- ✅ Duolingo-tier UI overhaul (v0.11) + 難度系統 (v0.12) + 極簡 splash (v0.13)
- ✅ Rebrand WordWar → 拾光 (v0.9)

### Phase 2 — Ship v1.0（下一步）
- Mascot real assets（外部 AI image gen 重做完成）
- Ch6-8 視覺強化到 v0.11 標準
- `wordwar-*` → `pickup-*` CSS classname refactor (Step 7)
- DEV_UNLOCK_ALL flip 回 false + paywall gate
- Public v1.0 ship

### Phase 2.5 — iOS App Store 上架（v1.x 完成後）

走 **Path B:Capacitor + Codemagic 雲端 build**（2026-05-26 用戶確認）:
- ❌ 不走 Expo/EAS Build(Pickup 不是 RN)
- ❌ 不走本機 Xcode(用戶 Windows 沒 Mac)
- ✅ Capacitor 把現有 web bundle 包進 WebView native shell
- ✅ Codemagic.io 雲端 build(500 min/mo 免費 tier)→ 直推 TestFlight
- ✅ Apple Developer Program $99/yr 是 hard cost
- 全程瀏覽器管 App Store Connect,不碰 Mac

**前置**:先做 PWA(manifest + service worker)讓 iPhone 可加桌面 — 是過渡方案不是衝突方案。

### Phase 3 — 延伸故事 / 多 IP（後傳）
- 候選續集 IP（同調動物治癒系）：
  - 🐶 招財狗的街角生意經
  - 🐢 烏龜的夜班超商
  - 🦊 神社小狐狸（玄幻向）
  - 🐲 靈獸修仙記（東方向）
- Cosmetic IAP：角色服裝 / 場景包

---

## 🚫 Don't Do（踩過的雷）

1. **不要在 Phaser canvas 畫文字** — 手機會糊。所有 text → DOM
2. **不要用 absolute position 排版** — 會 overlap。用 flex column flow
3. **不要做「真實上班族劇本」** — 用戶反饋「下班已經夠累」，會反向打擊使用意願
4. **不要把音量按鈕做 UI** — 用戶覺得「內設有音樂就好，要關用手機系統音量」
5. **不要顯示「X of 10」counter** — 用 progress bar 即可，數字會增加焦慮
6. **不要讓答錯扣 HP 結束 run（故事模式）** — force-correct + blindRetry 即可，HP 失敗破壞治癒感
7. **不要硬塞短螢幕** — Mascot 要響應式縮小，否則 iPhone SE 等小螢幕會擠
8. **不要省略 `safe-area-inset`** — iPhone notch / home bar 會吃內容
9. **不要 commit 之前先 push** — 確認 build 過，wrangler deploy 失敗會留 dirty state
10. **不要直接抓多益題** — ETS 版權嚴。學測 / 統測題公開可用，但 v0 自製就夠
11. **不要靠 LLM 寫複雜 SVG mascot art** — 物理上限，4 次 iteration 都翻車 (v0.8.2-0.8.4 教訓)。改外部 AI image gen
12. **不要用中文 commit message 跑 `wrangler pages deploy`** — 改用 `--commit-message="..."` ASCII override
13. **不要在 hook script 用 PowerShell `Write-Output` 寫中文** — Claude Code stdin reader mojibake，改 ASCII
14. **不要假設 Cloudflare Pages project name 沒被佔** — 全球 namespace unique，`pickup`/`shiguang` 都被搶，要用 `pickupwords` 這種 less common 組合

---

## 💬 Working Style With User（作者 鄭成功 偏好）

作者的溝通風格 — 請對齊：

### 提問與回答
- **A/B/C 選擇題格式**作者最買單。每個選項加 emoji + 簡述
- 預設行為要明確：「沒回 X 分鐘預設跑 🅰️」— 不要讓 user 卡住
- 列表要短，行動要決斷
- **比喻 + 大白話**勝過 jargon
- **最重要 + 最簡單放第一個**，不要照建議流程順序

### 工作節奏
- 作者一次給多個指令，期待 subagent 並行處理
- 完成後 Telegram 推「v0.X 完成 + URL」單獨一條
- **每次 dispatch subagent 前先列「會碰哪些檔 + 跑哪些指令」**，避免瞎簽 permission
- Permission prompt 跳出來前先在 Telegram 解釋為什麼 + permit 什麼 + 拒絕的影響

### 文體偏好
- 禁贅字（「🤖」「※」「簡言之」這些）
- 禁英譯腔（「保持開放」改「歡迎交流」）
- 預設精簡版
- 預測類用 bull / base / bear 三檔
- Telegram 回覆禁 `**markdown**`，強調用 emoji 開頭（🎯/⚠️/✅/⭐/💡）

### 不喜歡
- 「Permission 跳出來但沒解釋」— 一定要先講
- 「subagent 跑完才告訴我做了什麼」— 要事先預告
- 「Confirmation 跳出來但不知道拒絕會怎樣」— 一定要說明拒絕的影響
- 過度問問題 — 能自己判斷就動

### 喜歡
- 「我替你想到了 X，三個方向供你選」這種主動性
- 數字 + 證據 ≥ 純文字描述
- 「⭐ 推薦 🅰️」這種有立場的引導（但要說理由）

---

## 🔗 External Links

- **Live URL**: https://pickupwords.pages.dev/
- **Repo**: https://github.com/kengkeng44/pickup
- **Cloudflare Pages project**: `pickupwords`
- **Mascot workflow doc**: `Desktop\拾光-mascot-claude-design-steps.md`
- ⚠️ 舊 URL `wordwar.pages.dev` = 404（project 已刪除）
- ⚠️ 舊 repo `kengkeng44/wordwar` 自動 redirect 1 年

---

## 📝 Onboarding Checklist（新 Claude session 接手時）

1. ⬜ 讀完這份 CLAUDE.md
2. ⬜ `git log --oneline -10` 看最新 commit 軌跡
3. ⬜ 跑 `npm install && npm run dev` 在 localhost 玩過一輪小貓回家路（建議用 DEV_UNLOCK_ALL=true 看完整 Ch1-8）
4. ⬜ 看 `src/data/storyKitten.ts` 理解 8 章故事題目結構 + 確認 DEV_UNLOCK_ALL 狀態
5. ⬜ 看 `src/scenes/PlayScene.ts` + `src/ui/ClozeUI.ts` 理解答題核心 + blindRetry flow
6. ⬜ 看 `src/scenes/BootScene.ts` 理解 v0.13 極簡 splash + 難度 pill
7. ⬜ 看 `src/audio/bgm.ts` 理解 mp3 streaming 機制
8. ⬜ 對齊作者偏好（這份的 "Working Style" 一節）
9. ⬜ 動工前列「會碰哪些檔 + permission 預告」

---

*Last updated: 2026-05-26 by Claude (Opus 4.7) — synced to v0.13 state*
