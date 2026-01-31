# 思序網路 (Si Xu Network) 2026 網站設計提案 (Web Design Proposal)

本提案旨在為思序網路打造一個「詳盡、現代化且具信賴感」的企業官網，透過 **Product-Led Service (產品化服務)** 的敘事策略，將深度的技術顧問服務與強大的 AI 產品線完美結合。

---

## 1. 核心策略與設計哲學 (Core Strategy)

### 1.1 品牌定位：The Pragmatic Growth Partner
思序網路不只是一間接案公司，而是**「結合大企業經驗與新創彈性」**的成長夥伴，更是**「反對 AI 泡沫的務實主義者」**。

*   **Anti-Bubble (反泡沫)**：不賣未來的空泛大餅。我們承諾每一階段都有「可量化」的實質改善。
*   **Anti-Lock-in (反綁架)**：我們提供完整資料導出（含 AI 對話紀錄）。客戶留下是因為**信賴**，而非被迫依賴。
*   **Empathy (感同身受)**：團隊來自新創與大廠，深知成長痛點，因此提供無痛試點 (Pilot) 方案。

### 1.2 敘事邏輯：Show, Don't Tell
借鏡 `getformflow.io` 等現代 SaaS 網站，避免空泛的行銷術語，改用**「具體演示」**：
*   ❌ "We provide AI solutions."
*   ✅ **Show**: 一個 Ryko Agent 即時解決問題的對話視窗動畫。
*   ❌ "We streamline your workflow."
*   ✅ **Show**: BrevFlow 節點圖，資料從 A 流向 B 的動態過程。

---

## 2. 網站架構 (Information Architecture)

### 2.0 Global Elements
*   **Navigation**: Products (Dropdown), Solutions, Case Study, About, Careers, Contact.
*   **CTA**: "Start Pilot" (無痛啟動).

### 2.1 首頁 (Home) - 認知到行動的旅程
1.  **Hero Section**:
    *   **Headline**: **Build with Intelligence. Scale with Trust.**
    *   **Sub**: 反對 AI 泡沫，我們只交付可量化的真實成果。從無痛試點到企業級治理，思序網路是您最堅實的技術夥伴。
    *   **Visual**: 右側展示 Ryko Agent 正在運作的 UI 動畫（暗示：這就是你即將擁有的能力）。
2.  **Trust Ecosystem**:
    *   Logo Wall: **Studio Doe**, **八維智能**, **宇鯨智能**, Next.js, Vercel。
3.  **The Method (The 3-Step Journey)**: *核心敘事區塊*
    *   **Step 1: Connect (Pilot)** - 無痛搶灘，Ryko Agent 解決單點痛點。(強調：無風險、立即見效)
    *   **Step 2: Automate (Scale)** - BrevFlow 串接全域資料與工作流。(強調：資料串接、自動化)
    *   **Step 3: Govern (Manage)** - SoloistBoard 實現 AI 主動治理。(強調：企業級維運)
4.  **Concept: Dogfooding (我們就是證明)**:
    *   *文案*: "How do we know it works? We built our entire company on it."
    *   *敘事*: 強調 Ryko, BrevFlow, SoloistBoard 都是透過自身的 AI 工作流與 Vibe Coding 打造出來的。我們是自己產品的最大受益者。
5.  **Product Highlights**: 卡片式預覽四大產品。
6.  **Founder's Message**: Rick, Marson, Jack 的創業初衷。

### 2.2 產品頁 (Products) - 深度展示
每個產品 (Ryko, BrevFlow, SoloistBoard, FormalDoc) 擁有獨立 Landing Page，結構如下：
1.  **Product Hero**: 產品介面大圖 + 一句話價值.
2.  **Key Features**: 3-4 個核心功能演示.
3.  **Dogfooding Story**: 我們如何用這個工具加速自己的開發？
4.  **Integration**: 如何與您現有的系統 (DB, Docx) 結合。

### 2.3 關於我們 (About) - 人味與故事
1.  **The Genesis**: 三位台大/清大校友的故事。在「大企業僵化」與「新創不穩定」中找到第三條路。
2.  **The DNA**:
    *   **Vibe Coding**: 我們擁抱最新的開發典範。
    *   **Value > Price**: 重視價值創造，而非工時計算。
3.  **The Team**: 核心成員介紹。
4.  **Partners**: 技術生態系。

### 2.4 案例專頁 (Case Study)
*   **Studio Doe**: Infrastructure & Scalability (高併發驗證).
*   **Internal Case (Si Xu Network)**: AI Efficiency & Speed (純 AI 驗證).
    *   *Title*: How we built 3 SaaS products with a lean team using Vibe Coding.

### 2.5 招募 (Careers)
*   **Current Openings**: Business Development, Sales.
*   **Culture**: Remote, AI-First, Hacker Spirit.

---

## 3. 視覺設計方向 (Visual Direction)

*   **Style**: **Clean, Product-Led Tech**.
*   **Palette**:
    *   Primary: **Clean White** (#FFFFFF).
    *   Secondary: **Soft Grey** (#F5F7FA).
    *   Accent: **Vaxal Blue** (#2563EB).
*   **Typography**: Inter (En) + Noto Sans TC (Ch).
*   **Visual Elements**:
    *   **Code Snippets / Terminal**: 偶爾出現的程式碼元素，強調我們是 "Builders"。
    *   **Live UI Demos**: 高保真的介面錄影。

---

## 4. 技術執行規格 (Technical Spec)

*   **Frontend**: Next.js 14 (App Router).
*   **Styling**: Vanilla CSS / CSS Modules.
*   **Animation**: Framer Motion.
*   **Deployment**: Vercel.

---

## 5. 專案執行階段 (Execution Roadmap)

1.  **Design Foundation**: 確立 Design System.
2.  **Content First**: 產出詳細文案 (包含 Dogfooding Story 撰寫).
3.  **Prototype & Build**:
    *   Sprint 1: Global Layout & Homepage (含 3-Steps 動畫).
    *   Sprint 2: Product Pages.
    *   Sprint 3: About & Case Study.
4.  **Launch**: SEO, Deployment.
