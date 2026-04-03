# 光芒特效實作計畫 — Light Rays Effects

## 目標
在水晶充能變亮後，周圍射出光芒特效。實作 4 種效果，每種可獨立開關，讓使用者自由組合找出最佳效果。

---

## 四種效果

### Effect 1: Bloom（後處理光暈）
- **原理**：高亮像素自動溢出柔和光暈
- **實作**：解除目前已註解的 `<EffectComposer>` + `<Bloom>`，用 state 控制是否渲染
- **參數**：intensity 1.5, luminanceThreshold 0.6, mipmapBlur
- **工作量**：極小，已有代碼

### Effect 2: Geometric Rays（幾何光芒）
- **原理**：12~16 條細長平面 mesh，從水晶中心向外放射，AdditiveBlending
- **實作**：新組件 `LightRays`，在 `EnergyCrystalPanel` 的 group 內
- **細節**：
  - 每條 ray 是一個 PlaneGeometry（寬 0.08~0.15, 長 2~5）
  - 繞 Z 軸等間距旋轉排列（360° / rayCount）
  - 材質：自訂 ShaderMaterial，沿長度方向做漸層（中心亮→尾端透明）
  - 顏色同 energyColor（暖橙）
  - `useFrame` 動畫：
    - 長度隨 chargeLevel 從 0 展開到最大
    - 每條有隨機的閃爍頻率和相位
    - 整體緩慢旋轉（0.1 rad/s）
  - `AdditiveBlending` + `depthWrite: false` + `transparent: true`
- **工作量**：中等

### Effect 3: Screen-space Radial Streaks（螢幕空間徑向光條）
- **原理**：自訂後處理 Effect，從水晶螢幕座標向外做 radial blur
- **實作**：
  - 繼承 `postprocessing` 的 `Effect` 類
  - Fragment shader：從水晶中心的 UV 座標向外取 8~12 步 radial samples
  - 將高亮區域沿徑向拉伸成光條
  - 需要把水晶的 world position 投影到螢幕空間傳給 shader
  - 用 `useFrame` 每幀更新水晶的螢幕座標 uniform
- **參數**：intensity（由 chargeLevel 驅動）、samples 數量、decay
- **工作量**：中高（需自訂 Effect class）

### Effect 4: GodRays（體積光）
- **原理**：`@react-three/postprocessing` 內建的 GodRays effect
- **實作**：
  - 需要一個不透明的發光 mesh 作為光源（水晶本身是透明的不適合）
  - 在水晶中心放一個小的不透明發光球體（只供 GodRays 使用）
  - 用 `layers` 讓這個球體不被主相機直接渲染，只被 GodRays 讀取
  - intensity 由 chargeLevel 驅動
- **注意**：GodRays 對透明物體的效果可能不理想，需要實測
- **工作量**：中等

---

## UI 控制面板

在左上角新增效果開關面板：
```
┌─────────────────────┐
│ Effects             │
│ ☑ Bloom             │
│ ☑ Geometric Rays    │
│ ☐ Radial Streaks    │
│ ☐ God Rays          │
└─────────────────────┘
```
- 4 個 checkbox toggle
- 預設：Bloom + Geometric Rays 開啟
- 半透明 glassmorphism 風格，與現有 Charge/Reset 按鈕一致

---

## 修改檔案清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `EnergyCrystalViewer.tsx` | 修改 | 加入 4 種效果組件 + 開關 state + UI 面板 |

所有效果都寫在 `EnergyCrystalViewer.tsx` 內（作為內部組件），不需要新建檔案。

---

## 實作順序

1. **UI 控制面板** — 先建好 4 個 toggle state
2. **Effect 1: Bloom** — 解除註解，接上 toggle
3. **Effect 2: Geometric Rays** — 新組件 `LightRays`
4. **Effect 4: GodRays** — 需要發光球 + GodRays effect
5. **Effect 3: Radial Streaks** — 最複雜，自訂 Effect class 放最後

每完成一個效果就可以測試，確認不會互相干擾。

---

## 注意事項
- `EffectComposer` 只能有一個 — Bloom、Radial Streaks、GodRays 都要放在同一個 `<EffectComposer>` 裡
- 條件渲染 Effect 組件時，`EffectComposer` 可能需要重建 — 用 key 或確保 children 變化不會 crash
- Geometric Rays 不依賴後處理，可以獨立運作
- GodRays 的光源 mesh 需要用 `layers.set(1)` 隔離，避免直接可見
