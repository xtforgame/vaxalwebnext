# Frame Gallery Transition — 技術設計書 v3

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

攝影機的 lookAt 永遠指向 Z = 0（牆面），方向永遠是 -Z。
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
兩個畫框間距: 7 (x=±3.5)
畫框跨度: 約 12 → 可見寬度 19.9 > 12 ✓
```

### 退場移動量

V1 從 Z=-12 到 Z=-0.1，移動量 = +11.9。
Camera 等速移動：Z=-6 到 Z=+5.9（≈+6）。

### Video plane 重疊檢查

V1 (x=-3.5, width=10): x 範圍 -8.5 ~ +1.5
V2 (x=+3.5, width=10): x 範圍 -1.5 ~ +8.5
重疊區間: x = -1.5 ~ +1.5（3 個單位）

但這個區間被牆面的實心部分覆蓋（兩個六角洞之間是實心牆），
從總覽位置看不到重疊區域。✓

---

## Camera 路徑設計

Camera 永遠面向 -Z，只有位置 (x, y, z) 變化：

```
路徑點：
P0: (-3.5, 0, -6)    ← 沉浸 V1
P1: (-3.5, 0, +6)    ← 退場完成
P2: (0, 0.2, +12)    ← 總覽
P3: (+3.5, 0, +6)    ← 準備進場 V2
P4: (+3.5, 0, -6)    ← 沉浸 V2
```

P0→P1：camera 和 V1 等速移動（退場）
P1→P2：camera 獨立拉遠（總覽）
P2→P3：camera 水平平移（橫移到 V2）
P3→P4：camera 和 V2 等速移動（進場）

**Camera Z 全程路線：-6 → +6 → +12 → +6 → -6**
**Camera 面向：永遠 -Z，零旋轉**

LookAt 點全部在 Z=0（牆面），只有 x 隨相機移動。

---

## Video Plane 動態 Z 位置

Video plane 的 Z 位置不是固定的，在轉場時會改變：

### V1 的 Z 位置
| 階段 | V1 Z 位置 | 計算方式 |
|------|----------|---------|
| 沉浸 V1 | -12 | camera.z - 6 |
| 退場中 | camera.z - 6 | 與 camera 等速移動 |
| 退場後（總覽/平移/進場） | -0.1 | 固定在牆面 |

### V2 的 Z 位置
| 階段 | V2 Z 位置 | 計算方式 |
|------|----------|---------|
| 退場前（沉浸/退場/總覽/平移） | -0.1 | 固定在牆面 |
| 進場中 | camera.z - 6 | 與 camera 等速移動 |
| 沉浸 V2 | -12 | camera.z - 6 |

簡化公式：
```
退場中: V1_Z = camera.z - 6
進場中: V2_Z = camera.z - 6
其他時候: 各自在 -0.1（貼牆）或 -12（沉浸）
```

---

## 需要修改的檔案

### 1. CameraDirector.ts
- IMMERSED_Z = -6（camera 在牆後面）
- 路徑：全部 lookAt Z=0，camera Z 從 -6 到 +12 到 -6
- 不需要 quaternion，純粹 camera.lookAt(x, y, 0)
- 退場/進場段落需要與 video plane 同步

### 2. PortalFrame.tsx
- content plane Z **不再固定**，改為接收動態 `contentZ` prop
- 尺寸維持 10×5.625
- FrontSide 渲染（面向 +Z，camera 從 +Z 看進六角洞）
- 移除 `contentVisible` prop（不需要了）

### 3. WallScene.tsx
- 牆面永遠不透明，不需要 opacity
- 移除 `wallOpacity` prop
- 傳遞 `contentZ` 給 PortalFrame

### 4. FrameGallery.tsx
- 計算每個 video plane 的動態 Z（根據轉場階段和 camera Z）
- Camera 路徑使用 CatmullRomCurve3
- 移除 contentVisible 和 wallOpacity 邏輯

### 5. CrossfadeMaterial.tsx
- 不變

### 6. FrameShapeUtils.ts
- 不變

---

## 實作順序

| 步驟 | 檔案 | 操作 |
|------|------|------|
| 1 | CameraDirector.ts | 重寫路徑，IMMERSED_Z=-6 |
| 2 | PortalFrame.tsx | 動態 contentZ prop |
| 3 | WallScene.tsx | 傳遞 contentZ，移除 opacity |
| 4 | FrameGallery.tsx | 動態計算 video Z，移除 visibility/opacity 邏輯 |
| 5 | 驗證 build + 測試 | — |
