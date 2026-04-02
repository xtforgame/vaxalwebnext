# Multiple-Line Shader 2 分析

> 來源: https://www.shadertoy.com/view/XcjyDK

## 概覽

這是一個 **多 pass** 的 Shadertoy shader，使用「細胞自動機」式的粒子傳播模擬電流在電路板上分支、流動、留下拖尾的效果。與 shader1 的 curl noise 驅動不同，這個 shader 使用**鄰域搜尋 + 方向旋轉**來傳播粒子。

| Buffer | 功能 |
|--------|------|
| **Common** | 共用常數（electric trail rate）和雜湊函數 |
| **Buffer A** | 粒子方向、生命、分支邏輯（核心模擬） |
| **Buffer B** | 將模擬數據映射為顏色（渲染） |
| **Image** | 直通輸出（僅偏移 0.5 像素） |

整體流程：**鄰域傳播 → 方向旋轉/分支 → 生命衰減 → 顏色映射**

---

## 一、Common：共用函數和常數

### 1.1 常數

```glsl
const float br = 0.7;  // electric trail rate
```

- `br` 用於區分「普通粒子」和「電流粒子」
- 每個粒子有一個隨機的 `w` 值，如果 `w < br`（70% 的粒子），它是普通軌跡
- 如果 `w >= br`（30% 的粒子），它是「電流」軌跡，顯示為明亮的青色

### 1.2 `hash33` — 3D → 3D 雜湊

```glsl
vec3 hash33(vec3 p3)
{
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy + p3.yxx)*p3.zyx);
}
```

- 來自 Dave Hoskins 的雜湊集合
- 接受 3D 輸入（通常是 `(fragCoord.x, fragCoord.y, seed)`），返回 3D 隨機向量
- 用於 Buffer A 的粒子初始化和分支決策

### 1.3 `hash12` — 2D → 1D 雜湊

```glsl
float hash12(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
```

- 2D → 標量雜湊，返回 `[0, 1)`
- 用於賦予每個粒子的 `w` 值（決定是否為「電流」粒子）

### 1.4 `rr` — 範圍映射

```glsl
float rr(float min, float max, float val)
{
    return min + (max - min) * val;
}
```

- 簡單的線性重映射：`val ∈ [0,1]` → `[min, max]`
- 在此 shader 中**未被使用**（可能是遺留程式碼）

---

## 二、Buffer A：粒子方向與分支模擬（核心）

### 2.1 資料格式

每個像素的 `fragColor` 儲存：
- `.xy`：方向向量（量化為 8 方向之一，或 `(0,0)` 表示軌跡/背景）
- `.z`：生命值（1.0 = 活躍，逐漸衰減到 0）
- `.w`：「電流」機率值（隨機，用於區分普通/電流粒子）

### 2.2 常數

```glsl
const float psr  = 1e-6;    // spawn rate（極低，每百萬像素約 1 個新粒子）
const float lr   = 0.99;    // 普通粒子生命衰減率
const float blrd = 0.00;    // 電流粒子額外衰減差（目前為 0）
const float lbt  = 0.1;     // 生命分支閾值
const float pi   = 3.14159;
const float o    = -1.;     // 方向符號（orientation）
const float sp   = 1e-4;    // split probability

#define BRANCH 1              // 是否啟用分支
#define ONLY_BRANCH_BG_TRAILS 0  // 是否只對背景軌跡分支
```

### 2.3 旋轉矩陣

```glsl
mat2 rot(float t){
    return mat2(
        cos(t), sin(t),
        -sin(t), cos(t)
    );
}
```

標準 2D 旋轉矩陣，用於旋轉粒子方向。

### 2.4 初始化（前 10 幀）

```glsl
if (iFrame < 10) {
    float angle = -0.3;
    p = vec4(0);

    vec2 axis = vec2(1.0);
    if (h.x < psr) {
        p.xy = round(axis*rot(angle));
        p.z = 1.;
        p.w = hash12(fragCoord);
    }
}
```

