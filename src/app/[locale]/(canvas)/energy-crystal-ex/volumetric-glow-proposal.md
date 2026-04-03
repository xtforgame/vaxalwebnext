# 體積碎形發光提案 — Volumetric Fractal Glow

## 問題
目前 EnergyCrystalMaterial 的內部發光是 UV 空間的徑向漸層 (`smoothstep(radius, ..., distFromCenter)`)。
這本質上是「貼在表面的圓形光暈」，沒有深度，沒有結構紋理。

## 參考範例分析

### energy-crystal1 (Shadertoy XtSfDD)
- 3-buffer 架構：Buffer A (表面 SDF + 內部密度)、Buffer B (外部介質 + 法線)、Image (合成)
- 45 個預計算矩陣做 CSG 水晶 SDF
- **碎形密度場**：sphere inversion `abs(p)/dot(p,p)` + complex square `csqr(p.yz)` + 軸旋轉，3 次迭代
- **內部取樣**：折射進入 (IOR 0.35)，25 步固定步進累積密度
- **曲率調製**：Laplacian curvature 讓稜角更亮
- **螢幕空間光暈**：4 層橢圓 + 垂直光柱
- 有機岩石紋理的 triplanar 貼圖

### energy-crystal2 (Shadertoy llSBRD)
- 單 pass 架構
- 18 個半空間交集產生程式化水晶形狀
- **碎形密度場**：6 次 box-folding 迭代（比 crystal1 的 3 次更多）
- **內部取樣**：折射 (IOR 0.9)，50 步固定步進
- **假透射**：`exp(-mediumDistance)` 讓薄處更亮
- 冷藍/暖橙對比

### 兩者共同的關鍵技術（讓光有「實體感」的原因）
1. **沿折射光線步進體積取樣** — 不是表面 UV 映射
2. **碎形密度場** — sphere inversion / box folding 產生天然晶體裂紋紋理
3. **累積衰減** — 密度沿路徑指數衰減 (`exp(-step * absorption)`)
4. **曲率 / 厚度調製** — 薄處更亮，稜角處更亮

---

## 第一版嘗試：體積 Ray March（失敗）

### 方法
在 fragment shader 中沿折射方向步進 8 步，每步取 sphere inversion 碎形密度：

```glsl
float fractalDensity(vec3 p) {
    vec3 z = p;
    for (int i = 0; i < 3; i++) {
        z = abs(z) / dot(z, z);  // sphere inversion
        z -= vec3(0.8, 0.4, 0.6);
        density += length(z);
    }
}
```

沿折射方向步進：
```glsl
vec3 refractDir = refract(-V, N, 1.0 / uIor);
for (int i = 0; i < 8; i++) {
    samplePos += refractDir * 0.06;
    accDensity += fractalDensity(samplePos * 3.0 + time * 0.08);
}
```

### 問題
1. **Sphere inversion 在原點有奇異點** — `abs(z)/dot(z,z)` 在 z→0 時趨近無限大，造成中心一個刺眼亮斑
2. **球形距離遮罩 (`length(samplePos)`)** — 在矩形面板上產生圓形光暈，不跟隨面板形狀
3. **薄面板做 ray march 無意義** — 面板只有 0.2 厚，折射光線 8 步 × 0.06 = 0.48 距離瞬間穿越，所有取樣點擠在一小塊區域

### 結果
中心一個明顯的黃色圓斑，完全沒有紋理感，反而比原本的漸層更突兀。

---

## 第二版實作：多層視差碎形（當前版本 ✅）

### 核心思路轉變
對 0.2 厚的薄面板，真正的體積 ray march 沒有意義。改用 **多層視差取樣 (parallax layers)** — 在面板的 XY 平面上取樣碎形紋理，用多層不同深度 + 視角偏移來模擬體積感。

### 碎形函數：Box-folding（取代 sphere inversion）

```glsl
float fractalDensity(vec2 p, float time) {
    vec2 z = p;
    float density = 0.0;
    for (int i = 0; i < 4; i++) {
        // Box fold: 反射到 [-1,1] 再反轉
        z = abs(mod(z, 4.0) - 2.0);
        // 縮放 + 偏移建構複雜度
        z = z * 1.8 - vec2(1.2, 0.9);
        // 緩慢時間漂移
        z += vec2(sin(time * 0.12 + float(i)),
                  cos(time * 0.09 + float(i) * 1.3)) * 0.3;
        // 用 exp 軟化取樣，避免硬邊
        density += exp(-1.5 * length(z));
    }
    return density / 4.0;
}
```

