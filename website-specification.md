# 思序網路 (Si Xu Network) 官方網站 - 功能與設計規格書

## 1. 專案概述 (Project Overview)
*   **專案名稱**：思序網路 (Vaxal / Si Xu Network) 2026 官網改版
*   **核心目標**：打造一個「詳盡、現代化且具信賴感」的形象網站。
*   **設計哲學**：**Product-Led Service (產品化服務)**。
    *   借鏡 SaaS 產品網頁的敘事邏輯（具體演示、清晰步驟），來包裝高度客製化的顧問服務。
    *   **Show, Don't Tell**：最大化使用 UI 模擬動畫、架構圖演示，減少抽象形容詞。

---

## 2. 品牌識別 (Brand Identity)
*   **核心關鍵字**：Infrastructure (穩固基建), Intelligence (AI 賦能), Trust (信賴實績), Scalability (規模化能力)。
*   **Slogan (Headline 暫定)**：
    *   Main: **Build with Intelligence. Scale with Trust.**
    *   Sub: 從 AI 試點到企業級治理，思序網路是您最堅實的技術轉型夥伴。
*   **視覺風格 (Visual Direction)**：
    *   參考對象：`getformflow.io`
    *   **配色**：
        *   **Base**: Clean White / Light Grey (大面積留白，展現專業與自信)。
        *   **Accent**: Vaxal Blue/Teal (科技感強調色)。
        *   **Dark Mode**: 針對 "AI Tech" 區塊 (如 Ryko 演示) 使用深色玻璃擬態 (Glassmorphism)，創造沈浸感。
    *   **排版**：高寬容度 (Generous Whitespace)、大圓角 (Approachable Tech)。

---

## 3. 網站架構 (Sitemap)

### 3.0 全站導覽 (Navigation)
*   **Left**: Logo (Si Xu / Vaxal)
*   **Right**: Services, Method (Step 1-2-3), Case Study (Studio Doe), About
*   **CTA Button**: "Start Pilot" (開啟試點)

### 3.1 首頁 (Homepage) - 核心戰場
採用線性敘事，引導使用者從認知到行動。

| 區塊 (Section) | 內容重點 (Key Content) | 視覺呈現 (Visual Strategy) |
| :--- | :--- | :--- |
| **Hero** | 價值主張 (Slogan) + Email Capture (CTA) | **Split Layout**: 左側文案 + CTA；右側為 **Ryko Agent 運作動畫** (即時回應、解決問題)。 |
| **Trust Bar** | 實力背書 | 灰階 Logo Wall: **Studio Doe**, Next.js, OpenAI, Vercel 等技術與客戶標章。 |
| **Method (The 3 Steps)** | 合作三部曲 (Connect -> Automate -> Scale) | **Z-Pattern Layout**: <br>1. **Connect**: Ryko 對話視窗 (User Ask -> AI Answer)<br>2. **Automate**: BrevFlow 節點流動動畫 (Data -> Process -> Result)<br>3. **Scale**: SoloistBoard 看板畫面 (AIPM auto-moving cards) |
| **Services Grid** | 服務項目矩陣 | 卡片式佈局，列出 Ryko, BrevFlow, SoloistBoard, FormalDoc 四大產品線，強調它們如何支援顧問服務。 |
| **Infrastructure Case** | Studio Doe 預告 | 強調「高併發、模組化」的電商基建。僅作為信任背書，引導至詳細頁面。 |
| **Footer** | 聯絡資訊 | 簡潔的 Link List + Social Icons。 |

### 3.2 深度案例頁 (Case Study: Studio Doe)
*   **Title**: Decoding the Infrastructure behind a Leading Fashion Brand.
*   **Narrative**:
    *   **Challenge**: 搶票高併發、複雜變體管理、快速變動的行銷活動。
    *   **Solution**: VXL EC (模組化架構) + AI 輔助營運。
    *   **Result**: 穩定的億級營收支撐。
*   **CTA**: "Need this kind of stability?"

### 3.3 關於我們 (About)
*   強調團隊的新創基因 (Startup DNA) 與一條龍貼身顧問 (End-to-End Consultancy) 的服務精神。

### 3.4 聯絡我們 (Contact)
*   簡單明瞭的表單，區分需求類型 (Pilot 申請 / 企業諮詢)。

---

## 4. 技術規格 (Tech Stack)
*   **Framework**: Next.js 14+ (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS (Utility-first)
*   **Animation**: Framer Motion (用於 Scroll Reveal 與 UI 演示動畫)
*   **Icons**: Lucide React
*   **Deployment**: Vercel (Recommended) / Docker (Provided)

---

## 5. 開發階段規劃 (Development Phases)

### Phase 1: Foundation (基建)
*   專案初始化 (Next.js + Tailwind)。
*   Design System 建置 (Colors, Typography, Reusable Components)。
*   共用元件開發 (Navbar, Footer, Button, SectionWrapper)。

### Phase 2: Core Components (核心元件)
*   **Hero Visual**: 開發展示 Ryko 運作的 Mockup Component。
*   **Step Feature**: 開發展示 BrevFlow/SoloistBoard 的互動式圖表元件。
*   **Feature Card**: 服務項目卡片。

### Phase 3: Page Assembly (組裝)
*   Landing Page (Homepage) 完整組裝。
*   Case Study Page 組裝。
*   RWD 響應式調整。

### Phase 4: Polish (打磨)
*   **Micro-interactions**: 按鈕 Hover 效果、Scroll 視差。
*   **SEO**: Metadata 設定 (OpenGraph)。
*   **Content**: 文案填入 (由您提供素材，AI 潤飾)。
