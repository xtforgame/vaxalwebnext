# Frame Gallery Transition — 技術設計書 v4

## 核心概念：移動的風景畫

場景就像一面牆上有兩扇六角形窗戶，窗外各有一幅風景（video texture）。
牆固定不動。風景（video plane）可以前後移動。攝影機永遠面向 -Z 方向。

```
座標系統：
  +Z = 攝影機背後方向
  -Z = 攝影機前方方向（攝影機永遠看向這裡）
  牆面固定在 Z = 0
```

---

## 三個空間物件

| 物件 | 初始 Z 位置 | 說明 |
|------|------------|------|
| Video 1 plane | Z = -12 | 矩形平面，貼 video texture，16:9 |
| Wall | Z = 0 | 大矩形，挖兩個六角形洞，永遠不動 |
| Video 2 plane | Z = -0.1 | 矩形平面，貼 video texture，緊貼牆面 |

Video plane 放在 Z = -0.1（不是 0）避免跟牆面 z-fighting。

---

## 攝影機規則

**攝影機永遠面向 -Z，全程不旋轉。**

使用 `camera.rotation.set(0, 0, 0)` 每幀強制設定，不使用 `lookAt()`。
（`lookAt()` 在 camera 穿越 Z=0 時會造成 180° 翻轉）
只有位置 (x, y, z) 會改變，朝向不變。

---

## 完整轉場流程

### A. 沉浸 Video 1

```
側面圖（Z 軸）：

  V1 plane     Camera          Wall          V2 plane
  Z=-12        Z=-6            Z=0           Z=-0.1
  ┃             ◉──→ 面向-Z    ┃             ┃
  ┃◄── 6 ──►   ┃              ┃             ┃
               看到的：                       (在camera後面，
               V1 填滿視野                    看不到)
               牆在背後，看不到
```

- Camera 在 Z=-6，面向 -Z
- V1 在 Z=-12，距 camera 6 個單位（填滿 viewport）
- 牆在 Z=0，在 camera 背後（+Z 方向），不在視野內
- V2 在 Z=-0.1，緊貼牆面，也在 camera 背後，看不到
- **結果：使用者只看到 Video 1 全螢幕**

### B. 退場（Camera + V1 同步後退）

Camera 和 V1 **等速向 +Z 移動**，兩者間距始終 6 個單位。

```
移動過程（三個時間點）：

t=0 (開始):
  V1           Cam                Wall
  Z=-12        Z=-6               Z=0
  ┃◄── 6 ──►   ◉                  ┃

t=0.5 (camera 穿越牆面):
               V1           Cam   Wall
               Z=-6         Z=0   Z=0
               ┃◄── 6 ──►   ◉ ←── 牆在這裡，camera 正好在牆的位置

t=1.0 (退場完成):
                      V1     Wall  Cam
                      Z=-0.1 Z=0   Z=+6
                      ┃      ┃     ◉
                             ┃◄ 6 ►┃
                             牆在前方，
                             六角洞裡看到 V1
```

**為什麼六角形會自然出現？**

Camera 向 +Z 移動時，牆面（Z=0）從 camera 背後（+Z 方向）
漸漸變成 camera 前方（-Z 方向）。

- camera 在 Z=-2 時：牆在背後 2 個單位 → 看不到
- camera 在 Z=0 時：牆在 camera 位置 → 剛好穿過
- camera 在 Z=+2 時：牆在前方 2 個單位 → 六角洞出現在視野裡
- camera 在 Z=+6 時：牆在前方 6 個單位 → 完整看到牆面

V1 此時在 Z=-0.1（牆後面），透過六角洞可以看到 → **六角形裁切效果**

**關鍵：camera 從頭到尾都面向 -Z，完全不旋轉。**
牆是「經過」camera 的，不是 camera 轉頭去看牆。

### C. 牆面總覽

- Camera 獨立繼續向 +Z 拉遠到 Z ≈ +12
- V1 停在 Z=-0.1（已貼著牆面的六角洞）
- V2 也在 Z=-0.1（貼著另一個六角洞）
- 兩個六角窗都可見，裡面分別是 V1 和 V2 的內容

### D. 平移

- Camera 在 Z ≈ +12，X 從 frame1.x 平移到 frame2.x
- 所有物件位置不變

### E. 進場 Video 2（Camera + V2 同步前進）

Camera 先從總覽位置（Z=+12）回到 Z=+6（與 frame2 對齊）。
然後 Camera 和 V2 **等速向 -Z 移動**。

