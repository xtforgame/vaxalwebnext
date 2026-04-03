# Energy Crystal 1 分析

> 來源: https://www.shadertoy.com/view/XtSfDD

## 概覽

這是一個 **多 pass**（multi-buffer）的 Shadertoy shader，使用 Raymarching 渲染一顆帶有內部火焰/能量效果的水晶。水晶外形由工具自動生成的 SDF 定義，內部效果由碎形（fractal）變形的密度場驅動。

| Buffer | 功能 |
|--------|------|
| **Buffer A** | 表面 Raymarching + 內部介質密度取樣 |
| **Buffer B** | 外部介質 Raymarching + 法線估算 |
| **Image** | 最終渲染與合成（光照、材質、Glow） |

整體流程：**SDF Raymarching → 折射光進入內部 → 密度場累積 → 外部霧效 → 光照/材質/Glow 合成**

---

## 一、共用定義與工具函數

### 1.1 常數

```glsl
#define MAX_STEPS 30
#define FIXED_STEP_SIZE .05
#define MAX_DISTANCE 30.0
#define MIN_DISTANCE 15.0
#define EPSILON .02
#define EPSILON_NORMAL .05
#define MATERIAL_CRYSTAL 1
```

- `MIN_DISTANCE = 15.0`：Raymarching 從 15 單位處才開始（因為相機離水晶較遠）
- `FIXED_STEP_SIZE = 0.05`：內部介質取樣的固定步長
- `EPSILON = 0.02`：表面碰撞閾值

### 1.2 SDF 基本工具（來自 hg_sdf 庫）

```glsl
float vmax(vec3 v) { return max(max(v.x, v.y), v.z); }
float fBox(vec3 p) {
    vec3 d = abs(p) - .5;
    return length(max(d, 0.0)) + vmax(min(d, 0.0));
}
```

- `vmax`：取向量各分量的最大值
- `fBox`：標準的 **Box SDF**，尺寸 0.5×0.5×0.5，支持圓角（length 項）

```glsl
float fCapsule(vec3 p, float r, float c) {
    return mix(length(p.xz) - r, length(vec3(p.x, abs(p.y) - c, p.z)) - r, step(c, abs(p.y)));
}
```

- `fCapsule`：膠囊體 SDF，半徑 `r`，半高 `c`

### 1.3 `pModPolar` — 極座標重複

```glsl
vec2 pModPolar(vec2 p, float repetitions) {
    float angle = 2.0 * 3.1415 / repetitions;
    float a = atan(p.y, p.x) + angle/2.;
    float r = length(p);
    float c = floor(a/angle);
    a = mod(a,angle) - angle/2.;
    return vec2(cos(a), sin(a))*r;
}
```

將 2D 座標轉換到極座標，並以 `repetitions` 次數重複。這是水晶多面體幾何的核心——讓一個面的 SDF 自動重複成 N 面。

### 1.4 `domainRepeat` — 空間重複

```glsl
vec3 domainRepeat(vec3 p, vec3 size) {
    return mod(abs(p) + size * .5, size) - size * .5;
}
```

3D 空間重複，將無限空間折疊到一個格子內。

### 1.5 雜湊與隨機數

```glsl
uint hash(uint x) { ... }        // Bob Jenkins' One-At-A-Time hash
float floatConstruct(uint m) { ... }  // uint → [0,1) float
float random(inout uint seed) { ... } // 序列隨機數生成器
```

使用整數雜湊（而非 sin 雜湊），品質更高。`random()` 函數維護一個 `seed` 狀態，每次呼叫都產生新的隨機數，適合需要多次取樣的場景。

---

## 二、Buffer A：表面 Raymarching + 內部介質

### 2.1 水晶 SDF `sdf_simple`

