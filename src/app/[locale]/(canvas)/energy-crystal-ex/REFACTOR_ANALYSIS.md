# 玻璃材質系統整合分析

## 現有檔案清單

| 檔案 | 角色 |
|------|------|
| `components/3d/GlassMaterial.tsx` | 基礎玻璃材質 |
| `components/3d/EnergyCrystalMaterial.tsx` | 玻璃 + 能量充能效果 |
| `(canvas)/scan/ScanViewer.tsx` | 使用 GlassMaterial |
| `(canvas)/energy-crystal/EnergyCrystalViewer.tsx` | 使用 EnergyCrystalMaterial（基礎版） |
| `(canvas)/energy-crystal-ex/EnergyCrystalViewer.tsx` | 使用 EnergyCrystalMaterial + 全螢幕光芒 |

---

## 一、Shader 逐段比對

### Vertex Shader

| 功能 | GlassMaterial | EnergyCrystalMaterial |
|------|:---:|:---:|
| vWorldPosition | ✅ | ✅ |
| vWorldNormal | ✅ | ✅ |
| vViewDirection | ✅ | ✅ |
| vUv | ✅ | ✅ |
| vLocalPosition | ❌ | ✅ |

差異：EnergyCrystalMaterial 多一個 `vLocalPosition = position`，用於能量分形採樣。
→ **可合併**：始終輸出 vLocalPosition，GlassMaterial 模式下不使用即可，無效能損失。

### Fragment Shader — 共用函式（完全一致）

```
fresnel()
iorToF0()
distributionGGX()
beerLambertAbsorption()
sampleEnvMapChromatic()  // 邏輯相同，但 EnergyCrystal 用 sampleCubeMapSafe 取代直接 textureCube
```

### Fragment Shader — main() 玻璃渲染流程

| 步驟 | GlassMaterial | EnergyCrystalMaterial |
|------|:---:|:---:|
| Beer-Lambert absorption | `uAbsorption` 固定 | `mix(uAbsorption, uAbsorption*0.15, uChargeLevel)` 動態 |
| Fresnel | 相同 | 相同 |
| Reflection | `textureCube(uEnvMap, ...)` | `sampleCubeMapSafe(...)` |
| Refraction + chromatic aberration | 相同邏輯 | 相同邏輯（用 sampleCubeMapSafe） |
| GGX specular | 相同 | 相同 |
| Edge glow | 相同 | 相同 |
| envMapIntensity | 相同 | 相同 |
| Alpha 計算 | `mix(uOpacity, 0.8, ...)` | 同上 + chargeAlpha |

差異：
1. **EnvMap 安全取樣**：GlassMaterial 假設 envMap 一定存在，直接 `textureCube`。EnergyCrystalMaterial 加了 `uHasEnvMap` flag 和 fallback。
   → GlassMaterial 其實也應該有這個保護，這是 bug prevention。
2. **動態 absorption**：`chargeLevel > 0` 時降低吸收。`chargeLevel = 0` 時 `mix()` 退化為原值，行為等同 GlassMaterial。
3. **Alpha**：chargeAlpha 在 `chargeLevel = 0` 時為 0，退化為 GlassMaterial 邏輯。

### Fragment Shader — EnergyCrystalMaterial 獨有

```glsl
// 能量效果區塊（chargeLevel > 0 時才有視覺效果）
fractalDensity()          // box-folding 分形
sampleCrystalEnergy()     // 多層視差採樣
pulse / fastPulse         // 呼吸脈動
emissive                  // 結構化內部發光
chargedEdgeGlow           // 能量邊緣溢出
transmission              // 薄角度亮度增強
bodyGlow                  // 整體底色發光
```

**關鍵發現**：當 `chargeLevel = 0` 時：
- `dynamicAbsorption = uAbsorption`（等同 GlassMaterial）
- `emissive = vec3(0.0)`（所有能量項歸零）
- `chargeAlpha = 0`
- 唯一差異是 `sampleCubeMapSafe` vs 直接 `textureCube`

→ **結論：EnergyCrystalMaterial 在 chargeLevel=0 時就是 GlassMaterial（加上 envMap 安全檢查）。**

---

## 二、React 組件比對

### Props

