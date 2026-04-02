# Multiple-Line Shader 1 分析

> 來源: https://www.shadertoy.com/view/dsKGzK

## 概覽

這是一個 **多 pass**（multi-buffer）的 Shadertoy shader，使用粒子系統模擬大量線條在螢幕上流動的效果。架構為：

| Buffer | 功能 |
|--------|------|
| **Common** | 共用函數（雜湊、simplex noise、curl noise） |
| **Buffer A** | 粒子位置更新（物理模擬） |
| **Buffer B** | 線段繪製 + 拖尾衰減 + 生命週期管理 |
| **Image** | 最終輸出 + 上色 |

整體流程：**curl noise 驅動粒子移動 → 量化為 45°/90° 方向 → 繪製線段 + 拖尾 → 上色輸出**

---

## 一、Common：共用工具函數

### 1.1 `hash21` — 2D → 1D 雜湊

```glsl
float hash21(vec2 p)
{
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}
```

- 接受 2D 向量，返回 `[0, 1)` 的偽隨機數
- 用 `fract` 和 `dot` 運算混合，是 Shadertoy 常見的低成本雜湊
- 用於 Buffer B 的生命週期隨機化

### 1.2 `hash` — 2D → 2D 雜湊（for simplex noise）

```glsl
vec2 hash( vec2 p )
{
    p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
```

- 經典 `sin` 雜湊，返回 `[-1, 1]` 範圍的 2D 向量
- 作為 simplex noise 的梯度向量來源
- 來自 https://www.shadertoy.com/view/Msf3WH

### 1.3 `simplex_noise` — 2D Simplex Noise

```glsl
float simplex_noise( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2
    const float K2 = 0.211324865; // (3-sqrt(3))/6
    ...
}
```

標準的 2D simplex noise 實作：
1. **Skew 變換**：將正方形網格歪斜為三角形網格（K1 係數）
2. **找到所在的三角形單元**：`step(a.y, a.x)` 判斷在上三角還是下三角
3. **計算三個頂點的貢獻**：
   - `a`：到第一個頂點的距離
   - `b`：到第二個頂點的距離（通過 `o` 偏移）
   - `c`：到第三個頂點的距離
4. **衰減核**：`h = max(0.5 - dot(v,v), 0)` → `h^4 * dot(v, gradient)`
5. 返回 `[-1, 1]` 範圍的 noise 值

### 1.4 `curl_noise` — 2D Curl Noise

```glsl
#define NSIZE 1.25
#define NSPEED 0.12
vec3 curl_noise(vec2 p)
{
    const float dt = .001;
    vec2 ds = vec2(dt, 0.0);

    p /= NSIZE;
    float n0 = simplex_noise(p);
    float n1 = simplex_noise(p + ds.xy);
    float n2 = simplex_noise(p + ds.yx);

    vec2 grad = vec2(n1 - n0, n2 - n0) / ds.x;
    vec2 curl = vec2(grad.y, -grad.x);
    return vec3(curl, n0) * NSIZE * NSPEED;
}
```

**Curl noise** 是從純量場（simplex noise）推導出的無散度向量場：

1. 在 `p` 點及其 x/y 偏移處各取一次 noise 值
2. **數值微分**計算梯度：`grad = (∂n/∂x, ∂n/∂y)`
3. **旋轉 90°** 得到 curl：`curl = (∂n/∂y, -∂n/∂x)`
4. 結果乘以 `NSIZE * NSPEED` 控制尺度和速度

**為什麼用 curl noise？**
- Curl noise 是無散度（divergence-free）的，意味著粒子流不會匯聚或發散
- 產生的流場看起來像自然的渦流運動
- 非常適合模擬「電流在複雜路徑上流動」的感覺

**參數意義：**
- `NSIZE = 1.25`：noise 的空間尺度，越大渦流越大
- `NSPEED = 0.12`：速度倍率
- `dt = 0.001`：數值微分的步長

---

## 二、Buffer A：粒子位置更新

```glsl
void mainImage( out vec4 fragColor, in vec2 fragCoord )
```

### 2.1 座標系統

```glsl
vec2 uv = fragCoord / iResolution.xy;
vec2 puv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
```

- `uv`：`[0, 1]` 正規化座標（用於 texture 讀取）
- `puv`：以螢幕中心為原點的座標，Y 軸範圍 `[-1, 1]`，X 按 aspect ratio 延伸

### 2.2 資料格式

每個像素代表一個粒子，`fragColor` 儲存：
- `.xy`：當前位置
- `.zw`：上一幀位置

### 2.3 初始化（第一幀）

```glsl
if (iFrame == 0)
{
    fragColor = puv.xyxy;
}
```

第一幀時，每個粒子的位置就是其對應的螢幕座標。即粒子均勻分佈在整個螢幕上。