**為什麼 box-folding 比 sphere inversion 好：**
- 沒有原點奇異點 — `mod` 和 `abs` 在任何座標都穩定
- 自然產生脈絡狀/葉脈狀紋理（不是中心爆炸的圖案）
- 2D 計算比 3D sphere inversion 更便宜
- 時間漂移讓紋理像在「流動」

### 多層視差取樣

```glsl
float sampleCrystalEnergy(vec3 localPos, vec3 V, vec3 N, float time, float chargeLevel) {
    // 1. 正規化到面板範圍 [-1, 1]
    vec2 panelUV = localPos.xy / vec2(2.1, 2.8);

    // 2. 視差偏移 — 旋轉時內部紋理有深度位移
    vec3 viewLocal = normalize(V);
    vec2 parallax = viewLocal.xy / max(abs(viewLocal.z), 0.3) * 0.15;

    // 3. 矩形距離遮罩（非圓形！）
    float boxDist = max(abs(panelUV.x), abs(panelUV.y));
    float energyRadius = chargeLevel * 1.3;
    float expansionMask = smoothstep(energyRadius, max(energyRadius - 0.4, 0.0), boxDist);

    // 4. 四層取樣，每層不同深度 + 縮放
    float accDensity = 0.0;
    for (int i = 0; i < 4; i++) {
        float depth = float(i) / 3.0;
        vec2 offset = parallax * depth;
        vec2 sampleUV = panelUV + offset;
        float scale = 1.5 + float(i) * 0.8;
        float d = fractalDensity(sampleUV * scale, time + float(i) * 2.0);
        float layerWeight = 1.0 - depth * 0.3;
        accDensity += d * layerWeight;
    }

    return (accDensity / 4.0) * expansionMask;
}
```

**設計要點：**
- `panelUV = localPos.xy / vec2(2.1, 2.8)` — 面板寬 4.2 高 5.6，半寬半高做正規化，紋理填滿整個面板
- `parallax` — 視角偏移，從側面看時內部紋理會平移，產生「看進去」的錯覺
- `boxDist` — 矩形距離代替 `length()`，充能擴張順著矩形邊界而非圓形
- 4 層不同 `scale` — 大脈絡 + 小細節疊加，模擬多深度的碎形結構
- `layerWeight = 1.0 - depth * 0.3` — 深層稍弱，產生前後層次感

### 能量合成（main 函數中）

```glsl
// 呼吸脈動
float pulse = sin(uTime * 3.0) * 0.12 + 0.88;
float fastPulse = sin(uTime * 7.0) * 0.04;

// 碎形密度驅動 emissive
vec3 emissive = uEnergyColor * volumetricDensity * uChargeLevel * pulse * 2.0;

// 邊緣溢光
float chargedEdgeGlow = pow(1.0 - NdotV, 2.5) * uChargeLevel * 0.6;
emissive += uEnergyColor * chargedEdgeGlow * (pulse + fastPulse);

// 假透射 — 薄視角更亮
float transmission = exp(-pathLength * dynamicAbsorption * 0.5);
emissive *= mix(0.5, 1.2, transmission);

// 高充能時整體微光
float bodyGlow = uChargeLevel * uChargeLevel * 0.1;
emissive += uEnergyColor * bodyGlow * pulse;
```

### Vertex Shader 新增

```glsl
varying vec3 vLocalPosition;
vLocalPosition = position; // 物件空間座標，供碎形取樣使用
```

### 效能
- 4 層 × 4 迭代碎形 = ~16 次 box-fold 運算/fragment
- 比第一版 (8 步 × 3 迭代 = 24 次 sphere inversion) 更便宜
- 全是 2D 運算，比 3D 更快
- 手機上可降到 2~3 層

### 效果
- 充能時光沿脈絡狀碎形紋理分佈，不再是均勻漸層
- 旋轉面板時內部紋理隨視角平移（視差效果）
- 紋理緩慢漂移流動（時間項）
- 充能擴張順著矩形邊界
- 保留邊緣溢光、呼吸脈動、假透射