```typescript
// GlassMaterialProps（10 個）
color, opacity, ior, fresnelPower, reflectivity,
chromaticAberration, envMapIntensity, roughness, thickness, absorption

// EnergyCrystalMaterialProps（12 個）= GlassMaterialProps + 2
...上述 10 個 + chargeLevel, energyColor
```

→ EnergyCrystalMaterialProps 是 GlassMaterialProps 的超集。

### EnvMap 處理

| | GlassMaterial | EnergyCrystalMaterial |
|---|---|---|
| envMap 來源 | `scene.environment as CubeTexture \| null` | 同左，加 dummyCubeTexture fallback |
| 安全性 | envMap=null 時 shader 會 crash | uHasEnvMap flag 保護 |

→ GlassMaterial 的做法有潛在風險。EnergyCrystalMaterial 的做法更安全。

### useFrame

| | GlassMaterial | EnergyCrystalMaterial |
|---|---|---|
| uTime | ✅ | ✅ |
| uChargeLevel | ❌ | ✅ |

---

## 三、Viewer 層級比對

### 共用代碼（三個 Viewer 完全一致）

1. **`createRoundedBoxGeometry()`** — 三處各自 copy-paste，邏輯完全相同
2. **`PanoramaEnvironment`** — 三處完全相同
3. **Canvas 配置** — camera, gl, dpr, frameloop 幾乎相同
4. **燈光配置** — ambientLight + spotLight + pointLight 相同

### energy-crystal vs energy-crystal-ex 差異

| 功能 | energy-crystal | energy-crystal-ex |
|------|:---:|:---:|
| 充能動畫 | useChargeAnimation hook + ChargeAnimator 組件 | 內建在 CrystalWithGlow useFrame |
| 全螢幕光芒 | ❌ | ✅（GPU 投影 polygon SDF） |
| 輪廓採樣 | ❌ | generateOutlinePoints + GLOW shader |
| Bloom | 有（已註解） | ❌ |
| Effects Toggle | ❌ | ✅ |

---

## 四、整合提案

### 目標

1. **GlassMaterial 和 EnergyCrystalMaterial 合併為單一材質**，透過 props 控制
2. **全螢幕光芒抽成獨立可重用組件**
3. **共用工具函式提取**
4. **不改壞現有三個頁面**

### 架構

```
components/3d/
├── GlassMaterial.tsx          ← 合併後的唯一材質（向下相容）
├── ScreenGlow.tsx             ← 全螢幕光芒效果（獨立組件）
└── utils/
    └── rounded-box.ts         ← createRoundedBoxGeometry + generateOutlinePoints
```

### 4-1. 合併材質：GlassMaterial

**做法**：以 EnergyCrystalMaterial 的 shader 為基礎（因為它是 GlassMaterial 的超集），但保持 `GlassMaterial` 這個名稱和所有原有 props。

```typescript
interface GlassMaterialProps {
  // ── 原有 10 個 props（完全相容） ──
  color?: string;            // 預設 '#ffffff'
  opacity?: number;          // 預設 0.15
  ior?: number;              // 預設 1.45
  fresnelPower?: number;     // 預設 1.0
  reflectivity?: number;     // 預設 1.0
  chromaticAberration?: number; // 預設 0.5
  envMapIntensity?: number;  // 預設 1.0
  roughness?: number;        // 預設 0.0
  thickness?: number;        // 預設 0.1
  absorption?: number;       // 預設 2.0

  // ── 新增能量效果 props（全部可選，預設值讓行為等同原 GlassMaterial） ──
  chargeLevel?: number;      // 預設 0（= 純玻璃）
  energyColor?: string;      // 預設 '#ff9a16'
}
```

**向下相容保證**：
- 所有現有 `<GlassMaterial ... />` 呼叫不需要任何修改
- `chargeLevel` 預設 0 → shader 中能量區塊全部歸零 → 行為完全等同原 GlassMaterial
- 加入 dummyCubeTexture + uHasEnvMap（原 GlassMaterial 缺少的安全機制）

**shader 變更**：
- 使用 EnergyCrystalMaterial 的完整 shader（包含能量區塊）
- `chargeLevel = 0` 時所有能量計算結果為 0，不影響視覺和效能（GPU 分支預測 + 乘零優化）