```
移動過程：

t=0 (進場開始):
                      V2     Wall  Cam
                      Z=-0.1 Z=0   Z=+6
                      ┃      ┃     ◉──→面向-Z

t=0.5 (camera 穿越牆面):
               V2            Cam=Wall
               Z=-6          Z=0
               ┃◄── 6 ──►    ◉┃

t=1.0 (進場完成，沉浸 V2):
  V2           Cam                Wall
  Z=-12        Z=-6               Z=0
  ┃◄── 6 ──►   ◉                  ┃
               牆在背後，看不到
               V2 填滿視野
```

V2 從 Z=-0.1 移動到 Z=-12。Camera 從 Z=+6 移動到 Z=-6。
牆從 camera 前方滑到背後 → 六角裁切自然消失 → 全螢幕 Video 2。

### F. 沉浸 Video 2

跟 A 一樣的狀態，只是換成 Video 2。

---

## 為什麼不需要管牆面透明度？

牆面永遠是不透明的，永遠是 `FrontSide` 渲染（法線朝 +Z）。

| Camera 位置 | 牆面狀態 | 原因 |
|------------|---------|------|
| Z < 0 | **看不到** | 牆在 camera 背後（+Z 方向），不在視野內 |
| Z > 0 | **看得到** | 牆在 camera 前方（-Z 方向），FrontSide 面對 camera |

不需要改 opacity、不需要改 visible、不需要 stencil。
牆就是在那裡，camera 經過它的時候自然就看到/看不到。

---

## 為什麼不需要管 content visibility？

| 階段 | V1 | V2 | Camera | 互相可見？ |
|------|----|----|--------|-----------|
| 沉浸 V1 | Z=-12 | Z=-0.1 | Z=-6 | Camera 面向 -Z 只看到 V1。V2 在 Z=-0.1（背後），看不到 ✓ |
| 退場中 | 移動中 | Z=-0.1 | 移動中 | V1 在 camera 前方。V2 在牆面，被牆的實心部分擋住 ✓ |
| 總覽 | Z=-0.1 | Z=-0.1 | Z=+12 | 兩個都在牆後面，各自透過自己的六角洞可見 ✓ |
| 進場中 | Z=-0.1 | 移動中 | 移動中 | V2 在 camera 前方。V1 在牆面，被牆擋住或在背後 ✓ |
| 沉浸 V2 | Z=-0.1 | Z=-12 | Z=-6 | 跟沉浸 V1 的鏡像 ✓ |

每個階段都不會同時看到兩個 video plane 產生干擾。

---

## 數值計算

### Video plane 尺寸

影片原始比例 1280×720 = 16:9。
Content plane: **10 × 5.625**（16:9）。

### Camera 沉浸距離

FOV = 50°，需要 content 高度填滿 viewport：
```
d = CONTENT_HEIGHT / (2 × tan(FOV/2))
  = 5.625 / (2 × tan(25°))
  = 5.625 / 0.9326
  ≈ 6.03
```

Camera 距離 video plane 約 6 個單位可填滿 viewport。

### 初始位置

- Camera: Z = -6
- Video plane: Z = -6 - 6 = -12
- 牆面: Z = 0（camera 背後 6 個單位）

### 總覽距離

Camera 在 Z = +12 時：
```
可見高度 = 2 × 12 × tan(25°) = 11.2
可見寬度 = 11.2 × 16/9 ≈ 19.9
兩個畫框間距: 11 (x=±5.5)
畫框跨度: 約 16.6 → 可見寬度 19.9 > 16.6 ✓
```

### 退場移動量

V1 從 Z=-12 到 Z=-0.1，移動量 = +11.9。
Camera 等速移動：Z=-6 到 Z=+5.9（≈+6）。

### Video plane 重疊檢查

V1 (x=-5.5, width=10): x 範圍 -10.5 ~ +0.5
V2 (x=+5.5, width=10): x 範圍 +0.5 ~ +10.5
重疊: 無 ✓

---

## Camera 路徑設計

Camera 永遠面向 -Z，只有位置 (x, y, z) 變化：

```
路徑點（CatmullRomCurve3, tension=0.35）：
P0: (-5.5, 0, -6)      ← 沉浸 V1
P1: (-5.5, 0.3, +6)    ← 拉出牆面
P2: (0, 0.2, +12)      ← 總覽
P3: (+5.5, 0.3, +6)    ← 靠近 V2
P4: (+5.5, 0, -6)      ← 沉浸 V2
```

使用 **單一全域 `easeInOutCubic`** 控制整條曲線的進度。
整段轉場是一個連續的平滑運動，不會在階段邊界停頓。