```glsl
const mat4 tr[45] = mat4[45](...);  // 45 個變換矩陣

float sdf_simple(vec3 p) {
    // 基於堆疊式 CSG 操作
    pStack[2].xz = pModPolar(pStack[2].xz, 8.0);   // 8 重極座標對稱
    pStack[7].xz = pModPolar(pStack[7].xz, 10.0);  // 10 重
    pStack[8].xz = pModPolar(pStack[8].xz, 5.0);   // 5 重
    pStack[9].xz = pModPolar(pStack[9].xz, 6.0);   // 6 重
    ...
}
```

**這是由 [sdf-gen-unity](https://github.com/mmerchante/sdf-gen-unity) 工具自動生成的 SDF。** 核心結構：

1. **45 個 4×4 變換矩陣** `tr[45]`：預計算的旋轉/平移/縮放矩陣
2. **堆疊式 CSG**：使用 `stack[]` 和 `pStack[]` 陣列模擬遞迴的 CSG 樹
3. **多層極座標重複**：`pModPolar` 以 8、10、5、6 次重複建立多面體幾何
4. **CSG 操作**：
   - `min(a, b)`：聯集（union）
   - `max(a, b)`：交集（intersection）
   - `max(-a, b)`：差集（subtraction）
   - `frPlane(p)`：平面切割
5. **最終兩個半空間切割**：`dot(p - offset, normal)` 在頂部和底部削去多餘部分

**幾何結構解析：**

| 層級 | 極座標重複 | 操作 | 說明 |
|------|-----------|------|------|
| stack[2] | 8 重 | Box + 4 plane cuts | 8 面主體結構 |
| stack[4] | — | Box差集 + 8 plane cuts | 底部挖空細節 |
| stack[7] | 10 重 | Box + 4 plane cuts | 10 面裝飾環 |
| stack[8] | 5 重 | Box + 5 plane cuts | 5 面裝飾層 |
| stack[9] | 6 重 | Box + 4 plane cuts | 6 面裝飾層 |
| stack[11] | — | Box + 4 plane cuts | 額外細節 |

最終用 `min` 將所有層合併，再用兩個半空間截斷上下。

### 2.2 法線估算 `sdfNormal`

```glsl
vec3 sdfNormal(vec3 p, float epsilon) {
    vec3 eps = vec3(epsilon, -epsilon, 0.0);
    float dX = sdf_simple(p + eps.xzz) - sdf_simple(p + eps.yzz);
    float dY = sdf_simple(p + eps.zxz) - sdf_simple(p + eps.zyz);
    float dZ = sdf_simple(p + eps.zzx) - sdf_simple(p + eps.zzy);
    return normalize(vec3(dX, dY, dZ));
}
```

標準的**中心差分法線估算**，每軸取 ±epsilon 兩點的 SDF 差值作為梯度。需要 6 次 `sdf_simple` 呼叫。

### 2.3 相機系統 `GetCamera`

```glsl
Camera GetCamera(vec2 uv, float zoom) {
    float dist = 7.0 / zoom;                    // zoom=0.45 → dist≈15.6
    float time = 2.9 + sin(iTime) * .1;         // 微幅擺動的環繞角度
    vec3 target = vec3(0.0, 4.45 + sin(iTime * 2.0) * .25, 0.0);  // 目標點微幅上下
    vec3 p = vec3(0.0, 10.5, 0.0) + vec3(cos(time), 0.0, sin(time)) * dist;
    ...
}
```

- 相機位於高處（Y=10.5）俯視水晶
- 以 `sin(iTime)` 微幅左右擺動（≈±0.1 弧度）
- 目標點在 Y=4.45 附近微幅上下浮動
- **實際效果**：相機幾乎靜止，只有輕微的呼吸感擺動

### 2.4 `density` — 內部火焰密度函數

```glsl
float density(vec3 p) {
    p -= vec3(-2.35, 2.5, 0.0);    // 偏移到水晶內部
    pR(p.xz, iTime * .3);          // 繞 Y 軸旋轉

    vec3 pp = p;
    p *= .3;                        // 縮小到碎形空間

    pR(p.yz, iTime * .5);          // 額外旋轉

    // 碎形迭代（4次）
    for (int i = 0; i < 4; ++i) {
        p = .7 * abs(p) / dot(p,p) - .95;
        p.yz = csqr(p.yz);         // 複數平方
        p = p.zxy;                  // 軸交換
    }

    p = pp + p * .5;                // 混合原始座標與碎形結果
    ...
}
```

**碎形變形的關鍵：**

來自 [guil 的混合碎形](https://www.shadertoy.com/view/MtX3Ws)。這個碎形迭代做了三件事：
1. `abs(p) / dot(p,p)`：球面反演（inversion）+ 折疊
2. `csqr(p.yz)`：複數平方 `(a+bi)² = a²-b² + 2abi`，產生對稱的旋渦
3. `p.zxy`：軸交換，避免碎形在單一平面上重複

碎形結果用來**扭曲後續的平面切割**：

```glsl
for(int i = 0; i < 3; ++i) {
    p.yxz = clamp(p, -1.0, 1.0) * 2.0 - p;  // 折疊（box folding）
    vec3 axis = normalize(vec3(random(seed), ...));
    float proj = dot(p - offset, axis);
    d += smoothstep(.1, .0, abs(proj));        // 接近平面時密度增加
}
```

- **Box Folding**：`clamp * 2 - p` 將空間折疊到 [-1,1] 立方體內
- **隨機平面偵測**：沿隨機軸方向的平面，靠近平面時密度增加
- 碎形變形使得這些平面不再是平的，而是扭曲成複雜的碎裂圖案

**密度調製：**

```glsl
d = d * smoothstep(1.5, -1.5, length(p0) - 2.5 - sin(iTime)*.35 + ...);
d *= sin(p0.y * 2.0 + p.y * 4.0 + iTime) * .25 + 1.0;
d += smoothstep(1.5, -1.5, length(p0) - 2.5) * .4;
return d * d;
```

1. 第一個 `smoothstep`：距離衰減，讓密度集中在水晶中心附近（半徑≈2.5），且半徑隨時間脈動
2. `sin` 調製：增加垂直方向的波紋
3. 額外的基礎密度：確保中心區域總有一定亮度
4. `d * d`：平方使得亮區更亮、暗區更暗，增強對比

### 2.5 Raymarching 主函數

```glsl
Intersection Raymarch(Camera camera) {
    // 第一階段：表面 Raymarching
    for(int j = 0; j < MAX_STEPS; ++j) {
        vec3 p = camera.origin + camera.direction * outData.totalDistance;
        outData.sdf = sdf_simple(p);
        outData.totalDistance += outData.sdf;
        if(outData.sdf < EPSILON || outData.totalDistance > MAX_DISTANCE) break;
    }

    // 第二階段：內部介質取樣
    if(outData.sdf < EPSILON) {
        vec3 hitPosition = ...;
        vec3 normal = sdfNormal(hitPosition, .1);
        vec3 refr = refract(camera.direction, normal, .35);  // IOR 0.35

        for(int i = 0; i < 25; ++i) {
            vec3 p = hitPosition + refr * t;
            if(sdf_simple(p) > EPSILON) break;  // 離開水晶
            d += density(p);
            t += FIXED_STEP_SIZE;
        }
    }
}
```

**兩階段 Raymarching：**

1. **表面階段**：標準 sphere tracing，找到光線與水晶表面的交點
2. **內部階段**：從交點開始，沿**折射方向**以固定步長前進，累積密度值
   - `refract(..., .35)`：折射率 0.35（遠低於真實水晶≈1.5，產生極端折射效果）
   - 最多 25 步 × 0.05 步長 = 1.25 單位的內部深度
   - 遇到 SDF > EPSILON（穿出水晶）時停止

### 2.6 輸出格式

```glsl
fragColor = vec4(isect.totalDistance, isect.materialID, isect.density, isect.mediumDistance);
```

- `.x`：到表面的距離
- `.y`：材質 ID（1 = 水晶）
- `.z`：內部累積密度
- `.w`：內部介質穿越距離

---

## 三、Buffer B：外部介質 + 法線

### 3.1 `sdf_generated` — 外部裝飾 SDF

```glsl
float sdf_generated(vec3 p) {
    // 球體
    stack[0] = length(wsPos) - .5;
    // 13 重極座標重複的 Box
    pStack[1].xz = pModPolar(pStack[1].xz, 13.0);
    stack[1] = fBox(wsPos);
    stack[0] = min(stack[0], stack[1]);
    // 小球體
    stack[0] = min(stack[0], length(wsPos) - .05);
    return stack[0];
}
```

另一個自動生成的 SDF，定義了水晶**外部**的裝飾結構（13 重對稱的光柱/粒子效果的基礎形狀）。

### 3.2 `outerDensity` — 外部霧效密度

```glsl
float outerDensity(vec3 p) {
    float d = 0.0;
    for(int i = 0; i < 5; ++i)
        d += smoothstep(-1.5, 1.5, sdf_generated(p + vec3(0.0, -5.0 + float(i) * 3.5, 0.0))) * .05;
    p.y -= 4.5;
    d *= smoothstep(10.0, -10.0, length(p) - 17.0);
    return d;
}
```

- 沿 Y 軸在 5 個高度取樣 `sdf_generated`，用 `smoothstep` 轉為密度
- 乘以距離衰減（半徑≈17 的大球範圍內）
- 產生水晶周圍的淡淡霧效/光暈

### 3.3 `RaymarchMedium` — 外部介質 Raymarching

```glsl
float RaymarchMedium(Camera camera, float surfaceDistance) {
    float d = 0.0;
    for(int j = 0; j < 25; ++j) {
        float dist = 14.0 + float(j) * .5;
        d += outerDensity(camera.origin + camera.direction * dist);
    }
    return d;
}
```

從距離 14.0 開始，每 0.5 步取樣一次外部密度，共 25 步。

### 3.4 輸出格式

```glsl
fragColor = vec4(saturate(log(density * .25)), sdfNormal(p, EPSILON_NORMAL));
```

- `.x`：外部密度的對數值（壓縮動態範圍）
- `.yzw`：表面法線向量

---

## 四、Image：最終渲染

### 4.1 `triplanar` — 三平面紋理映射

```glsl
vec3 triplanar(vec3 P, vec3 N) {
    vec3 Nb = abs(N);
    Nb /= (Nb.x + Nb.y + Nb.z);     // 正規化權重
    vec3 c0 = textureLod(iChannel1, P.xy, 3.0).rgb * Nb.z;
    vec3 c1 = textureLod(iChannel1, P.yz, 3.0).rgb * Nb.x;
    vec3 c2 = textureLod(iChannel1, P.xz, 3.0).rgb * Nb.y;
    return c0 + c1 + c2;
}
```

用表面法線決定三個投影方向的混合權重，將紋理（`iChannel1 = texture001.jpg`）映射到水晶表面，避免 UV 接縫。`textureLod(..., 3.0)` 使用第 3 級 mipmap，故意模糊以產生柔和的紋理效果。

### 4.2 `curv` — 曲率估算

```glsl
float curv(in vec3 p, in float w) {
    vec2 e = vec2(-1., 1.) * w;
    float t1 = sdf_simple(p + e.yxx), t2 = sdf_simple(p + e.xxy);
    float t3 = sdf_simple(p + e.xyx), t4 = sdf_simple(p + e.yyy);
    return .25/e.y * (t1 + t2 + t3 + t4 - 4.0 * sdf_simple(p));
}
```

**拉普拉斯曲率估算**：在四面體的四個頂點取樣 SDF，與中心點的差值近似拉普拉斯算子。
- 曲率高的區域（邊緣、角落）返回較大的值
- 用於增強邊緣細節和影響光照

### 4.3 `Render` — 光照計算

```glsl
vec3 Render(Camera camera, Intersection isect, vec2 uv, vec3 normal) {
    vec3 p = camera.origin + camera.direction * isect.totalDistance;

    if(isect.materialID > 0) {
        // 光源在相機左下方
        vec3 lPos = camera.origin - camera.left * 6.0 - camera.up * 15.0;
        vec3 toLight = normalize(lPos - p);

        // 假 AO
        float fakeAO = saturate(sdf_simple(p - camera.direction) + sdf_simple(p + normal * .25) / .5);

        // 紋理 + 曲率
        vec3 tx = triplanar(p * .6 - p.zzz * .3, normal);
        tx.r = gain(tx.r, 5.0);                        // gain 增強對比
        float cWidth = mix(.2, .9, saturate(p.y * .125 - .3) * tx.r);
        float c = saturate(curv(p, cWidth));

        // 法線擾動
        normal = normalize(normal - vec3(c * .5) + (tx * .25 - .1));

        // Rim light + Specular
        float rim = pow(smoothstep(0., 1., 1. - dot(normal, -camera.direction)), 7.0);
        vec3 H = normalize(toLight - camera.direction);
        float specular = pow(max(0., dot(H, normal)), 15.0 + tx.r * 7.0);

        // 內部 Glow（核心視覺效果）
        vec3 glow = mix(vec3(2.5, .15, .15), vec3(1.7, .65, .15), isect.density * .05)
                     * isect.density * .04;
        glow *= smoothstep(.5, 1.0, c) * 1.5 + 1.0;
        glow *= 1.0 + pow(exp(-isect.mediumDistance), 2.0) * 4.0;  // 假透射
        glow *= gain(fakeAO, 5.0) * tx.r * saturate((.25 - c) / .25);

        // 漫反射（很暗）
        float diffuse = dot(normal, toLight) * (c * .65 + .01) * tx.r;

        vec3 outColor = lightColor * diffuse * fakeAO;
        outColor += lightColor * (specular * fakeAO * 2.0 + rim * rim * .1);
        return outColor + glow;
    }

    // 背景：帶暈影的深藍色
    float vignette = 1.0 - pow(length(uv + hash31(p) * .2) / 2., 2.0);
    return vec3(.15, .175, .25) * vignette * vignette * .25;
}
```

**光照模型分層：**

| 層 | 效果 | 說明 |
|---|------|------|
| Diffuse | 漫反射 | 非常暗（`c * .65 + .01`），水晶表面幾乎不反光 |
| Specular | 高光 | Blinn-Phong，指數 15~22 |
| Rim | 邊緣光 | 7 次方的邊緣高光，強調輪廓 |
| Glow | 內部火焰 | **主要視覺元素**，顏色從紅到橙 |
| Fake AO | 假環境遮蔽 | 用 SDF 取樣近似 AO |
| Texture | 三平面紋理 | 增加表面細節 |
| Curvature | 曲率調製 | 邊緣處增強 glow，平面處抑制 |

**Glow 顏色邏輯：**
- `density` 低 → `vec3(2.5, .15, .15)` 深紅色
- `density` 高 → `vec3(1.7, .65, .15)` 橙色
- 整體乘以 `density * 0.04`：密度越高越亮
- `exp(-mediumDistance)`：介質穿越距離短（水晶薄處）時更亮——假透射效果
- 曲率 `smoothstep(.5, 1.)` 使邊緣處 glow 更強

### 4.4 後處理 Glow

```glsl
uv.y += .45;
uv.x -= .1;
uv.y += sin(iTime * 2.0) * .035;

vec3 glowColor = vec3(1.3, .7, .15);
uv *= .5;
vec3 fx = glowColor * pow(saturate(1.0 - length(uv * vec2(.75, .9))), 2.0);
fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.5, 1.0))), 2.0);
fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.25, 7.0))), 2.0) * .25;
fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.1, 7.0))), 2.0) * .15;
```

**螢幕空間 Glow 光暈：** 在水晶中心位置疊加 4 層不同形狀的光暈：

| 層 | 形狀 | 效果 |
|---|------|------|
| 1 | 略橢圓 (0.75, 0.9) | 大範圍柔和光暈 |
| 2 | 較圓 (0.5, 1.0) | 中等範圍 |
| 3 | 垂直窄條 (0.25, 7.0) | 垂直光柱 |
| 4 | 更窄垂直條 (0.1, 7.0) | 細光柱 |

- `pow(..., 2.0)`：二次方衰減
- 乘以 `fx * fx * fx`（三次方）再乘以紋理亮度 `intensity`，使光暈只在亮處出現
- `sin(iTime * 2.0) * .035`：光暈隨相機的微幅上下擺動同步移動

```glsl
float intensity = pow(texture(iChannel1, vec2(iTime * .03)).r, 4.0);
color += fx * fx * fx * intensity * .05;
color *= 1.0 + rand(uv) * .1;  // 膠片顆粒感
```

- 紋理驅動的亮度脈動
- 最後加一點隨機噪點模擬膠片顆粒

---

## 五、整體數據流

```
┌─────────────────────────────────────────────────────┐
│                    共用定義                           │
│  SDF工具, pModPolar, Camera, hash, random           │
└────────┬────────────────────┬───────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐    ┌──────────────────┐
│    Buffer A      │    │    Buffer B      │
│  表面 Raymarching │    │  外部介質密度     │
│  + 內部密度取樣   │    │  + 法線估算       │
│                  │    │                  │
│ .x = 表面距離    │    │ .x = 外部密度    │
│ .y = 材質 ID     │    │ .yzw = 法線      │
│ .z = 內部密度    │    │                  │
│ .w = 介質穿越距離 │    │                  │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
            ┌──────────────────┐
            │     Image        │
            │  光照 + 材質     │
            │  Glow + 後處理   │
            │  最終輸出         │
            └──────────────────┘
```

---

## 六、關鍵技術總結

### 水晶建模
- **自動生成的 CSG SDF**（sdf-gen-unity 工具）
- **多層 pModPolar** 實現多面體對稱（8、10、5、6 重）
- **平面切割** `frPlane` + `max` 操作削切形狀
- **半空間裁剪**最終修整頂部和底部

### 內部火焰效果
- **碎形變形**（球面反演 + 複數平方 + 軸交換）扭曲空間
- **隨機平面偵測** + **Box Folding** 產生碎裂紋理
- **折射光線取樣**：沿折射方向固定步長累積密度
- 折射率 0.35（極端值）產生強烈的內部扭曲

### 渲染
- **多層光照模型**：Diffuse + Specular + Rim + 內部 Glow
- **三平面紋理映射** + **拉普拉斯曲率**增強表面細節
- **螢幕空間多層光暈**模擬 Bloom 效果
- **假透射效果**：`exp(-mediumDistance)` 使薄處更亮

### 優點
- 非常精緻的視覺效果，水晶有真實的深度感
- 內部火焰碎形圖案豐富、動態
- 多層光暈產生強烈的能量感
- 外部霧效增加大氣感

### 限制
- `sdf_simple` 需要 45 個矩陣變換，編譯時間長
- 法線估算需要 6 次 SDF 呼叫，加上內部 25 步取樣，效能開銷大
- 水晶形狀不可動態改變（預計算矩陣）
- 碎形參數（4 次迭代、固定常數）不易調整

### 可借鑑的技術
1. **pModPolar 多面體建模**：用極座標重複構建水晶面
2. **碎形密度場**：球面反演 + 複數平方產生自然的碎裂圖案
3. **折射內部取樣**：沿折射方向累積密度模擬半透明材質
4. **拉普拉斯曲率估算**：增強邊緣視覺效果
5. **多層螢幕空間光暈**：不同寬高比的橢圓疊加模擬 Bloom
6. **假透射** `exp(-distance)`：簡單有效的次表面散射近似
