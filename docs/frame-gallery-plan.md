# Frame Gallery Transition — 技術計畫書

## 概述

建立一個 Three.js 頁面，實現「畫框穿越」轉場效果。使用者先沉浸在影片場景中，鏡頭後拉穿出正六邊形畫框，看到牆面上的多個畫框，再平移進入下一個畫框播放新場景。

---

## 素材清單

| 素材 | 路徑 | 規格 |
|------|------|------|
| 影片 A | `/video/BigBuckBunny.mp4` | 1280×720 px |
| 影片 A 靜態圖 | `/video/BigBuckBunny.jpg` | 退場後替代影片 |
| 影片 B | `/video/ElephantsDream.mp4` | 1280×720 px |
| 影片 B 靜態圖 | `/video/ElephantsDream.jpg` | 退場後替代影片 |

---

## 轉場階段定義

```
A.沉浸 → B.退場 → C.牆面總覽 → D.平移 → E.進場
```

| 階段 | 描述 | 鏡頭行為 | 場景狀態 |
|------|------|---------|---------|
| **A. 沉浸** | 使用者看到影片填滿視野 | 在畫框內部/正後方 | 影片 A 播放中 |
| **B. 退場** | 鏡頭後拉，六邊形框邊逐漸入鏡 | 沿 Z 軸後退，穿過畫框平面 | 影片 A 播放中，被框遮罩裁切 |
| **C. 牆面總覽** | 看到整面牆，兩個六邊形畫框並列 | 在牆前停留 | 影片 A freeze → 靜態截圖 |
| **D. 平移** | 鏡頭水平滑到畫框 B 前方 | 水平平移 | 兩個畫框都顯示靜態圖 |
| **E. 進場** | 鏡頭推進畫框 B，影片 B 開始 | 沿 Z 軸前進，穿入畫框 | 影片 B 開始播放 |

---

## 核心技術方案

### 1. 不規則畫框遮罩 — Stencil Buffer

畫框為正六邊形，不能用矩形 clipping。使用 Three.js stencil buffer：

- 用 `THREE.Shape` 定義正六邊形輪廓
- 生成 `ShapeGeometry` 作為 portal mesh
- 渲染流程：
  1. **Stencil Write Pass**：portal mesh 寫入 stencil（不寫顏色/深度）
  2. **Scene Render Pass**：場景內容只在 stencil 標記區域內渲染（`stencilFunc = EqualStencilFunc`）
  3. **Normal Pass**：正常渲染畫框邊框、牆面

### 2. 畫框形狀 — 正六邊形

```
正六邊形參數：
- 外接圓半徑 R（控制整體大小）
- 6 個頂點：角度 = i * 60° + 30°（平底六邊形）
- 用 THREE.Shape 的 moveTo / lineTo 繪製
```

畫框邊框用 `ExtrudeGeometry` 從六邊形減去內縮六邊形（環形）擠出厚度。

### 3. 鏡頭路徑 — CatmullRomCurve3

```
俯視圖（X-Z 平面）：

  牆面 (Z=0)
  ┌──────────────────────────────┐
  │   [Frame A]      [Frame B]  │
  │   x=-3           x=+3      │
  └──────────────────────────────┘

  鏡頭路徑（Z 軸正方向為鏡頭後退方向）：

  P0 (x=-3, y=0, z=-1)   ← A 沉浸（在畫框後方）
  P1 (x=-3, y=0, z=6)    ← A 退場完成（牆前）
  P2 (x=0,  y=0, z=8)    ← 牆面總覽（居中拉遠）
  P3 (x=3,  y=0, z=6)    ← B 畫框前方
  P4 (x=3,  y=0, z=-1)   ← B 進場（穿入畫框）
```

- 使用 `CatmullRomCurve3` 建立平滑曲線
- lookAt target 用另一條曲線控制（始終看向當前目標畫框中心）
- easing 使用 `easeInOutCubic` 讓起止更滑順

### 4. 場景管理

- **影片紋理**：`<video>` + `THREE.VideoTexture`，貼在畫框內的平面上
- **退場凍結**：階段 B→C 時，`video.pause()` → crossfade 到靜態 jpg texture
- **進場啟動**：階段 D→E 時，新影片 `video.play()` → crossfade 從靜態圖到影片
- **資源管理**：非活躍場景只渲染靜態圖（一張 texture），影片 pause

### 5. 牆面

- 純色背景（`#1a1a2e` 深色或類似色調）
- 一個大平面 `PlaneGeometry` 作為牆壁
- 兩個正六邊形畫框掛在牆上，間距約 6 單位

---

## 檔案結構

```
src/app/[locale]/frame-gallery/
└── page.tsx                        # 頁面入口

src/components/frame-gallery/
├── FrameGallery.tsx                # 主元件：Canvas + 整體控制
├── WallScene.tsx                   # 牆面 + 畫框佈局
├── PortalFrame.tsx                 # 單個畫框：stencil mask + 邊框 + 內容
├── FrameShapeUtils.ts              # 正六邊形 Shape 生成工具
├── CameraDirector.ts               # 鏡頭路徑（曲線 + easing + lookAt）
├── TransitionController.ts         # 轉場狀態機（5 階段）
├── SceneManager.ts                 # 影片/靜態圖切換管理
└── types.ts                        # 型別定義
```

---

## 實作順序

1. **FrameShapeUtils** — 正六邊形 `THREE.Shape` 生成 + 邊框環形幾何體
2. **PortalFrame** — stencil mask 遮罩 + 邊框渲染 + 內容平面
3. **WallScene** — 牆面 + 2 個 PortalFrame 佈局
4. **CameraDirector** — 樣條曲線路徑 + easing + lookAt 插值
5. **TransitionController** — 5 階段狀態機 + 時間軸控制
6. **SceneManager** — VideoTexture 管理 + 靜態圖 crossfade
7. **FrameGallery** — 主 Canvas 元件，串接所有模組
8. **page.tsx** — 頁面路由 + overlay UI
9. **整合測試與調校** — 動畫流暢度、時間配比、效能

---

## 風險與應對

| 風險 | 應對方案 |
|------|---------|
| Stencil 在六邊形邊緣產生鋸齒 | 增加幾何體分段數 + MSAA |
| 鏡頭穿越畫框時 near plane 裁切框體 | 動態調整 `camera.near`，或讓框體在穿越時 fade out |
| 影片載入慢 | 先顯示靜態 jpg，影片 ready 後 crossfade |
| 兩個影片同時解碼佔記憶體 | 非活躍影片 pause + 移除 src |
