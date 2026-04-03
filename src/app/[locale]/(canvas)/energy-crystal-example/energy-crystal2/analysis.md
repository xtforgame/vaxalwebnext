# Energy Crystal 2 分析

> 來源: https://www.shadertoy.com/view/llSBRD

## 概覽

這是一個 **單一 pass** 的 Shadertoy shader（只有 `image.shader`），在一個 shader 中完成水晶建模、Raymarching、內部介質取樣、光照和後處理。與 Crystal 1 的自動生成 SDF 不同，這裡的水晶形狀是**程序化生成**的——由隨機平面切割構建。

整體流程：**隨機平面切割建模 → 表面 Raymarching → 折射內部取樣 → 碎形密度累積 → Cubemap 反射 + Glow 合成**

---

## 一、水晶形狀 `sdf_simple`

### 1.1 核心算法

```glsl
float sdf_simple(vec3 p) {
    float d = 0.0;
    uint seed = uint(14041956 + int(iTime * .5));

    float sides = 6.0;
    float sideAmpl = PI * 2.0 / sides;

    // 側面平面
    for(float i = 0.0; i < sides; i++) {
        float angle = mix(i, i+1.0, random(seed)) * sideAmpl;
        vec3 offset = vec3(cos(angle), 0.0, sin(angle));
        vec3 axis = normalize(offset);
        offset = offset * CRYSTAL_SCALE / CRYSTAL_VERTICAL_ANISOTROPY;
        d = max(d, dot(p - offset, axis));
    }

    vec3 offset = vec3(0.0, 2.0, 0.0);

    // 頂部/底部蓋面
    for(float i = 0.0; i < sides; i++) {
        float angle = mix(i, i+1.0, random(seed)) * sideAmpl;
        vec3 axis = normalize(vec3(cos(angle), .5 + random(seed), sin(angle)));
        d = max(d, dot(p - offset * CRYSTAL_SCALE * CRYSTAL_VERTICAL_ANISOTROPY, axis));    // 頂蓋
        d = max(d, dot(p + offset * CRYSTAL_SCALE * CRYSTAL_VERTICAL_ANISOTROPY, -axis));   // 底蓋
    }

    return d;
}
```

**這是完全程序化的水晶建模，核心思想是「多面體 = 多個半空間的交集」。**

### 1.2 側面平面（6 面）

```
for each side i:
    angle = mix(i, i+1, random) × (2π/6)    // 隨機偏移的角度
    axis = normalize(cos(angle), 0, sin(angle))  // 水平方向的法線
    d = max(d, dot(p - offset, axis))        // 半空間交集
```

- 6 個均勻分佈的角度，每個加上隨機偏移 → 不完美的六角形
- `max` 操作 = 交集：每個半空間削去一面，6 次交集形成六角柱
- `CRYSTAL_VERTICAL_ANISOTROPY = 1.3`：Y 軸拉伸，使水晶偏細長
- `random(seed)` 使用 `iTime * 0.5` 作為種子基礎 → **每 2 秒水晶形狀會變化**

### 1.3 蓋面平面（上下各 6 面）

```
axis = normalize(cos(angle), 0.5 + random, sin(angle))
```

- 法線帶有 Y 分量（0.5 + random），形成斜面
- 上蓋：`dot(p - (0, 2*scale, 0), axis)` → 頂部斜面切割
- 下蓋：`dot(p + (0, 2*scale, 0), -axis)` → 底部對稱斜面
- **6 個隨機角度的斜面 = 不規則的水晶尖頂**

### 1.4 與 Crystal 1 的對比

| 特性 | Crystal 1 | Crystal 2 |
|------|-----------|-----------|
| SDF 來源 | sdf-gen-unity 工具生成 | 程序化生成 |
| 變換矩陣 | 45 個預計算 mat4 | 無 |
| 對稱性 | 多層 pModPolar | 6 面隨機偏移 |
| 動態性 | 靜態形狀 | 每 2 秒形變 |
| 複雜度 | 高（多層 CSG） | 低（18 個半空間交集） |
| 編譯速度 | 慢 | 快 |