### 2.4 運動更新

```glsl
vec2 p0 = texelFetch(iChannel0, ivec2(fragCoord), 0).xy;  // 讀取當前位置

vec2 v0 = curl_noise(p0*2.).xy;       // 取 curl noise 作為速度
float len = length(v0);

v0 = normalize(v0)*1.99;               // 正規化到接近 2.0 的長度
v0 = vec2(float(int(v0.x)),float(int(v0.y)));  // 量化為整數方向！
```

**關鍵的量化步驟：**

`normalize(v0) * 1.99` 然後 `int()` 截斷——這將連續的 curl noise 方向**量化為 8 個方向之一**：

| 方向 | 量化結果 |
|------|---------|
| 右 | (1, 0) |
| 右上 | (1, 1) |
| 上 | (0, 1) |
| 左上 | (-1, 1) |
| 左 | (-1, 0) |
| 左下 | (-1, -1) |
| 下 | (0, -1) |
| 右下 | (1, -1) |

這正是 PCB 走線的 **45° 增量方向**！`*1.99` 而非 `*2.0` 是為了避免浮點精度問題（確保 `int(1.99) = 1` 而非可能的 `int(2.0) = 2`）。

### 2.5 位置更新

```glsl
vec2 p1 = p0 + v0 * iTimeDelta;
```

新位置 = 舊位置 + 量化方向 × 時間增量。由於 `v0` 是整數向量（如 `(1,1)`），粒子每幀在量化方向上移動。

### 2.6 滑鼠互動

```glsl
if (iMouse.z > 0.0)
{
    vec2 ms = (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y;
    vec2 mv = (ms - p0) * 0.5;
    mv /= dot(mv, mv) + 0.04;   // 反距離加權
    mv = vec2(mv.y, -mv.x);     // 旋轉 90°（curl 效果）
    v0 += mv * 0.2;
}
```

按下滑鼠時，粒子會受到一個以滑鼠位置為中心的**旋轉力場**影響：
- `(ms - p0)`：從粒子指向滑鼠的向量
- `/ (dot + 0.04)`：反距離衰減（0.04 防止除以零）
- `(y, -x)` 旋轉：將吸引力變成旋轉力（curl）
- 結果是粒子繞滑鼠位置旋轉而非直接被吸引

### 2.7 生命週期重置

```glsl
vec4 c = texelFetch(iChannel1, ivec2(fragCoord), 0);  // 讀取 Buffer B 的生命值

if (c.y <= 0.0)
{
    fragColor = puv.xyxy;  // 生命結束，重置到初始位置
}
else
{
    fragColor = vec4(p1, p0);  // 儲存新位置和舊位置
}
```

當粒子生命值（由 Buffer B 管理）耗盡時，粒子重置到螢幕上的初始位置，重新開始流動。

---

## 三、Buffer B：線段繪製 + 拖尾 + 生命管理

### 3.1 常數定義

```glsl
#define COL (36)          // 水平粒子取樣數
#define ROW (20)          // 垂直粒子取樣數
#define DW (1.0 / float(COL))  // 每格寬度
#define DH (1.0 / float(ROW))  // 每格高度

#define LINE_WIDTH 0.012  // 線段寬度
#define TRAIL_FADE 0.97   // 拖尾衰減率

#define MAXLIFE 400.      // 最大生命值
#define MINLIFE 100.      // 最小生命值
```

- 總共 36 × 20 = **720 個粒子**被追蹤
- 這些粒子是從 Buffer A 的像素中均勻取樣的（不是所有像素都作為粒子）

### 3.2 `sdSegment` — 線段 SDF

```glsl
vec2 sdSegment(vec2 p, vec2 d)
{
    float lp = dot(p, d) / dot(d, d);
    return p - d * clamp(lp, 0.0, 1.0);
}
```

與 one-line-shader 的 `sdLine` 類似，但這裡：
- `p` 已經是相對於線段起點的向量（`puv - ppos.xy`）
- `d` 是線段方向向量（`ppos.zw - ppos.xy` = 舊位置 - 新位置）
- 返回的是**向量**（不是距離），用於後續 `length()` 計算

### 3.3 線段繪製

```glsl
vec4 col = texelFetch(iChannel1, ivec2(fragCoord), 0);  // 讀取自身上一幀
col.x *= TRAIL_FADE;  // 拖尾衰減

for (int ix = 0; ix < COL; ix++)
{
    for (int iy = 0; iy < ROW; iy++)
    {
        vec2 gid;
        gid.x = DW * (float(ix) + 0.5);  // 取樣 UV 座標
        gid.y = DH * (float(iy) + 0.5);
        vec4 ppos = texture(iChannel0, gid);  // 從 Buffer A 讀取粒子位置
        vec2 dn = sdSegment(puv - ppos.xy, ppos.zw - ppos.xy);
        float a = smoothstep(LINE_WIDTH, 0.0, length(dn));
        col.x = max(col.x, a);  // 取最大值（加法會過亮）
    }
}
```

