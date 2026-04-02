# Circuit Shader — 電路板光暈動畫

## 目的

在全螢幕 Canvas 上繪製科幻風格的電路板動畫：預先定義的線路上有發光拖尾沿路徑行進，頭尾端點以空心圓環呈現，整體具有充能→畫線→排放(drain)的循環動畫。

## 檔案結構

| 檔案 | 用途 |
|---|---|
| `parseSvgCircuit.ts` | 從 SVG 擷取路徑、端點、線段資料，計算 gap/radius，輸出 JSON |
| `circuitData.json` | parser 輸出的結構化資料，供 shader 在建置時使用 |
| `CircuitShader.tsx` | R3F 元件：將 JSON 轉為 DataTexture，驅動全螢幕 fragment shader |

## 資料流

```
circuit-pattern.svg
        │
        ▼
  parseSvgCircuit.ts    ← 手動執行: npx tsx src/app/\[locale\]/\(canvas\)/circuit/parseSvgCircuit.ts
        │
        ▼
  circuitData.json      ← paths, endpoints, segments, gap, endpointRadius
        │
        ▼
  CircuitShader.tsx     ← useMemo 讀取 JSON → 正規化座標 → 打包 DataTexture → 傳入 shader
```

## SVG Parser (`parseSvgCircuit.ts`)

### 輸入

`public/images/circuit-pattern.svg`，需包含：

- `<path d="M x y L x y ...">` — 折線路徑
- `<line x1 y1 x2 y2>` — 獨立線段（視為兩點路徑）
- `<circle cx cy r>` — 端點圓環

### 輸出欄位

| 欄位 | 說明 |
|---|---|
| `viewBox` | SVG 寬高 |
| `paths` | 每條路徑的 `[x, y][]` 頂點陣列 |
| `endpoints` | 每個圓的 `{ x, y, r }` |
| `segments` | 所有線段展平為 `[x1, y1, x2, y2][]` |
| `gap` | 路徑端點到最近圓心的平均距離 (SVG px) |
| `endpointRadius` | 所有圓的平均半徑 (SVG px) |
| `stats` | 路徑/線段/端點總數 |

### 可攜性

`gap` 和 `endpointRadius` 由 parser 自動計算，更換 SVG 時不需手動調整常數。

## Shader 元件 (`CircuitShader.tsx`)

### 座標正規化

SVG 座標 → shader 座標：以 viewBox 中心為原點，除以半高，Y 軸翻轉。

```
nx(x) = (x - width/2) / (height/2)
ny(y) = (height/2 - y) / (height/2)
```

### 端點推導

端點位置不直接使用 SVG 圓心，而是從路徑的第一/最後一個頂點沿路徑反方向延伸 `gap` 距離，以確保端點與線段正確對齊。圓環半徑使用 `endpointRadius`。

### DataTexture 編碼

**Segment Texture** (寬 = 線段數 N, 高 = 2)：

| Row | RGBA 內容 |
|---|---|
| 0 | x1, y1, x2, y2（幾何） |
| 1 | arcStart, arcEnd, totalArc, delay（動畫） |

**Endpoint Texture** (寬 = 端點數 M, 高 = 2)：

| Row | RGBA 內容 |
|---|---|
| 0 | cx, cy, r, arcPos |
| 1 | totalArc, delay, isStart, 0 |

兩者皆為 `FloatType` + `NearestFilter`，避免插值。

### 動畫循環（每條路徑獨立）

每條路徑有隨機 `delay`（0–8 秒），使各路徑錯開。一次循環分三階段：

```
|← PRE_CHARGE →|← drawTime →|← PAUSE (含 drain) →|
     充能            畫線           排放 + 等待
```

1. **PRE_CHARGE**：起點端點逐漸充能發亮，拖尾尚未出發
2. **Draw**：拖尾頭以 `SPEED` 沿 arc-length 前進，經過的線段持續發光
3. **PAUSE**：
   - **Drain 階段** (佔 `DRAIN_FRAC` 比例)：能量從起點往終點方向逐段熄滅，模擬電流流出
   - **等待階段**：全部回到待機亮度，等待下一輪

### SDF 函數

- `sdSeg(p, a, b)` → `vec2(距離, 投影比例 h)`：點到線段的最短距離，`h` 用於內插 arc position
- `sdRing(p, c, r)` → `float`：點到空心圓環的距離

### 光暈系統

#### 活動光暈 (1/d 衰減)

```glsl
g = GLOW_W / max(d, 0.0004)
```

強度隨距離反比衰減，近處極亮、遠處快速衰減。用於拖尾頭、拖尾殘留、端點閃光。

#### 待機光暈 (smoothstep 柔邊)

```glsl
gIdle = IDLE_DIM * (1.0 - smoothstep(0.0, IDLE_W, d))
```

固定寬度的柔邊線條，寬度 (`IDLE_W`) 和亮度 (`IDLE_DIM`) 完全解耦。用於未發光狀態的底線。

#### 合成

線段和端點的亮度使用 `max` 合併（非相加），避免交疊處出現亮點：

```glsl
col += baseCol * max(baseTotal, epGlow);
col += headCol * max(headTotal, epHeadGlow);
```

### 拖尾細節

- **亮頭** (`headGlow`)：對稱高斯分佈，只在 draw 階段顯示
- **殘留光暈** (`trailBehind`)：頭後方的指數衰減，隨 drain 逐段消退
- **基礎亮度** (`base`)：拖尾通過後的持續發光，隨 drain 逐段消退
- **待機底線** (`gIdle`)：永遠存在的最低亮度，不受動畫影響

### 端點細節

- **起點**：在 `PRE_CHARGE` 期間逐漸充能（充能範圍 = `PRE_CHARGE * SPEED`）
- **終點**：拖尾接近時才充能（充能範圍 = `EP_CHARGE_END`，極短距離）
- **閃光** (`flash`)：拖尾抵達/出發時的高斯亮閃
- **Drain**：與線段同步的位置性消退

### 效能考量

- `DIST_CUTOFF`：像素距離超過此值直接 `continue`，避免對遠處線段做完整計算
- 端點迴圈同理，距離 > 0.06 跳過
- 所有資料透過 DataTexture 傳入 GPU，CPU 端每幀只更新 `iTime` 和 `iResolution`