---

## 二、內部密度 `density`

```glsl
float density(vec3 p) {
    vec3 p0 = p;
    vec3 pp = p + mod(iTime, 2.0) * .35;  // 時間偏移
    p *= .3;

    // 碎形迭代（同 Crystal 1）
    for (int i = 0; i < 4; ++i) {
        p = .7 * abs(p) / dot(p,p) - .95;
        p.yz = csqr(p.yz);
        p = p.zxy;
    }

    p = pp + p * .5;

    float d = 0.0;
    uint seed = uint(14041956 + int(iTime * .5));

    // 折疊 + 隨機平面偵測（6 次，比 Crystal 1 的 3 次多）
    for(int i = 0; i < 6; ++i) {
        p.yxz = clamp(p, -1.0, 1.0) * 2.0 - p;
        vec3 axis = normalize(vec3(random(seed), random(seed) * 2.0, random(seed)) * 2.0 - vec3(1.0));
        vec3 offset = vec3(0.0, random(seed) * 2.0 - 1.0, 0.0);
        float proj = dot(p - offset, axis);
        d += smoothstep(.1, .0, abs(proj));
    }

    d = d * .5 + saturate(1.0 - length(p0 * (1.0 + sin(iTime * 2.0) * .5))) * (.75 + d * .25);
    return d * d + .05;
}
```

**與 Crystal 1 的差異：**

| 差異 | Crystal 1 | Crystal 2 |
|------|-----------|-----------|
| 時間偏移 | `iTime * .3` 旋轉 | `mod(iTime, 2) * .35` 平移 |
| 平面偵測 | 3 次 | **6 次**（更密集的碎裂） |
| 隨機種子 | 固定 `14041956` | `14041956 + int(iTime * .5)` |
| 衰減方式 | `smoothstep(1.5, -1.5, ...)` | `saturate(1 - length(...))` |
| 基礎密度 | 獨立加法項 | 混合項 `.75 + d * .25` |
| 最終值 | `d * d` | `d * d + .05`（+基礎亮度） |

**`seed` 隨時間變化**意味著碎裂圖案每 2 秒會改變，與水晶形狀變化同步。

---

## 三、曲率與法線修改

### 3.1 `curv_modifier` 和 `sdf_modifier`

```glsl
float curv_modifier(in vec3 p, in float w) {
    // 拉普拉斯曲率估算（同 Crystal 1 的 curv）
    ...
}

float sdf_modifier(vec3 p) {
    return 0.0;  // 目前停用
    // return -curv_modifier(p, .15) * .1;  // 被註解掉
}

float sdf_complex(vec3 p) {
    return sdf_simple(p) + sdf_modifier(p);
}
```

`#define NORMAL_CURVATURE_BASIC` 啟用了基礎曲率模式。`sdf_modifier` 被停用（return 0），但 `sdf_complex` 仍用於法線計算，使得法線可以受曲率影響而不改變實際幾何形狀。

### 3.2 `curv` — 渲染用曲率

```glsl
float curv(in vec3 p, in float w) {
    vec2 e = vec2(-1., 1.) * w;
    float t1 = sdf_simple(p + e.yxx), ...;
    return .25/e.y * (t1 + t2 + t3 + t4 - 4.0 * sdf_simple(p));
}
```

與 Crystal 1 相同的拉普拉斯曲率估算，用於渲染時的邊緣增強。

---

## 四、Raymarching

```glsl
Intersection Raymarch(Camera camera) {
    // 表面 Raymarching
    for(int j = 0; j < MAX_STEPS; ++j) {  // MAX_STEPS = 50（比 Crystal 1 多）
        outData.sdf = sdf_simple(p) * .9;  // × 0.9 保守步進
        ...
    }

    // 內部介質
    if(outData.sdf < EPSILON) {
        vec3 normal = sdfNormal(hitPosition, 1.0);      // epsilon=1.0（很粗糙）
        vec3 refr = refract(camera.direction, normal, .9);  // IOR 0.9

        for(int i = 0; i < 50; ++i) {  // 50 步（Crystal 1 是 25）
            ...
        }
    }
}
```

