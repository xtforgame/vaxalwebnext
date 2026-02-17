# Light Trail Shader — 技術分析與修正方案

## 一、參考 Shader 原理分析

來源：[Shadertoy 4d2BDm](https://www.shadertoy.com/view/4d2BDm)

### 核心架構：粒子系統 + 時間反饋

參考 shader **不是**用幾何體畫出拖尾，而是：

1. 每幀在螢幕上渲染 6 個粒子（全螢幕 fragment shader）
2. 每個粒子有兩層渲染
3. 透過 **buffer feedback**（讀取上一幀的畫面 × 0.97）累積出拖尾效果

```
本質：拖尾 = 粒子的「殘影累積」，不是空間幾何體
```

### 兩層渲染的具體公式

**Layer 1 — 柔和暈光**（L103）：
```glsl
particles += .012 * YELLOW * vec3(0.18 / (pSize * length(finPos)));
```

| 參數 | 值 | 說明 |
|------|-----|------|
| 係數 | `.012 * 0.18 = 0.00216` | **極微弱**的亮度 |
| 衰減 | `1 / dist` | 反比衰減（不是 exp） |
| pSize | `1.0 ~ 4.0` | 隨機粒子大小 |
| 顏色 | YELLOW `(1,1,0)` | 暖色 |

在 4.6 單位寬的 UV 空間中，dist=0.1 時亮度僅 0.02。**極度微弱。**

**Layer 2 — 硬核 + 動態模糊**（L105-113）：
```glsl
// 1. 旋轉至速度方向
finPos = rotatevec2(finPos, atan(finSpeed.x / finSpeed.y));

// 2. 垂直速度方向壓扁 → 變成細長條
finPos.y *= 1.0 - clamp(speed * 900.0 * 0.003, 0.0, 0.8);
finPos.y *= 1.0 - clamp(speed * 900.0 * pSize * 0.003, 0.0, 0.8);

// 3. 硬核白點（壓扁後變成長條）
particles += vec3(smoothstep(0.03, 0.004, pSize * length(finPos)));
```

| 參數 | 值 | 說明 |
|------|-----|------|
| 硬核半徑 | `0.004 ~ 0.03` UV 單位 | 佔視野寬度 **< 0.7%**，極細 |
| 壓扁量 | `moBlurStrength=900` | Y 方向壓到原來的 20% |
| 顏色 | `vec3(1.0)` | 純白 |

**關鍵：硬核在壓扁前是個半徑 0.01 的極小白點，壓扁後變成沿速度方向的細白條。**

**Layer 3 — 時間反饋**（L116）：
```glsl
fragColor = vec4(particles, 1.0) + texture(iChannel1, uv) * 0.97;
```

- iChannel1 = 上一幀的畫面
- 每幀保留 97%，約 100 幀（~1.7 秒）後衰減到 5%
- **這就是拖尾的來源**：移動中的粒子在每幀留下殘影，形成漸消的光條

---

## 二、我們場景的架構差異

| | 參考 Shader | 我們的實作 |
|--|------------|----------|
| 拖尾方式 | 時間反饋（buffer ping-pong） | 空間幾何（ribbon geometry） |
| 渲染區域 | 全螢幕 | 沿曲線的 ribbon |
| 座標系統 | 2D screen space | 3D wall surface |
| UV 意義 | 螢幕座標 | UV.x=沿曲線進度, UV.y=橫向距離 |

我們用 **ribbon + 漸進顯示** 模擬拖尾是正確方向，但 shader 的數值需要正確對應。

### UV 空間的物理尺度

```
曲線總長：約 14 個 3D 單位
  UV.x = 0 → 1 對應 14 個單位
  UV.x 每 0.01 = 0.14 個單位

ribbon 半寬：1.2 個單位
  r = abs(UV.y - 0.5) * 2.0 → 0~1 對應 0~1.2 個單位
  r 每 0.01 = 0.012 個單位

UV.x 與 r 的比例：14 / 1.2 ≈ 12
```

---

## 三、目前 Bug 的根因分析

### Bug 1：頭部是巨大的白色光球

**根因：headGlow 的半徑遠超合理範圍**

```glsl
float headDist = length(vec2(d * 12.0, r));
float headGlow = smoothstep(0.5, 0.03, headDist);  // 半徑 0.5
```

`headDist` 是 2D 距離，threshold 是 0.5。在 r 方向上：
- headGlow > 0 的範圍：r < 0.5 → 物理 0.6 個單位（直徑 1.2 個單位！）
- headGlow = 1.0 的範圍：r < 0.03 → 物理 0.036 個單位

加上 `headSoft = 0.015 / (headDist + 0.04)`，在 headDist=0：
- headSoft = 0.375

最終 alpha：`core + headGlow * 0.8 + glow * 0.4 + headSoft * 0.2`
在頭部中心 = `1.0 + 0.8 + 0.6 + 0.075 = 2.475`（additive blending 極亮）

**參考 shader 的硬核半徑僅 0.004~0.03（佔視野 < 0.7%），而我們的 headGlow 半徑 0.5 佔 ribbon 寬度的 50%。差了約 50 倍。**

**修正：完全移除 headGlow 和 headSoft。** Trail 自身的 glow 和 core 在 d=0 時已經是最亮的，自然形成明亮的前端。不需要額外的圓形光暈。

### Bug 2：光線穿透六角窗框

**根因：ribbon 在 Z=0.05（牆前方），直接覆蓋在六角洞口上**

```
ribbon (Z=0.05)  ←  在牆前面
wall   (Z=0.00)  ←  有六角洞
content(Z=-0.1)  ←  影片平面
```

ribbon 使用 additive blending + depthWrite:false，所以它的光會疊加在下面所有東西上面——包括透過六角洞看到的影片內容。

而且 trail 曲線從 frame 中心 (-5.5, 3.2) 出發，所以 trail 起點就在六角洞的正中央。即使 ribbon 寬度（1.2）沒到六角邊界（2.55），additive 的光暈仍然可見。

**修正：在 shader 中加入起點/終點淡入淡出。** 六角外半徑 2.8，沿 trail 方向走 2.8 單位才出六角框。2.8/14 ≈ 0.2 UV.x。

```glsl
// 起點淡入（離開 frame 1 的六角區域後才完全亮起）
alpha *= smoothstep(0.0, 0.15, vUv.x);
// 終點淡出（進入 frame 2 的六角區域前開始消失）
alpha *= smoothstep(0.0, 0.15, 1.0 - vUv.x);
```

### Bug 3：尾巴太短（先前的問題）

**根因：glow 的縱向衰減係數與亮度值的對比**

衰減太快不是唯一問題——headGlow 太亮造成視覺上看起來只有頭部有光。移除 headGlow 後，trail 的 glow 會變成唯一的亮度來源，尾巴自然會更「看得見」。

此外，glow 的 numerator 可以略微增加以增強尾部亮度。

---

## 四、具體修正方案

### Shader 重寫（只需改 trailFrag）

```glsl
uniform float uProgress;
uniform float uTime;
varying vec2 vUv;

void main() {
  float r = abs(vUv.y - 0.5) * 2.0;   // 0=中心, 1=邊緣
  float d = uProgress - vUv.x;         // >0=頭後方, <0=頭前方

  // 頭前方的小區域允許一點延伸，產生自然的柔和前端
  // 而不是一整個大圓
  if (d < -0.003) discard;

  float dBehind = max(0.0, d);

  // === 柔和暈光 (ref: .012 * 0.18 / dist → 0.00216 / dist) ===
  // 徑向：反比衰減
  float glowR = 0.06 / (r + 0.06);
  // 縱向：較慢衰減，讓尾巴更長
  float glowD = 1.0 / (dBehind * 4.0 + 0.15);
  float glow = glowR * glowD * 0.02;
  glow = min(glow, 0.6);

  // === 硬核 (ref: smoothstep(0.03, 0.004, dist)) ===
  // 極細的白色中心線
  float core = smoothstep(0.04, 0.005, r);
  core *= 1.0 / (dBehind * 6.0 + 0.2);
  core = min(core, 1.0);

  // 能量脈動
  float pulse = 1.0 + 0.04 * sin(vUv.x * 60.0 - uTime * 4.0);

  // 顏色：白芯 → 淺藍暈光 → 深藍外圈
  vec3 white     = vec3(1.0);
  vec3 lightBlue = vec3(0.4, 0.7, 1.0);
  vec3 blue      = vec3(0.15, 0.35, 0.85);

  vec3 color = white * core * 0.9
             + lightBlue * glow * pulse
             + blue * glow * 0.3;

  float alpha = core * 0.8 + glow * 0.6;

  // ribbon 邊緣淡出
  alpha *= smoothstep(1.0, 0.3, r);
  // 起點淡入（避免穿透 frame 1 六角框）
  alpha *= smoothstep(0.0, 0.15, vUv.x);
  // 終點淡出（避免穿透 frame 2 六角框）
  alpha *= smoothstep(0.0, 0.15, 1.0 - vUv.x);

  gl_FragColor = vec4(color, alpha);
}
```

### 各項數值與參考的對照

| 項目 | 參考值 | 我們的值 | 說明 |
|------|--------|---------|------|
| 硬核半徑 | smoothstep(0.03, 0.004) | smoothstep(0.04, 0.005, r) | 相近，產生極細白線 |
| 暈光強度 | 0.00216 / dist | 0.02 * (0.06/(r+0.06)) * (1/(d*4+0.15)) | 峰值 ~0.08，足夠微弱 |
| 頭部處理 | 無特殊處理（粒子本身） | 無 headGlow，由 glow/core 的 d=0 最亮值自然形成 | 一致 |
| 顏色 | YELLOW 暈光 + WHITE 核心 | blue-white 暈光 + white 核心 | 依需求改色 |
| 拖尾衰減 | 0.97^n 時間反饋 | 1/(d*4+0.15) 空間衰減 | 不同機制，視覺類似 |

### 不需改動的部分

- `createRibbonGeometry()`：flat ribbon 的做法是正確的
- `RIBBON_HALF_WIDTH = 1.2`：足以包含 glow
- `RIBBON_SEGMENTS = 200`：足夠平滑
- `easeInOutCubic` 進度映射：正確
- additive blending + depthWrite:false：正確
