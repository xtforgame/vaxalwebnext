# One-Line Shader 分析

> 來源: https://www.shadertoy.com/view/tsXczj

## 概覽

這是一個 **單一 pass** 的 Shadertoy shader（只有 `image.shader`），實現了一條帶有 glow 效果的靜態電路路徑，並在路徑上施加多種可選的動態遮罩動畫（移動/淡入淡出）。

整體架構非常簡單：**路徑定義 → SDF 距離場 → Glow 渲染 → 動畫遮罩**。

---

## 一、路徑定義（`circuit` 函數）

```glsl
float circuit(vec2 p)
{
    float d = 1e6;
    d = min(d, sdLine(p, vec2(-1.0, -0.1), vec2(-0.1, -0.1)));   // 水平線段 (左)
    d = min(d, sdLine(p, vec2(-0.1, -0.1), vec2(0.1, 0.1)));     // 45度斜線
    d = min(d, sdLine(p, vec2(0.1, 0.1), vec2(1, 0.1)));         // 水平線段 (右)
    d = min(d, sdRing(p, vec2(1.05, 0.1), 0.05));                // 右端圓環（端點標記）
    return d;
}
```

### 路徑結構

路徑由 **3 條線段 + 1 個圓環** 組成，呈現典型的 PCB 走線形狀：

```
                              ○  (圓環，半徑 0.05，圓心 1.05, 0.1)
                             /
(-1.0, -0.1) ────── (-0.1, -0.1) ╱ (0.1, 0.1) ────── (1.0, 0.1)
     水平段              45°斜線段              水平段
```

- 第一段：水平線從 `(-1, -0.1)` 到 `(-0.1, -0.1)`
- 第二段：45° 斜線從 `(-0.1, -0.1)` 到 `(0.1, 0.1)`，y 變化量 = x 變化量 = 0.2
- 第三段：水平線從 `(0.1, 0.1)` 到 `(1, 0.1)`
- 圓環：圓心 `(1.05, 0.1)`，半徑 `0.05`，作為線路的終端標記（類似 PCB pad）

### 路徑生成算法

**完全手動硬編碼**，不是程序化生成。每條線段的起點和終點都是手動指定的常數。這使得路徑精確可控，但不具備擴展性。

---

## 二、SDF（Signed Distance Field）基本函數

### `sdLine` — 線段距離

```glsl
float sdLine(in vec2 p, in vec2 a, in vec2 b)
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}
```

這是標準的「點到線段的最短距離」公式：
1. `ba = b - a`：線段方向向量
2. `dot(pa, ba) / dot(ba, ba)`：將點 `p` 投影到線段 `ab` 上，得到參數 `h ∈ [0,1]`（clamp 保證不超出線段端點）
3. `pa - ba * h`：從 `p` 到最近點的向量
4. `length(...)`：最終距離值

### `sdCircle` — 圓形距離（未使用）

```glsl
float sdCircle(in vec2 p, in float r)
{
    return length(p)-r;
}
```

標準圓形 SDF，返回點到圓周的距離（內部為負值）。在此 shader 中 **未被使用**。

### `sdRing` — 圓環距離

```glsl
float sdRing(vec2 p, vec2 origin, float radius)
{
    return abs(length(p - origin) - radius);
}
```

返回點到圓環（圓周線）的距離：
1. `length(p - origin) - radius`：到圓心的距離減半徑，得到有符號的圓形距離
2. `abs(...)`：取絕對值，使得圓的內外都有正距離，形成一個「環」而非實心圓

---

## 三、Glow 渲染

```glsl
float d = circuit(uv);
float shade = 0.008 / d;
col += vec3(1.0, 0.2, 0.0) * shade;
```

### 原理

- `0.008 / d`：這是經典的 **反距離 glow** 技術。距離 `d` 越小（越靠近路徑），`shade` 值越大。
- 這產生了一個自然的、從路徑中心向外指數衰減的發光效果。
- 沒有硬邊——線寬完全由 glow 的強度衰減隱式決定。
- `0.008` 是控制 glow 強度/寬度的常數。值越大，glow 越寬越亮。
- 顏色 `vec3(1.0, 0.2, 0.0)` 是橙紅色（R=1, G=0.2, B=0），模擬熱流/電流效果。
- 使用 `+=` 而非 mix，意味著 glow 是 **加法混合**（additive blending），靠近中心會過曝變白。