**與 Crystal 1 的差異：**

| 參數 | Crystal 1 | Crystal 2 |
|------|-----------|-----------|
| MAX_STEPS | 30 | **50** |
| MIN_DISTANCE | 15.0 | **0.5** |
| SDF 步進倍率 | 1.0 | **0.9**（更保守） |
| 折射率 | 0.35 | **0.9** |
| 法線 epsilon | 0.1 | **1.0** |
| 內部步數 | 25 | **50** |

- `MIN_DISTANCE = 0.5`：相機離水晶很近
- `refract(.9)`：接近空氣/玻璃界面，折射不那麼極端
- 內部 50 步：更深入的內部取樣，密度累積更多
- 法線 epsilon 1.0：非常粗糙的法線，產生柔和的光照

---

## 五、相機系統

```glsl
Camera GetCamera(vec2 uv, float zoom) {
    float dist = 3.0 / zoom;                    // zoom=0.5 → dist=6.0
    float time = iTime;                          // 持續旋轉！
    vec3 target = vec3(0.0, sin(iTime * 2.0) * .25, 0.0);
    vec3 p = vec3(0.0, 1.5, 0.0) + vec3(cos(time), 0.0, sin(time)) * dist;
    ...
}
```

**與 Crystal 1 的關鍵差異：**

| 參數 | Crystal 1 | Crystal 2 |
|------|-----------|-----------|
| 相機高度 | 10.5（俯視） | **1.5**（平視） |
| 旋轉速度 | `2.9 + sin(t) * 0.1`（微擺） | **`iTime`**（持續繞圈） |
| 目標高度 | 4.45 | **0** |
| 距離 | ≈15.6 | **6.0** |

Crystal 2 的相機持續繞水晶旋轉，視角更近、更平，產生更沉浸的觀看體驗。

---

## 六、渲染 `Render`

```glsl
vec3 Render(Camera camera, Intersection isect, vec2 uv) {
    vec3 normal = sdfNormal(p, EPSILON_NORMAL);
    vec3 toLight = normalize(lPos - p);

    // 紋理 + 曲率
    vec3 tx = triplanar(p * .85 - p.zzz * .3, normal);
    float c = curv(p, .1 + tx.r * .85);
    normal = normalize(normal - vec3(c * .3) + (tx * .25 - .125));

    // Rim + Specular
    float rim = pow(smoothstep(0., 1., 1. - dot(normal, -camera.direction)), 7.0);
    vec3 H = normalize(toLight - camera.direction);
    float specular = pow(max(0., dot(H, normal)), tx.r * 5.0 + c * 25.0);

    // 反射（使用 Cubemap！）
    vec3 R = reflect(camera.direction, normal);
    vec3 refl = texture(iChannel0, R).rgb;

    // 內部 Glow
    vec3 glow = mix(vec3(1.0, .15, .15), vec3(1.0, .45, .15), isect.density * .05)
                 * isect.density * .04;
    glow *= smoothstep(.5, 1.0, c) * 1.5 + 1.0;
    glow *= 1.0 + pow(exp(-isect.mediumDistance), 2.0) * 4.0;

    return (refl + specular) * vec3(.15, .1, .1) * rim
           + rim * c * .15 * vec3(.1, .4, .8)
           + glow;
}
```

### 與 Crystal 1 的渲染差異

| 特性 | Crystal 1 | Crystal 2 |
|------|-----------|-----------|
| 漫反射 | 有（暗） | **無** |
| 反射 | 無 | **Cubemap 反射**（iChannel0） |
| 假 AO | `sdf_simple` 取樣 | **無** |
| Rim 光色 | 白色 | **藍色** `vec3(.1, .4, .8)` |
| Glow 顏色 | 紅→橙 | **紅→橙**（色調略不同） |
| 光源位置 | 相機左下方 | **相機左上方** |
| 背景色 | 深藍 `.15, .175, .25` | **深紫** `.15, .025, .1` |