**初始化流程：**
1. 所有像素預設為 `vec4(0)`（空）
2. 以 `psr = 1e-6` 的極低機率，在某些像素上生成粒子
3. 初始方向：`axis = (1,1)` 旋轉 `-0.3` 弧度 ≈ -17°，然後 `round` 量化
4. `round(vec2(1,1) * rot(-0.3))` ≈ `round(vec2(1.24, 0.71))` = `(1, 1)`，所以初始方向為 (1,1)，即右上 45°
5. `p.z = 1.0`：滿生命值
6. `p.w`：隨機值，決定此粒子是普通還是電流

**注意：** 被註解掉的程式碼暗示了其他初始化方案（隨機 8 方向、軸選擇等），最終簡化為固定角度。

### 2.5 鄰域傳播（核心機制）

```glsl
vec2 d = vec2(0);
float ww = 0.0;
int split = 0;

for (int x = -1; x <= 1; ++x) {
    for (int y = -1; y <= 1; ++y) {
        vec4 n = texture(iChannel0, uv + vec2(x, y)/r);
        if (n.xy == o*vec2(x,y)) {
            if (n.xy != vec2(0))  { d = n.xy; ww = n.w; }
        }
        if (n.xy == -1.*o*vec2(x,y) && h.x < sp) {
            if (n.xy != vec2(0)) split += 1;
        }
    }
}
```

**這是最關鍵的算法——基於鄰域的粒子傳播：**

搜尋 3×3 鄰域（自身 + 8 個鄰居），找到**方向向量恰好指向自己**的鄰居。

詳細解釋：
- `o = -1`，所以條件 `n.xy == o * vec2(x, y)` 即 `n.xy == (-x, -y)`
- 這意味著：如果鄰居 `(x, y)` 的方向是 `(-x, -y)`，即它的方向向量**指向當前像素**
- 例如：右上方的鄰居 `(1, 1)` 如果方向為 `(-1, -1)`（指向左下），就會傳播到當前像素

**實質上這是一個「細胞自動機」：** 每個像素看看周圍有沒有粒子朝自己移動，如果有就接收它的方向和屬性。

**分支檢測：**
- `n.xy == -1.*o*vec2(x,y)` 即 `n.xy == vec2(x, y)`，表示鄰居方向與偏移同向（背向當前像素）
- 以 `sp = 1e-4` 的低機率標記為可分支

### 2.6 軌跡衰減

```glsl
// trail
if (p.z > 0.0) {
    p.xy *= 0.0;            // 方向清零（變成軌跡點）
    p.z *= p.w < br ? lr : min(p.w, lr-blrd);  // 生命衰減
}
```

當一個像素已有粒子（`p.z > 0`）但這一幀沒有新粒子傳播來時：
1. 方向清零 → 變成**軌跡**（不再移動）
2. 生命值乘以衰減率（0.99），逐幀變暗
3. 電流粒子（`w >= br`）使用 `min(w, lr-blrd)` 的衰減率（目前 `blrd=0` 所以一樣）

### 2.7 方向接收與分支

```glsl
if (d != vec2(0)) {
    if (BRANCH == 1 && p.z > lbt && bbgt)
        d = round(d*rot(pi/(h.x<.5?4.:-4.)));
    p.xy = d;
    p.z = 1.0;
    p.w = ww;
}
```

當偵測到有粒子傳播到當前像素時：
1. **分支條件**：`BRANCH` 啟用 且 當前像素仍有殘留生命值（`p.z > lbt = 0.1`）且符合背景軌跡條件
2. **分支旋轉**：`rot(pi/4)` 或 `rot(-pi/4)`，即 ±45° 旋轉，隨機方向
3. `round()` 確保結果仍是量化的 8 方向之一
4. 更新方向、重置生命值為 1.0、繼承 `w` 值

