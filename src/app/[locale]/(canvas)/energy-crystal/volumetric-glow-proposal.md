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

## 實作方案：簡化體積碎形取樣

在現有 fragment shader 中，利用 `vWorldPosition` + view direction 做簡化體積取樣：

### 新增的 GLSL 代碼

```glsl
// ── 1. 碎形密度函數（模仿 crystal1 的 sphere inversion trick）──
float fractalDensity(vec3 p) {
    vec3 z = p;
    float density = 0.0;
    for (int i = 0; i < 3; i++) {
        // Sphere inversion: abs(p) / dot(p,p)
        z = abs(z) / dot(z, z);
        // Shift to avoid symmetry collapse
        z -= vec3(0.8, 0.4, 0.6);
        // Accumulate "trapped" orbit distance
        density += length(z);
    }
    return density / 3.0;
}

// ── 2. 體積取樣（沿折射方向步進 8 步）──
vec3 refractDir = refract(-V, N, 1.0 / uIor);
vec3 samplePos = vLocalPosition; // 物件空間位置
float stepSize = uThickness * 0.3;
float accDensity = 0.0;

for (int i = 0; i < 8; i++) {
    samplePos += refractDir * stepSize;
    // 時間偏移讓紋理隨時間流動
    float d = fractalDensity(samplePos * 3.0 + uTime * 0.05);
    // 指數衰減（越深越弱）
    float falloff = exp(-float(i) * 0.3);
    accDensity += d * falloff;
}
accDensity /= 8.0;

// ── 3. 用累積密度驅動 emissive ──
float energyIntensity = accDensity * uChargeLevel * pulse;
vec3 emissive = uEnergyColor * energyIntensity;

// ── 4. 保留邊緣發光 + 假透射效果 ──
float chargedEdgeGlow = pow(1.0 - NdotV, 2.5) * uChargeLevel * 0.8;
emissive += uEnergyColor * chargedEdgeGlow;

// 假透射：薄處更亮
float transmission = exp(-pathLength * dynamicAbsorption * 0.5);
emissive *= mix(0.5, 1.0, transmission);
```

### 需要新增的 varying
```glsl
// vertex shader:
varying vec3 vLocalPosition;
vLocalPosition = position; // 物件空間座標
```

### 效能評估
- 8 步 × 3 迭代碎形 = ~24 次運算/fragment
- 遠低於參考範例 (25~50 步)
- 手機上可降到 4~6 步
- 只在水晶 mesh 的 fragment 上執行，非全螢幕

### 預期效果
- 充能時光不再是均勻漸層，而是沿著碎形紋理分佈
- 旋轉水晶時內部紋理會隨視角變化（因為是沿折射方向取樣）
- 保留原有的呼吸脈動、邊緣發光、動態吸收
- 比純徑向漸層更有「光在晶體結構中流動」的感覺