**Crystal 2 的渲染更簡潔**：
- 沒有漫反射，主要依靠反射和 Glow
- Cubemap 反射增加了環境感（需要 `iChannel0` 綁定 Cubemap 紋理）
- Rim 光帶有藍色調，與紅橙 Glow 形成冷暖對比
- 整體更暗、更神秘

### Glow 顏色分析

```glsl
mix(vec3(1.0, .15, .15), vec3(1.0, .45, .15), density * .05)
```

- 密度低 → `(1.0, 0.15, 0.15)` 紅色
- 密度高 → `(1.0, 0.45, 0.15)` 橙紅色
- 比 Crystal 1 的顏色（2.5, 0.15, 0.15）更柔和，不會過曝

---

## 七、漸變色彩函數 `gradient`

```glsl
vec3 gradient(float factor) {
    vec3 a = vec3(0.478, 0.4500, 0.500);
    vec3 b = vec3(0.500);
    vec3 c = vec3(0.1688, 0.748, 0.1748);
    vec3 d = vec3(0.1318, 0.388, 0.1908);
    return palette(factor, a, b, c, d);
}
```

使用 iq 的餘弦色板（cosine palette），但在目前的程式碼中**未被使用**——可能是保留給未來用途或被移除的功能。

---

## 八、後處理 Glow

```glsl
uv.y += sin(iTime * 2.0) * .1;
vec3 glowColor = vec3(1.0, .7, .15);
uv *= .7;

vec3 fx = glowColor * pow(saturate(1.0 - length(uv * vec2(.75, .9))), 2.0);
fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.5, 1.0))), 2.0);
fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.25, 7.0))), 2.0) * .25;
fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.1, 7.0))), 2.0) * .15;

float intensity = pow(texture(iChannel1, vec2(iTime * .03)).r, 2.0);
color += fx * fx * fx * intensity * .2;
```

與 Crystal 1 結構相同的 4 層光暈，差異在於：

| 參數 | Crystal 1 | Crystal 2 |
|------|-----------|-----------|
| UV 偏移 Y | +0.45 | 無固定偏移 |
| UV 擺動幅度 | 0.035 | **0.1** |
| UV 縮放 | 0.5 | **0.7**（光暈更大） |
| glowColor | (1.3, .7, .15) | **(1.0, .7, .15)** |
| intensity 指數 | 4.0 | **2.0**（脈動更平緩） |
| 混合強度 | 0.05 | **0.2**（光暈更明顯） |
| 膠片顆粒 | 有 | **無** |

---

## 九、輔助工具函數

### `gain` — 對比度增強

```glsl
float gain(float x, float k) {
    float a = 0.5*pow(2.0*((x<0.5)?x:1.0-x), k);
    return (x<0.5)?a:1.0-a;
}
```

S 曲線函數，`k > 1` 增加對比度，`k < 1` 減少對比度。在 Crystal 2 中未被使用。

### 距離函數（用於 Render）

- `fBox(p, b)`：可自訂尺寸的 Box SDF
- `fBox2Cheap(p, b)`：便宜的 2D Box（Chebyshev 距離）
- `fCapsule(p, r, c)`：膠囊體 SDF
- `sdTorus(p, t)` / `sdTorus82(p, t)`：圓環/超橢圓環 SDF
- `fOpIntersectionRound(a, b, r)`：圓角交集操作
- 旋轉函數：`rotateX/Y/Z`、`rotationAxisAngle`

這些工具函數大部分**在當前程式碼中未被直接使用**，是 SDF 建模的通用工具箱。

### `longTailImpulse` — 長尾脈衝

```glsl
float longTailImpulse(float k, float x, float c) {
    return mix(impulse(k, x), impulse(k, (x+1.0/k) * c), step(1.0/k, x));
}
```