```glsl
if (BRANCH == 1 && split == 1 && bbgt){
    d = round(d*rot(pi/(h.x<1e-3?-4.:4.)));
    p.xy = d;
    p.z = 1.;
}
```

額外的分支機制：如果偵測到 `split` 條件（背向的鄰居），以極低機率（`h.x < 1e-3`）產生反方向分支。

### 2.8 分支算法詳解

分支的本質：
1. 粒子到達一個像素時，如果該像素仍有殘留亮度（之前有其他粒子經過），就認為這是一個「交叉點」
2. 在交叉點，粒子方向旋轉 ±45°
3. 這模擬了電路板上電流在節點處分岔的效果
4. 由於旋轉角度固定為 ±45°，且方向都是量化的，所以分支後的路徑仍然保持 PCB 走線風格

---

## 三、Buffer B：顏色映射

### 3.1 顏色常數

```glsl
const vec3 pc  = vec3(1,1,1);             // 粒子顏色（白色）
const vec3 ctc = vec3(26, 21, 54)/255.0;  // 普通軌跡顏色（深紫色）
const vec3 btc = vec3(0, 255, 242)/255.0; // 電流軌跡顏色（青色）
const vec3 bgc = vec3(7, 3, 33)/255.0;    // 背景顏色（極深紫色）
const float lum = 4.;                     // 亮度倍率
```

### 3.2 暈影效果（Vignette）

```glsl
vec3 vig (vec2 uv) {
    vec2 center = vec2(iResolution.x / 2.f, iResolution.y / 2.f) / iResolution.xy;
    float dist = 1.f-distance(uv, center);
    float vig = smoothstep(INNER_RADIUS, OUTER_RADIUS, dist);
    vec3 col = vec3(0.5f,0.5f,0.5f);
    return mix(col, col * vig, MIX_RATE);
}
```

- `INNER_RADIUS = 0.5`，`OUTER_RADIUS = 0.85`
- 螢幕中心亮，邊緣暗的漸變效果
- `MIX_RATE = 0.4` 控制暈影強度（0.4 = 較輕微的暈影）

### 3.3 方向到顏色映射 `dir_to_col`

```glsl
vec3 dir_to_col(vec4 p, vec2 uv) {
    vec2 dir = p.xy;
    float life = p.z;
    float h = p.w;
    vec3 bg = bgc * (vig(uv));

    vec3 result;
    if (vec3(dir, life) == vec3(0)) {       // 背景
        result = bg;
    }
    else if (dir == vec2(0)) {              // 軌跡
        vec3 tc = h < br ? ctc : btc*2.;   // 普通=深紫，電流=亮青
        result = mix(tc, bg, 1.-life);      // 按生命值淡出到背景色
    }
    else if (dir != vec2(0)) result = pc;   // 活躍粒子=白色

    return result * lum;
}
```

**三層渲染邏輯：**

| 條件 | 含義 | 顏色 |
|------|------|------|
| `dir == 0 && life == 0` | 完全空白的背景 | 深紫色 + 暈影 |
| `dir == 0 && life > 0` | 軌跡（粒子曾經過） | 深紫 or 青色，隨 life 淡出 |
| `dir != 0` | 活躍移動中的粒子 | 白色 |

- 電流軌跡 `btc * 2.` 特別明亮（青色值翻倍）
- `mix(tc, bg, 1-life)`：`life=1` 時完全顯示軌跡色，`life=0` 時完全變成背景色
- 最終乘以 `lum = 4.` 提升整體亮度

---

## 四、Image：直通輸出

```glsl
const vec2 offset = vec2(0.5);

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord+offset)/iResolution.xy;
    vec4 c = texture(iChannel0, uv);
    fragColor = c;
}
```

