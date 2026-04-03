# Shine 效果分析

> 來源：四個 Shadertoy shader，分為兩大類型

## 概覽

四個 shader 提供兩種風格的「光芒」效果：

| 類型 | Shader | Shadertoy | 風格 |
|------|--------|-----------|------|
| **Type 1-1** | shine-type1-1.shader | [WtG3RD](https://www.shadertoy.com/view/WtG3RD) | 彩色光暈 + Simplex 噪聲閃光 |
| **Type 1-2** | shine-type1-2.shader | [wtV3R1](https://www.shadertoy.com/view/wtV3R1) | 灰階純閃光（type1-1 的簡化版） |
| **Type 2-1** | shine-type2-1.shader | [XljXz3](https://www.shadertoy.com/view/XljXz3) | 紋理驅動的動態閃光波紋 |
| **Type 2-2** | shine-type2-2.shader | [MXdSzX](https://www.shadertoy.com/view/MXdSzX) | 體積碎形 + Flare + 星芒（最複雜） |

---

## 一、共用技術：Simplex Noise（Type 1 系列）

Type 1-1 和 1-2 共享相同的 3D Simplex Noise 實現：

```glsl
vec3 hash33(vec3 p3) {
    p3 = fract(p3 * MOD3);
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3((p3.x+p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

float simplex_noise(vec3 p) {
    // 標準 3D Simplex Noise
    // 使用四面體分割（K1=1/3, K2=1/6）
    // 4 個頂點的 gradient dot product
    // h^4 * dot(gradient, distance) 加權
    return dot(vec4(31.316), n);
}
```

**為什麼用 Simplex 而非 Perlin？**
- Simplex 在 3D 只需 4 個取樣點（vs Perlin 的 8 個）
- 沒有方向偏差（isotropic）
- 視覺上更「有機」，不會出現明顯的格狀紋路

---

## 二、Type 1-1：彩色光暈閃光 (WtG3RD)

### 2.1 座標系統

```glsl
vec2 uv = (fragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
float a = sin(atan(uv.y, uv.x));   // 角度的 sin → 連續波形
float am = abs(a - .5) / 4.;        // 偏移+歸一化的角度遮罩
float l = length(uv);               // 到中心的距離
```

- `uv`：以畫面中心為原點，Y 軸歸一化的座標
- `a = sin(atan(...))`：不是直接用角度，而是取角度的 sin，這產生 **對稱的波紋圖案**（不像 `fract(atan/TAU)` 產生鋸齒）
- `am`：角度遮罩，控制角向的閃光密度

### 2.2 雙重距離遮罩

```glsl
float m1 = clamp(.1 / smoothstep(.0, 1.75, l), 0., 1.);  // 外衰減
float m2 = clamp(.1 / smoothstep(.42, 0., l), 0., 1.);    // 內衰減
```

這是兩個 **反向 smoothstep 遮罩**：

| 遮罩 | 行為 | 效果 |
|------|------|------|
| `m1` | `l → 0` 時 `smoothstep → 0`，`0.1/0 → ∞ → clamp → 1` | 中心為 1，向外衰減 |
| `m2` | `l → 0` 時 `smoothstep → 1`，`0.1/1 → 0.1` | **中心被壓暗**，避免過曝 |

`m1 * m2` 的組合產生一個**環形亮度分佈**——不是中心最亮，而是離中心一段距離處最亮，這是閃光/光暈的自然形態。

### 2.3 三層 Simplex 噪聲

```glsl
float s1 = (simplex_noise(vec3(uv*2., 1. + iTime*.525)) * (max(1.0 - l*1.75, 0.)) + .9);
float s2 = (simplex_noise(vec3(uv*1., 15. + iTime*.525)) * (max(.0 + l*1., .025)) + 1.25);
float s3 = (simplex_noise(vec3(vec2(am, am*100. + iTime*3.)*.15, 30. + iTime*.525))
            * (max(.0 + l*1., .25)) + 1.5);
s3 *= smoothstep(0.0, .3345, l);
```

| 層 | 輸入空間 | 特性 | 角色 |
|----|---------|------|------|
| `s1` | `uv * 2`（螢幕 XY） | 中心強、邊緣弱 `(1-l*1.75)` | **大尺度雲狀亮度調制** |
| `s2` | `uv * 1`（較大尺度） | 邊緣強、中心弱 `(l*1.)` | **邊緣區域的紋理變化** |
| `s3` | `(am, am*100 + iTime*3)` | **角度空間**取樣，快速時間動畫 | **徑向閃光條紋** |

**關鍵設計：**
- `s1` 和 `s2` 是螢幕空間噪聲，產生「雲朵」般的亮度變化
- `s3` 是在 **角度空間** 取樣——`am*100` 極大地拉伸角度方向，產生密集的徑向條紋
- `iTime*3.` 讓 `s3` 快速旋轉動畫，產生「閃爍」感
- `s3 *= smoothstep(0.0, .3345, l)` 在中心附近抑制角向條紋（避免中心雜亂）

### 2.4 合成與著色

```glsl
float sh = smoothstep(0.15, .35, l);     // 內環切除

float m = m1*m1*m2 * ((s1*s2*s3) * (1.-l)) * sh;

vec3 col = mix(BLACK_COL, (0.5 + 0.5*cos(iTime + uv.xyx*3. + vec3(0,2,4))), m);
```

**合成邏輯：**
- `m1*m1*m2`：雙重距離遮罩（m1 平方增加衰減速度）
- `s1*s2*s3`：三層噪聲相乘（只有三層都亮的區域才亮，產生稀疏的閃光）
- `(1.-l)`：額外的距離衰減
- `sh`：距離 < 0.15 的區域被切除（中心黑洞）

**著色：** Cosine Palette `0.5 + 0.5*cos(iTime + uv.xyx*3. + vec3(0,2,4))` — 這是 Inigo Quilez 的經典彩虹色技巧。隨時間和位置變化的 RGB 偏移產生流動的彩色光。

### 2.5 視覺效果

- 圍繞中心的環形光暈
- 密集的徑向閃光條紋（像太陽光冕）
- 條紋隨時間快速旋轉閃爍
- 彩虹色漸變
- 從中心到邊緣自然漸弱

---

## 三、Type 1-2：灰階純閃光 (wtV3R1)

### 3.1 與 Type 1-1 的差異

Type 1-2 基於完全相同的架構，但有以下關鍵調整：

| 參數 | Type 1-1 | Type 1-2 | 效果差異 |
|------|----------|----------|---------|
| `s3` 時間速度 | `iTime*3.` | `iTime*1.` | 閃爍更緩慢、柔和 |
| `s3` 最小值 | `.25` | `.025` | 條紋延伸更遠到邊緣 |
| 外環衰減 `sh2` | 無 | `smoothstep(0.75, .3, l)` | 新增外緣衰減，限制閃光範圍 |
| `m1` 合成 | `m1*m1` | `m1`（一次方） | 外衰減更緩慢 |
| 輸出 | `mix(BLACK, palette, m)` | `vec4(m)` 灰階 | **無色彩** |
| 後處理 | 無 | `m = m*m` | 平方壓縮，只保留最亮的部分 |

### 3.2 新增的外環遮罩 `sh2`

```glsl
float sh2 = smoothstep(0.75, .3, l);
float m = m1*m2 * ((s1*s2*s3) * (1.-l)) * sh * sh2;
m = m*m;
```

- `sh2 = smoothstep(0.75, .3, l)`：在 `l = 0.3` 時為 1，在 `l = 0.75` 時為 0
- 效果：閃光被限制在一個**明確的圓形範圍**內（0.3–0.75）
- `m*m`：最終平方處理使得只有最亮的閃光尖峰可見，暗區更暗

### 3.3 視覺效果

- 比 Type 1-1 更聚焦，光暈範圍更小
- 純白閃光（無色彩），適合作為亮度層疊加
- 條紋更緩慢、更規律地閃爍
- 更尖銳的閃光效果（因為 m*m）
- **適合作為 multiply/screen/additive 層疊加到彩色場景上**

---

## 四、Type 2-1：紋理驅動的動態波紋 (XljXz3)

### 4.1 核心概念

完全不同的方法——不用程序化噪聲，而是用**外部紋理**（`iChannel0`）驅動距離場動畫。

```glsl
float dist = length(uv);
float angle = (atan(uv.y, uv.x) + PI) / (2.0 * PI);  // 0→1 的歸一化角度

vec3 textureDist = texture(iChannel0, vec2(iTime * SPEED, angle)).xyz;
textureDist *= 0.4;
textureDist += 0.5;
```

### 4.2 距離場動畫

- `texture(iChannel0, vec2(iTime * SPEED, angle))`：以角度為 V 座標、時間為 U 座標取樣紋理
- `SPEED = 1/80`：非常緩慢的時間滾動
- 紋理的 RGB 三通道被用作**三個獨立的距離閾值**
- `*0.4 + 0.5`：將 [0,1] 映射到 [0.5, 0.9]，控制波紋的基礎半徑

### 4.3 Per-channel 比較

```glsl
if (dist < textureDist.x)
    color.x += smoothstep(0.0, SMOOTH_DIST, textureDist.x - dist);
if (dist < textureDist.y)
    color.y += smoothstep(0.0, SMOOTH_DIST, textureDist.y - dist);
if (dist < textureDist.z)
    color.z += smoothstep(0.0, SMOOTH_DIST, textureDist.z - dist);
```

- 對 R、G、B 三通道分別進行距離比較
- `SMOOTH_DIST = 0.6`：漸進式衰減，而非硬邊
- 因為三通道的紋理值不同，RGB 會在不同距離出現，產生**色散（chromatic separation）**效果

```glsl
fragColor = vec4(color + normal, 1.0);
```

最終加上法線紋理作為背景。

### 4.4 視覺效果

- 從中心向外擴散的脈動波紋
- RGB 三通道各自擴散，產生紅綠藍的色散
- 非常柔和的 smoothstep 衰減
- **依賴外部紋理**（`iChannel0`）——需要提供一張噪聲紋理

### 4.5 限制

- **需要 `iChannel0` 紋理輸入**：不是純程序化的，移植到我們的專案需要額外處理
- 視覺上比 Type 1 系列更簡單（沒有徑向條紋）
- 色散效果可能與水晶的暖色主題不搭

---

## 五、Type 2-2：體積碎形 + Flare + 星芒 (MXdSzX)

### 5.1 概覽

這是四個中最複雜的，包含**四個獨立的視覺層**疊加：

| 層 | 技術 | 效果 |
|----|------|------|
| 1. 體積碎形 | 20 步 Raymarching + sphere inversion 碎形 | 深空星雲般的背景光 |
| 2. 動態線條 | 256 次鄰居偏移 + 距離場 contour | 圍繞中心的旋轉線條 |
| 3. Flare | 噪聲驅動的角度分裂 + 旋轉 | 不規則的光芒射線 |
| 4. Happy Star | `(2+p*(p*p-1.5))/(uv.x+uv.y)` | 十字星芒疊加 |

### 5.2 體積碎形渲染

```glsl
#define volsteps 20
#define stepsize 0.1
#define formuparam 0.53
#define iterations 17

vec3 from = vec3(1., .5, 0.5);
for (int r = 0; r < volsteps; r++) {
    vec3 p = from + s2 * dir * .5;
    p = abs(vec3(tile) - mod(p, vec3(tile * 2.)));  // 空間折疊
    float pa, a = pa = 0.;
    for (int i = 0; i < iterations; i++) {
        p = abs(p) / dot(p, p) - formuparam;          // sphere inversion
        p.xy *= mat2(cos/sin rotation by iTime*0.05); // 慢速旋轉
        a += abs(length(p) - pa);
        pa = length(p);
    }
    // 累積亮度、對比、衰減
    v += fade;
    v += vec3(s2, s2*s2, s2*s2*s2*s2) * a * brightness * fade;
    fade *= distfading;
    s2 += stepsize;
}
```

**碎形公式：** `p = abs(p)/dot(p,p) - formuparam`
- 這是 Kaliset 碎形的變體（與 energy-crystal1 的內部密度函數相同家族）
- 空間折疊 (`mod + abs`) + sphere inversion 產生無限重複的碎形結構
- 17 次迭代 × 20 步 = 340 次碎形運算，效能開銷大
- `formuparam = 0.53` 控制碎形的複雜度

### 5.3 Flare 函數

```glsl
float flare(float angle, float alpha, float time) {
    float n = noise(vec2(...) * 7.0);
    float split = (15. + sin(t*2+n*4+angle*20+alpha*n) * (.3+.5+alpha*.6*n));
    float rotate = sin(angle*20 + sin(angle*15+alpha*4+t*30+n*5+alpha*4)) * (.5+alpha*1.5);
    float g = pow((2.+sin(split+n*1.5*alpha+rotate)*1.4) * n*4., n*(1.5-0.8*alpha));
    g *= alpha * alpha * alpha * .5;
    g += alpha * .7 + g*g*g;
    return g;
}
```

**Flare 的核心特點：**
- **噪聲驅動分裂**：`split` 項用 sin+noise 在角度方向產生不規則的明暗條紋
- **旋轉調製**：`rotate` 項使每條閃光線扭動，不是完美的直線
- **Alpha 三次方衰減**：`alpha³ * 0.5` 使中心暗、邊緣亮的 flare 衰減非常自然
- **self-reinforcing**：`g += g*g*g` 使明亮處更亮（正回饋）

### 5.4 Light 函數

```glsl
float light(vec2 pos, float size, float radius, float inner_fade, float outer_fade) {
    float len = length(pos / size);
    return pow(clamp((1.0 - pow(clamp(len-radius, 0., 1.), 1./inner_fade)), 0., 1.), 1./outer_fade);
}
```

| 參數 | 值 | 作用 |
|------|---|------|
| `SIZE` | 3.8 | 光的覆蓋範圍 |
| `RADIUS` | 0.15 | 光源核心半徑 |
| `INNER_FADE` | 0.08 | 內衰減速度（很快 → 尖銳的核心） |
| `OUTER_FADE` | 0.02 | 外衰減速度（很快 → 光暈範圍有限） |

兩層 `pow` 嵌套提供高度可控的衰減曲線：
- `inner_fade` 控制從核心到邊緣的過渡速度
- `outer_fade` 控制光暈尾巴的長度

### 5.5 Happy Star

```glsl
float happy_star(vec2 uv, float anim) {
    uv = abs(uv);
    vec2 pos = min(uv.xy / uv.yx, anim);
    float p = (2.0 - pos.x - pos.y);
    return (2.0 + p*(p*p - 1.5)) / (uv.x + uv.y);
}
```

純數學的十字星芒函數：
- `uv.xy / uv.yx`：沿 45° 軸的比值，在 x=y 對角線上產生尖峰
- `1 / (uv.x + uv.y)`：沿 x 和 y 軸產生尖峰
- 結果：四個方向的光芒尖刺
- `anim = sin(iTime*12)*0.1 + 1.0`：快速脈動動畫

### 5.6 最終合成

```glsl
// Flare 著色
fragColor = vec4(
    f*(1.+sin(angle-t*4.)*.3) + f2*f2*f2,        // R: flare + 旋轉調製
    f*alpha + f2*f2*2.0,                           // G: flare * alpha
    f*alpha*0.5 + f2*(1.+sin(angle+t*4.)*.3),     // B: flare * alpha * 0.5 + 旋轉調製
    1.0
);

// 乘以 happy_star
fragColor *= vec4(happy_star(uv, anim) * vec3(0.55, 0.5, 1.15), 1.0);
fragColor += vec4(happy_star(uv, anim) * vec3(0.55, 0.5, 1.15) * 0.01, 1.0);
```

- Flare 的 RGB 通道各自有不同的角度旋轉偏移，產生**色散**
- `f2*f2*f2`（三次方）只在最亮處出現第二層 flare
- 乘以 happy_star：flare 沿十字方向被增強，其他方向被壓暗
- 最終效果：中心光暈 + 不規則閃光射線 + 十字星芒

### 5.7 視覺效果

- 最豐富、最具「能量感」的效果
- 不規則的閃光射線不斷扭動變化
- 十字星芒提供辨識度高的視覺焦點
- 暖色 flare + 冷色星芒的色彩對比

---

## 六、四種方案對比

| 特性 | Type 1-1 | Type 1-2 | Type 2-1 | Type 2-2 |
|------|----------|----------|----------|----------|
| **複雜度** | 中 | 低 | 低 | 高 |
| **效能** | 中（3×simplex） | 中（3×simplex） | 低（紋理查詢） | 高（20步×17迭代） |
| **外部依賴** | 無 | 無 | 需要紋理 | 無 |
| **色彩** | 彩虹漸變 | 灰階 | RGB 色散 | 暖橙+冷藍 |
| **閃光特質** | 密集徑向條紋 | 尖銳純白閃光 | 柔和波紋 | 不規則扭動射線 |
| **動畫速度** | 快速閃爍 | 緩慢脈動 | 極緩慢 | 中速扭動 |
| **中心到邊緣** | 環形分佈 | 環形，範圍小 | 波紋擴散 | 核心+射線 |
| **適合場景** | 魔法光環 | 亮度疊加層 | 波紋脈動 | 能量爆發 |

---

## 七、可借鑑的技術

### 對 Energy Crystal 充能效果最有價值的技術：

1. **雙重距離遮罩（Type 1 系列）**
   - `1/smoothstep` 反向遮罩 + 內切除，產生自然的「由內到外漸弱」
   - 比我之前用的線性 gradient 或 conic-gradient 好得多

2. **角度空間噪聲取樣（Type 1-1/1-2）**
   - `simplex_noise(vec3(am, am*100 + iTime*3., ...))`
   - 在角度方向取樣產生徑向條紋，這是產生「光芒」的核心

3. **Flare 的噪聲驅動不規則性（Type 2-2）**
   - 用 noise 調製 split 和 rotation，每條光芒都不一樣
   - `alpha³` 衰減 + `g*g*g` 正回饋：自然的亮度分佈

4. **Happy Star 十字星芒（Type 2-2）**
   - 純數學、零依賴，容易移植
   - 可作為 multiply 層控制閃光的方向性

5. **三層噪聲相乘（Type 1 系列）**
   - 大尺度 × 中尺度 × 角度方向 → 只有三者同時亮才可見
   - 產生稀疏、隨機分佈的閃光尖峰

### 移植考量

| 考量 | 說明 |
|------|------|
| **Simplex Noise 在 GLSL** | 可直接移植到我們的 fragment shader 或用 Canvas 2D 模擬 |
| **CSS/Canvas 2D 限制** | Canvas 2D 沒有 per-pixel 的 simplex noise，需要用 JS 預計算或用 WebGL overlay |
| **效能預算** | 已有 EnergyCrystalMaterial 的碎形計算，額外的光芒 shader 要注意總負載 |
| **整合方式** | 可作為獨立的全屏 WebGL quad overlay（不影響主 Canvas），或整合進現有 shader |
| **Type 2-1 的紋理** | 需要提供噪聲紋理作為 iChannel0，增加資源管理複雜度 |