在脈衝峰值之後接一個更平緩的衰減，用於動畫效果（目前未使用）。

---

## 十、整體架構

```
┌──────────────────────────────────────┐
│           image.shader                │
│  （單一 pass，全部在這裡完成）         │
│                                      │
│  ┌─────────────┐                     │
│  │ sdf_simple   │  6面側面 + 12面蓋面  │
│  │ 程序化水晶    │  = 18個半空間交集    │
│  └──────┬──────┘                     │
│         │                            │
│  ┌──────▼──────┐                     │
│  │ Raymarch     │  50步表面 + 50步內部  │
│  │ + refract    │  IOR = 0.9          │
│  └──────┬──────┘                     │
│         │                            │
│  ┌──────▼──────┐                     │
│  │ density      │  碎形4次 + 折疊6次   │
│  │ 碎形密度場    │                     │
│  └──────┬──────┘                     │
│         │                            │
│  ┌──────▼──────┐                     │
│  │ Render       │  Cubemap反射 + Rim   │
│  │ 光照合成      │  + Glow + 曲率      │
│  └──────┬──────┘                     │
│         │                            │
│  ┌──────▼──────┐                     │
│  │ 後處理        │  4層螢幕光暈         │
│  │ Screen Glow  │  + 紋理脈動          │
│  └──────────────┘                     │
└──────────────────────────────────────┘
```

---

## 十一、Crystal 1 vs Crystal 2 完整比較

| 特性 | Crystal 1 (XtSfDD) | Crystal 2 (llSBRD) |
|------|--------------------|--------------------|
| **架構** | 3 buffer（A + B + Image） | **單 pass** |
| **水晶建模** | 工具生成 CSG（45 矩陣） | **程序化半空間交集** |
| **動態形狀** | 靜態 | **每 2 秒形變** |
| **相機** | 俯視微擺 | **持續環繞** |
| **折射率** | 0.35（極端） | **0.9**（接近真實） |
| **內部步數** | 25 | **50** |
| **密度平面** | 3 個 | **6 個** |
| **外部霧效** | Buffer B 計算 | **無** |
| **反射** | 無 | **Cubemap** |
| **漫反射** | 有 | **無** |
| **假 AO** | 有 | **無** |
| **Rim 光色** | 白 | **藍** |
| **背景** | 深藍 | **深紫** |
| **光暈強度** | 柔和 | **較強** |
| **效能** | 較差（多 buffer + 45矩陣） | **較好**（單 pass） |
| **視覺風格** | 精緻、大氣 | **簡潔、動態** |

---

## 十二、總結

### 優點
- **單 pass 架構**：所有效果在一個 shader 中完成，無需多 buffer 同步
- **程序化水晶**：18 個半空間交集，簡潔且可動態變形
- **時間種子變化**：水晶形狀和內部碎裂每 2 秒自然過渡
- **Cubemap 反射**：增加環境感和真實感
- **冷暖色對比**：藍色 Rim 光 vs 紅橙 Glow

### 限制
- 單 pass 意味著所有計算（SDF 50步 + 內部 50步 + 法線 6次SDF）都在一個 fragment 中
- 沒有外部霧效，缺少 Crystal 1 的大氣感
- `sdf_simple` 每 2 秒的隨機種子跳變可能產生突兀的形狀轉換
- 依賴 Cubemap 紋理（`iChannel0`），沒有時背景會很暗

### 可借鑑的技術
1. **半空間交集建模**：`max(d, dot(p - offset, axis))` 疊加構建多面體，極其簡潔
2. **時間種子動態形變**：`int(iTime * .5)` 使形狀離散變化
3. **6 次平面折疊密度**：比 Crystal 1 更密集的碎裂圖案
4. **Cubemap 反射 + SDF Raymarching 結合**：`texture(iChannel0, reflect(...))`
5. **冷暖對比渲染**：藍 Rim + 橙 Glow 的配色方案
6. **程序化 vs 預計算的取捨**：更簡單的 SDF 換取動態性和可調性