- 幾乎是直通，只添加了 0.5 像素的偏移
- 這個 `offset = vec2(0.5)` 是**像素中心對齊**修正：Shadertoy 的 `fragCoord` 是像素左下角，加 0.5 對齊到像素中心
- 讀取 Buffer B 的結果直接輸出

---

## 五、整體數據流

```
┌─────────────────────────────────────────┐
│              Common                      │
│  br, hash33, hash12, rr                  │
└────────┬───────────────────┬────────────┘
         │                   │
         ▼                   ▼
┌──────────────────┐    ┌──────────────────┐
│    Buffer A      │    │    Buffer B      │
│  方向/生命/分支   │───►│  顏色映射        │
│  (自讀: iChannel0)│   │  (讀 A: iChannel0)│
│                  │    │                  │
│ .xy = 方向向量    │    │ 白/紫/青三色     │
│ .z  = 生命值     │    │ + 暈影           │
│ .w  = 電流機率    │    │                  │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │     Image        │
                        │  直通 + 0.5px    │
                        │  偏移           │
                        └──────────────────┘
```

**Buffer A 自讀循環：** Buffer A 讀取自身的上一幀（`iChannel0 = Buffer A`），實現粒子傳播的細胞自動機。

---

## 六、與 Shader 1 的比較

| 特性 | Shader 1 (curl noise) | Shader 2 (cellular) |
|------|----------------------|---------------------|
| 驅動方式 | curl noise 流場 | 鄰域傳播（細胞自動機） |
| 路徑可控性 | 不可控（noise 決定） | 不可控但可調初始方向 |
| 方向量化 | normalize→int 量化 | round(rot(±45°)) 量化 |
| 分支 | 無分支 | 有分支（在交叉點旋轉 ±45°） |
| 拖尾方式 | Buffer 自讀 × 0.97 | 生命值衰減（z × 0.99）+ 顏色 mix |
| 粒子數量 | 720（36×20 取樣） | 由 spawn rate 決定（極少量源頭） |
| 上色 | curl noise 疊加 RG | 三層分類（粒子/軌跡/背景） |
| 效能 | O(720) per pixel | O(9) per pixel（3×3 鄰域） |
| 視覺風格 | 密集流動線條 | 稀疏分支樹/閃電 |

---

## 七、總結

### 路徑生成算法
- **細胞自動機式傳播**：粒子方向向量在像素間傳遞，每幀向相鄰像素移動一格
- **分支機制**：當粒子到達有殘留生命的像素時，以 ±45° 分岔
- **方向永遠是量化的 8 方向**（通過 `round` 保證）

### Glow / Trail 效果
- **生命值衰減** `z *= 0.99`：軌跡逐漸消失
- **顏色插值** `mix(trail_color, bg_color, 1-life)`：柔和的淡出
- **雙色系統**：普通軌跡（深紫）vs 電流軌跡（明亮青色），30/70 隨機分配
- **暈影（Vignette）**增加深度感

### 優點
- **極高效能**：每像素只需檢查 3×3 = 9 個鄰居
- **自然分支**：產生類似閃電/神經網絡的分叉圖案
- **雙色調**區分電流和殘影，sci-fi 感很強
- **簡潔的架構**：Buffer A 處理邏輯，Buffer B 純粹上色

### 限制
- 粒子源極少（spawn rate = 1e-6），初始效果需要等待
- 分支是隨機的，不能控制在特定位置分岔
- 每幀只能移動 1 像素，速度受限於幀率
- 固定方向初始化（-0.3 弧度），缺乏多樣性

### 可借鑑的技術
1. **鄰域傳播模式**：超高效的粒子移動（O(9) per pixel）
2. **±45° 分支旋轉** `round(d * rot(π/4))`：保持量化方向的分岔
3. **生命值驅動的雙色軌跡**：普通 vs 電流，視覺層次分明
4. **細胞自動機思維**：粒子不是被「追蹤」的，而是通過規則「傳播」的
5. **Vignette + 多色分層**的 sci-fi 上色方案