P0→P4 為一條平滑 CatmullRom 曲線，camera 從頭到尾只有一次加速→勻速→減速。

**Camera Z 全程路線：-6 → +6 → +12 → +6 → -6**
**Camera 面向：永遠 -Z，`camera.rotation.set(0,0,0)`**

### 階段時間分配

| 階段 | 持續時間 | 全域進度範圍 |
|------|---------|------------|
| exiting | 2.5s | 0.000 → 0.294 |
| overview | 1.5s | 0.294 → 0.471 |
| panning | 2.0s | 0.471 → 0.706 |
| entering | 2.5s | 0.706 → 1.000 |
| **總計** | **8.5s** | |

`phaseToGlobal` 將各階段 progress 映射為時間比例的全域進度，
再經過 `easeInOutCubic` → `CatmullRomCurve3.getPointAt(t)` 得到 camera 位置。

---

## Video Plane 動態 Z 位置

Video plane 的 Z 位置不是固定的，在轉場時會改變：

統一追蹤公式：`tracking = Math.min(cameraZ - 6, -0.1)`

此公式讓 video plane 維持在 camera 前方 6 單位，並自然夾在 -0.1（牆面）。
camera 離牆面越遠時 plane 自然停在牆面；camera 靠近時 plane 自然跟上。

### V1 的 Z 位置
| 階段 | V1 Z 位置 | 計算方式 |
|------|----------|---------|
| 沉浸 V1 | -12 | camera.z - 6（追蹤） |
| 退場 + 總覽 + 平移 | min(camera.z - 6, -0.1) | 追蹤→自然停牆 |
| 進場 + 沉浸 V2 | -0.1 | 固定在牆面 |

### V2 的 Z 位置
| 階段 | V2 Z 位置 | 計算方式 |
|------|----------|---------|
| 沉浸 V1 + 退場 + 總覽 | -0.1 | 固定在牆面 |
| 平移 + 進場 | min(camera.z - 6, -0.1) | 自然脫牆→追蹤 |
| 沉浸 V2 | -12 | camera.z - 6（追蹤） |

**注意：平移階段兩者都用追蹤公式。** 但此時 camera Z ≈ +12，
`min(12-6, -0.1) = -0.1`，兩者實際都在牆面，沒有衝突。

### Content Z 更新機制

使用 **ref-based 更新**（非 React state），避免 1-frame 延遲造成黑閃：

```
FrameGallery (useFrame)                    PortalFrame (useFrame)
 ├─ 計算 cameraZ                           ├─ 讀取 contentZRef.current
 ├─ computeContentZ()                      └─ mesh.position.z = contentZRef.current
 └─ 寫入 contentZRef.current
```

---

## 實作現況

### 檔案清單

| 檔案 | 職責 |
|------|------|
| `CameraDirector.ts` | CatmullRomCurve3 路徑 + 全域 easeInOutCubic + phaseToGlobal 映射 |
| `PortalFrame.tsx` | 單一框：video texture 矩形平面（Z 由 ref 更新）+ 六角邊框 |
| `WallScene.tsx` | 牆面（打洞 ShapeGeometry, FrontSide）+ 所有 PortalFrame |
| `FrameGallery.tsx` | 場景編排：camera 控制、computeContentZ、contentZRef 更新 |
| `TransitionController.ts` | 狀態機：immersed → exiting → overview → panning → entering → immersed |
| `SceneManager.ts` | 影片 HTMLVideoElement + VideoTexture 管理 |
| `FrameShapeUtils.ts` | 六角 Shape 建構、牆面打洞幾何、ExtrudeGeometry 邊框 |
| `CrossfadeMaterial.tsx` | Crossfade shader（目前未使用，保留備用） |
| `types.ts` | FrameConfig, TransitionPhase, TransitionState 型別 |

### 已移除的機制

| 機制 | 移除原因 |
|------|---------|
| `contentVisible` prop | 不需要。牆面 FrontSide + camera 位置自然控制可見性 |
| `wallOpacity` prop | 不需要。牆面永遠不透明 |
| `lookAt()` / lookAt curve | camera 穿越 Z=0 時造成 180° 翻轉。改用 `rotation.set(0,0,0)` |
| per-phase easing | 每段 start/stop 造成三段斷裂感。改用單一全域 easing |
| CrossfadeMaterial (blendFactor) | 暫時移除。改用 `meshBasicMaterial` + video texture |
| React state for contentZ | 1-frame 延遲造成黑閃。改用 ref-based 同步更新 |