**刪除**：
- `components/3d/EnergyCrystalMaterial.tsx` 整個檔案
- 所有 `import { EnergyCrystalMaterial }` 改為 `import { GlassMaterial }`

### 4-2. 全螢幕光芒：ScreenGlow

從 energy-crystal-ex 的 CrystalWithGlow 中提取光芒部分為獨立組件。

```typescript
interface ScreenGlowProps {
  // 追蹤目標
  targetRef: React.RefObject<THREE.Object3D>;  // 要追蹤的 3D 物件
  outlinePoints: THREE.Vector3[];               // 物件輪廓點（local space）

  // 效果控制
  chargeLevel: number;       // 0-1，控制光芒強度
  enabled?: boolean;         // 預設 true

  // 外觀客製化
  color?: [number, number, number];  // 預設 [1.0, 0.65, 0.15]（暖琥珀）
  highlightColor?: [number, number, number]; // 預設 [1.0, 0.85, 0.45]
  starColor?: [number, number, number];      // 預設 [1.0, 0.8, 0.5]
  intensity?: number;        // 全域強度倍率，預設 1.5
  starScale?: number;        // 星芒大小，預設 0.6
  noiseSpeed?: number;       // 噪聲動畫速度，預設 0.525
}
```

**使用方式**：
```tsx
<ScreenGlow
  targetRef={crystalGroupRef}
  outlinePoints={outlinePoints}
  chargeLevel={0.8}
  color={[0.0, 0.5, 1.0]}  // 藍色光芒
/>
```

**內部實作**：
- 自帶 fullscreen quad mesh + shaderMaterial
- useFrame 中更新 uCrystalMatrix（從 targetRef）
- GPU 投影 + polygon SDF（現有邏輯）
- 不需要外部傳入 camera 或做 JS 投影

### 4-3. 共用工具

```typescript
// components/3d/utils/rounded-box.ts

export function createRoundedBoxGeometry(
  width: number, height: number, depth: number,
  radius: number, segments?: number
): THREE.BufferGeometry;

export function generateOutlinePoints(
  width: number, height: number, radius: number,
  count?: number  // 預設 48
): THREE.Vector3[];
```

消除三個 Viewer 中的重複代碼。

---

## 五、遷移影響

### ScanViewer（風險：極低）
- `<GlassMaterial ... />` → 不需改動（props 完全相容）
- `createRoundedBoxGeometry` → 改為 import from utils
- 唯一變化：shader 內部多了不使用的能量區塊（chargeLevel=0，零視覺差異）

### energy-crystal/EnergyCrystalViewer（風險：低）
- `import { EnergyCrystalMaterial }` → `import { GlassMaterial }`
- `<EnergyCrystalMaterial chargeLevel={x} energyColor="..." .../>` → `<GlassMaterial chargeLevel={x} energyColor="..." .../>`
- 純 rename，props 完全相容

### energy-crystal-ex/EnergyCrystalViewer（風險：中）
- 材質部分：同上 rename
- 光芒部分：CrystalWithGlow 內的光芒邏輯提取為 `<ScreenGlow />`
- 需要將 groupRef 暴露給 ScreenGlow
- 充能動畫邏輯保留在 Viewer，不放進 ScreenGlow

---

## 六、不建議合併的部分

1. **ScanImagePlane 的掃描線 shader** — 這是圖片掃描效果，跟玻璃材質無關，保持在 ScanViewer 內
2. **充能動畫邏輯（easeOutCubic + chargingRef）** — 這是業務邏輯，不是材質功能，保持在各 Viewer 內
3. **PanoramaEnvironment** — 雖然重複，但各場景可能未來用不同環境圖，暫不抽取
4. **Canvas 配置 / 燈光** — 同上，各場景可能有不同需求

---

## 七、執行順序建議

1. **Phase 1**：提取 `rounded-box.ts` 工具 → 三個 Viewer 都改用 import（安全，純機械替換）
2. **Phase 2**：合併 GlassMaterial ← EnergyCrystalMaterial → 更新所有 import（逐一驗證三個頁面）
3. **Phase 3**：提取 ScreenGlow 組件 → energy-crystal-ex 改用（只影響一個頁面）

每個 Phase 完成後獨立驗證，確認不影響現有功能再進入下一步。
