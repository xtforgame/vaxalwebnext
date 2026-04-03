# Shine 效果實作計畫

## 目標

在水晶充能時，從水晶面板向外射出自然漸弱的光芒效果。

## 方案：獨立 WebGL Overlay

使用一個獨立的 `<canvas>` + 原生 WebGL2 跑全屏 fragment shader，疊加在 R3F Canvas 上方。

**為什麼不用 Canvas 2D？**
- Canvas 2D 無法做 per-pixel simplex noise（只有線性 gradient 工具）
- 之前的 Canvas 2D 嘗試效果差，幾何感太重、缺乏有機的噪聲紋理

**為什麼不用 EffectComposer？**
- 已證實 EffectComposer 與 equirectangular 環境貼圖有 `bindTexture` 衝突
- 多次嘗試都導致 WebGL Context Lost 或 null 錯誤

**為什麼獨立 WebGL Canvas？**
- 完全獨立的 WebGL context，不影響 R3F
- 可以跑任意 GLSL shader（直接移植 Shadertoy 技術）
- `mix-blend-mode: screen` 與 R3F Canvas 疊加
- 開關只需 mount/unmount，不影響 3D 場景

## 核心技術（取自 shine 分析）

### 1. 雙重距離遮罩（Type 1-1）
```glsl
float m1 = clamp(.1 / smoothstep(.0, 1.75, l), 0., 1.);  // 外衰減
float m2 = clamp(.1 / smoothstep(.42, 0., l), 0., 1.);    // 內切除
```
產生環形亮度分佈——中心暗、環帶亮、邊緣漸弱。

### 2. 角度空間 Simplex Noise（Type 1-1 的 s3）
```glsl
float a = sin(atan(uv.y, uv.x));
float am = abs(a - .5) / 4.;
float s3 = simplex_noise(vec3(vec2(am, am*100. + iTime*3.)*.15, 30. + iTime*.525));
```
在角度方向產生密集的徑向條紋（光芒射線），隨時間快速旋轉閃爍。

### 3. 三層噪聲相乘（Type 1-1）
- s1：大尺度雲狀亮度（螢幕空間）
- s2：邊緣區域紋理（螢幕空間）
- s3：角度方向閃光條紋
- 三者相乘 → 稀疏、有機的閃光分佈

### 4. 適配調整
- **橢圓座標**：原版是圓形 `length(uv)`，我們需要用橢圓距離匹配面板的寬高比（4.2:5.6）
- **色彩**：原版用 cosine palette 彩虹色，改為暖琥珀色 `mix(vec3(1.0,0.6,0.1), vec3(1.0,0.85,0.5), ...)`
- **chargeLevel 控制**：用 uniform 控制整體強度和閃光範圍
- **Happy Star（選用）**：Type 2-2 的十字星芒可作為額外 multiply 層

## 實作步驟

### Step 1: ShineOverlay 組件

在 `EnergyCrystalViewer.tsx` 中新建 `ShineOverlay` 組件：

```tsx
function ShineOverlay({ chargeLevel, active }: { chargeLevel: number; active: boolean }) {
  // 1. useRef<HTMLCanvasElement>
  // 2. useEffect 初始化 WebGL2 context + compile shader
  // 3. requestAnimationFrame loop: 更新 uniforms (uTime, uChargeLevel) → drawArrays
  // 4. cleanup: delete program, lose context
  return <canvas style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', zIndex: 5 }} />;
}
```

### Step 2: Fragment Shader

完整的 GLSL fragment shader，包含：
- Simplex noise 函數（從 Type 1-1 移植）
- 雙重距離遮罩
- 三層噪聲取樣
- 橢圓座標適配
- chargeLevel uniform 控制
- 暖琥珀色著色

### Step 3: 整合

- 移除舊的 `LightRays`、`GodRaysSphere`、`BloomOverlay`、`RadialStreaksOverlay`
- 移除對應的 toggle buttons（Geometric Rays、God Rays、Bloom、Radial Streaks）
- 新增 ShineOverlay toggle
- ShineOverlay 放在 R3F Canvas 之上、controls 之下

### Step 4: 效果微調

- 調整噪聲參數讓閃光密度和長度符合面板尺寸
- 調整 chargeLevel 的 threshold（何時開始出現閃光）
- 調整色彩溫度和亮度

## 檔案修改

| 檔案 | 動作 |
|------|------|
| `energy-crystal-ex/EnergyCrystalViewer.tsx` | 移除舊效果，新增 ShineOverlay |
| `energy-crystal-ex/shine-plan.md` | 本文件 |

不修改 `energy-crystal/` 的任何檔案。