### 注意

被註解掉的 `col = mix(col, vec3(1.0, 0.2, 0.0), shade)` 是另一種混合方式（線性插值），不會過曝但效果不如加法混合那麼有 "發光" 感。

---

## 四、動畫遮罩系統

### 緩動函數 `Quart`

```glsl
float Quart(float s, float e, float t)
{
    t = clamp((t - s) / (e - s), 0.0, 1.0);
    return 1.0 - pow(1.0 - t, 4.0);
}
```

這是一個 **ease-out quartic** 緩動函數：
- `s`, `e`：定義時間區間 `[s, e]`
- `t`：當前時間
- `(t - s) / (e - s)`：將時間正規化到 `[0, 1]`
- `1 - (1-t)^4`：四次方的 ease-out 曲線，開始快、結束慢

### 時間控制

```glsl
float time = iTime * ANIMATION_TIMESCALE;  // 0.5x 速度
time = mod(time, 4.0);                      // 4 秒一個循環
```

### 遮罩原理（以 ANIMATION_TYPE == 3 為例，這是預設值）

```glsl
float moveIn = ANIM_FUNC(0.0, 1.0, time);   // 0~1秒: 進入動畫
float moveOut = ANIM_FUNC(2.0, 3.0, time);   // 2~3秒: 離開動畫

x += 2.0 * aspectRatio * (1.0 - moveIn - moveOut);
mask = smoothstep(-aspectRatio, -0.8, x) - smoothstep(0.8, aspectRatio, x);
```

**遮罩工作流程：**
1. 對 `uv.x` 進行偏移，偏移量由動畫進度控制
2. `smoothstep(-ar, -0.8, x)`：左邊界的柔和漸變（從 0 到 1）
3. `smoothstep(0.8, ar, x)`：右邊界的柔和漸變（從 0 到 1）
4. 兩者相減：形成一個中間為 1、兩邊為 0 的窗口
5. 隨時間推移，窗口從右向左滑入（moveIn），然後再滑出（moveOut）

### 四種動畫模式

| Type | 行為 | 描述 |
|------|------|------|
| 1 | 滑入 + 滑出 | 遮罩窗口滑入，停留，然後反向滑出 |
| 2 | 滑入 + 淡出 | 遮罩窗口滑入，然後整體透明度淡出 |
| 3 | 滑入 + 滑出（預設）| 與 1 類似但 moveIn 和 moveOut 是獨立計算的 |
| 4 | 縮放 | 遮罩窗口從中心放大然後縮小（除以 scale） |

### 遮罩應用

```glsl
col *= mask;
```

簡單的乘法遮罩，mask=0 的區域完全黑暗，mask=1 的區域完全顯示。

---

## 五、座標系統

```glsl
float aspectRatio = iResolution.x / iResolution.y;
vec2 uv = 2.0 * fragCoord / iResolution.xy - 1.0;   // NDC: [-1, 1]
uv.x *= aspectRatio;                                  // 修正寬高比
```

- UV 空間為 `[-1, 1]`（Y 軸），X 軸乘以 aspect ratio 保持等比例
- 這意味著電路路徑的座標都在這個正規化空間中定義

---

## 六、總結

### 優點
- 極其簡潔，單 pass 實現
- SDF + 反距離 glow 是非常高效的線條渲染方式
- 多種動畫模式提供靈活的呈現方式

### 限制
- 路徑完全硬編碼，無法程序化生成複雜電路
- 沒有「流動」效果——glow 是靜態的，動畫只是遮罩的移動
- 單一顏色，沒有電流流過的粒子感
- 無法表現分支、多路徑

### 可借鑑的技術
1. **SDF 線段距離函數** `sdLine`：基礎但必要
2. **反距離 glow** `0.008/d`：最簡單有效的發光效果
3. **窗口遮罩動畫**：可用於實現「電流沿路徑流動」的效果——如果改成沿路徑弧長方向移動遮罩窗口
