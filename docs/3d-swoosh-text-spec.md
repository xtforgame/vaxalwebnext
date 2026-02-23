# 3D 斜向文字動畫規格書

## 一、核心概念

文字**不是水平排列的**。整段標題沿著一條 **3D 斜向軌道** 排列。軌道方向：**左近（大）→ 右遠（小）**。

參考 `public/expect.png`：Controls 面板左側靠近鏡頭（字大），右側遠離鏡頭（字小）。文字也應呈現相同效果。

視覺上，靜止時的文字看起來像這樣（示意，俯瞰圖）：

```
鏡頭（觀看者）
  |
  |    D ← 第一個字，左側，靠近鏡頭，透視放大，字最大
  |     i
  |      s
  |       t         ← 字元沿斜線往右遠方排列
  |        a
  |         n
  |          t ← 最後一個字，右側，遠離鏡頭，字最小
```

正面看到的效果：
```
D                    ← 最大（最靠近鏡頭）
 i
  s
   t                 ← 字元從左上往右下微斜排列
    a
     n
      t              ← 最小（最遠離鏡頭）
```

---

## 二、軌道定義

軌道是一條 3D 空間中的直線，具有三個軸向的變化：

| 軸 | 第一個字元（左側） | 最後一個字元（右側） | 含義 |
|---|---|---|---|
| **X（水平）** | 左側（小值） | 右側（大值） | 左→右 |
| **Y（垂直）** | 偏上（小值） | 偏下（大值） | 上→下（略微） |
| **Z（深度）** | 靠近鏡頭（正值，大） | 遠離鏡頭（負值或小值） | 近→遠 |

配合 CSS `perspective`，Z 軸正值（靠近鏡頭）的字元會透視放大，Z 軸負值（遠離鏡頭）的會縮小。**左側的字最靠近鏡頭所以最大，右側最遠所以最小。**

---

## 三、每個字元的位置計算

每個字元 `i`（從 0 到 N-1）的 **靜止位置** 由以下公式決定：

```
restX = i * stepX       // stepX > 0（往右走）
restY = i * stepY       // stepY > 0（微微往下）
restZ = startZ + i * stepZ  // stepZ < 0（往遠處走）
```

- 字元 0（第一個字）：`X=0, Y=0, Z=startZ`（左側，近，大）
- 字元 N-1（最後一個字）：`X=(N-1)*stepX, Y=(N-1)*stepY, Z=startZ+(N-1)*stepZ`（右側，遠，小）

**不能用普通的 CSS 文字流（inline text flow）**，每個字元必須用 `position: absolute` 搭配 `translate3d(restX, restY, restZ)`。

### 參考數值

Title：
- `stepX = 2.4vw`（每個字往右 2.4vw）
- `stepY = 0.3vw`（每個字往下 0.3vw）
- `startZ = 200px, stepZ = -15px`（第一個字 Z=200 靠近鏡頭，每個字往遠處退 15px）

Subtitle：
- 起始位置在 title 下方（baseY = 5vw）
- `stepX = 0.7vw, stepY = 0.1vw`（副標字較小，排列更密）
- Z 從 title 結束位置附近繼續遞減

---

## 四、進場 / 離場動畫

進出都沿同一方向（右→左的掃過動線）：

### 進場（pre-enter → enter）

字元從軌道的**右遠方**（更右、更下、更遠離鏡頭）滑入靜止點：

```
pre-enter: translate3d(restX + offX, restY + offY, restZ - offZ)
enter:     translate3d(restX, restY, restZ)
```

### 離場（enter → exit）

字元從靜止點繼續往軌道的**左近方**（更左、更上、更靠近鏡頭）滑出，「擦過」鏡頭後消失：

```
exit: translate3d(restX - offX, restY - offY, restZ + offZ)
```

離場時 Z 值增大（更靠近鏡頭），字元在消失前會因透視而短暫放大 — 這就是「擦過鏡頭」的衝擊感。

---

## 五、容器設定

- `perspective: 500px`（強透視效果）
- `perspectiveOrigin: '0% 50%'`（消失點在左側，強化左近右遠的透視差）
- **不需要** `rotateY/rotateX/rotateZ`（深度由每個字元的 Z 值直接控制）

---

## 六、Stagger 時間

維持原案例（variant-2）的規格不變：

| 項目 | 值 |
|---|---|
| 字元間隔 | 20ms |
| 單字動畫時間 | 0.35s |
| Title stagger | 反向（最後一個字先動，第一個字最後動） |
| Subtitle stagger | 在 title 全部之後，同樣反向 |
| 進場 easing | `cubic-bezier(0.22, 1, 0.36, 1)`（exaggerated ease-out） |
| 離場 easing | `cubic-bezier(0.55, 0, 1, 0.45)`（ease-in） |

---

## 七、驗證標準

1. 靜止時文字**不是水平的** — 第一個字（左側）明顯比最後一個字（右側）大
2. 字元沿一條從**左上近處到右下遠處**的斜線排列，存在明顯的**高低差、水平差、深度差（透視縮放差）**
3. 視覺效果與 `public/expect.png` 的 Controls 面板類似：左大右小的透視
4. 進場方向：字元從軌道的「更右更下更遠」方向滑入
5. 離場方向：字元往軌道的「更左更上更近」方向滑出（擦過鏡頭）
6. Title 先於 subtitle 進場（反向 stagger）
7. `public/bug.png` 的水平文字排列必須消除