**繪製流程：**
1. 讀取上一幀的自身像素，乘以 0.97 實現**拖尾衰減**（每幀亮度減少 3%）
2. 遍歷所有 720 個粒子
3. 對每個粒子，計算當前像素到粒子**運動線段**（從舊位置到新位置）的距離
4. `smoothstep(LINE_WIDTH, 0.0, dist)`：在 LINE_WIDTH 範圍內柔和過渡
5. `max` 混合：如果當前像素靠近任何粒子的軌跡，就點亮

**拖尾效果的關鍵：** 讀取自身上一幀數據（`iChannel1` 綁定到自身）並乘以衰減率，形成持久的、逐漸消退的軌跡。

### 3.4 生命週期管理

```glsl
col.x = clamp(col.x, 0.0, 1.0);

if (col.y > -1.0)
{
    col.y--;  // 生命值每幀 -1
}
else
{
    col.y = hash21(uv);
    col.y = mix(MINLIFE, MAXLIFE, col.y);  // 隨機重置為 100~400
}
```

- `.y` 通道儲存生命值（對每個像素獨立，不是對粒子）
- 每幀減 1，歸零後隨機重新賦值
- 這個生命值會傳回 Buffer A 用於決定何時重置粒子位置

---

## 四、Image：最終輸出

```glsl
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord / iResolution.xy;
    vec2 puv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    vec3 col = vec3(0.0);
    col += texelFetch(iChannel0, ivec2(fragCoord), 0).x;  // Buffer B 的線段亮度
    col.rg += curl_noise(puv).xy * 0.5;  // curl noise 疊加到 RG 通道

    fragColor = vec4(col, 1.0);
}
```

### 上色方式

- 基礎亮度來自 Buffer B 的 `.x` 通道（灰階線段）
- 在 R 和 G 通道上疊加 curl noise 的 xy 分量，產生隨位置變化的色彩偏移
- 效果：線條整體偏暖色（因為加在 RG 上），且顏色隨空間位置變化

**注意：** 被註解掉的 `col.rg += texture(iChannel1, uv).rg * 0.5 + 0.5` 是另一個上色方案，會使用 Buffer A 的位置數據來上色。

---

## 五、整體數據流

```
┌─────────────────────────────────────────────────────┐
│                    Common                            │
│  hash21, hash, simplex_noise, curl_noise            │
└─────────────┬────────────────────┬──────────────────┘
              │                    │
              ▼                    ▼
┌──────────────────┐    ┌──────────────────┐
│    Buffer A      │◄───│    Buffer B      │
│  粒子位置更新     │    │  線段繪製+拖尾    │
│                  │───►│  生命週期管理     │
│ .xy = 當前位置    │    │ .x = 亮度        │
│ .zw = 上一幀位置  │    │ .y = 生命值      │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │     Image        │
                        │  灰階 + curl色彩  │
                        │  最終輸出         │
                        └──────────────────┘
```

**Buffer A ↔ Buffer B 的雙向依賴：**
- Buffer A 讀取 Buffer B 的生命值決定是否重置粒子
- Buffer B 讀取 Buffer A 的位置數據繪製線段

---

## 六、總結

### 路徑生成算法
- **Curl noise 驅動** + **方向量化**（8 方向 / 45° 增量）
- 不是預定義路徑，而是程序化生成的流場
- curl noise 保證了流線的平滑和無散度特性

### Glow / Trail 效果
- **拖尾衰減**（`*= 0.97`）實現尾跡
- **smoothstep SDF** 實現柔和的線段邊緣
- **加法上色**（curl noise 疊加到 RG）產生色彩變化

### 優點
- 完全程序化，無需預定義路徑
- 方向量化產生 PCB 走線的「直角/45°」感覺
- curl noise 產生自然、有機的流動模式
- 拖尾效果產生持久的軌跡

### 限制
- 720 個粒子的雙重迴圈（Buffer B）是 O(COL×ROW) per pixel，效能開銷較大
- 路徑不可控——完全由 noise 決定，無法指定起點終點
- 沒有「節點」或「連接點」的概念
- 線段寬度固定，沒有動態 glow 變化

### 可借鑑的技術
1. **方向量化** `normalize(v)*1.99 → int()`：將連續方向量化為 8 方向
2. **Curl noise** 作為無散度流場驅動：確保粒子流動自然
3. **Buffer 自讀 + 衰減**的拖尾技術
4. **粒子生命週期** 管理（定期重置避免粒子飄出畫面）
