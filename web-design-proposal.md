# 思序網路 (Si Xu Network) 2026 網站設計提案 (Web Design Proposal)

本提案旨在為思序網路打造一個「詳盡、現代化且具信賴感」的企業官網，透過 **Product-Led Service (產品化服務)** 的敘事策略，將深度的技術顧問服務與強大的 AI 產品線完美結合。

---

## 1. 核心策略與設計哲學 (Core Strategy)

### 1.1 品牌定位：The Growth Partner
思序網路不只是一間接案公司，而是**「結合大企業經驗與新創彈性」**的成長夥伴。
*   **Empathy (感同身受)**：因為懂從小變大的痛，所以提供無痛入門方案。
*   **Capability (技術賦能)**：利用 AI/Vibe Coding，以小團隊編制交付企業級成果。
*   **Trust (務實信賴)**：不賣口號，用 Studio Doe 等實戰成果說話。

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
    *   **Sub**: 從 AI 試點到企業級治理，我們是您最堅實的技術轉型夥伴。
    *   **Visual**: 右側展示 Ryko Agent 正在運作的 UI 動畫（暗示：這就是你即將擁有的能力）。
2.  **Trust Ecosystem**:
    *   Logo Wall: **Studio Doe** (Hero Client), **八維智能**, **宇鯨智能** (AI Partners), 加上技術堆疊 (Next.js, Vercel 等)。
3.  **The Method (The 3-Step Journey)**: *核心敘事區塊*
    *   **Step 1: Connect (Pilot)** - 無痛搶灘，Ryko Agent 解決單點痛點。
    *   **Step 2: Automate (Scale)** - BrevFlow 串接全域資料與工作流。
    *   **Step 3: Govern (Manage)** - SoloistBoard 實現 AI 主動治理。
4.  **Product Highlights**: 卡片式預覽四大產品，引導至獨立頁面。
5.  **Founder's Message**: 簡短強調「新創彈性 x 企業經驗」的理念。

### 2.2 產品頁 (Products) - 深度展示
每個產品 (Ryko, BrevFlow, SoloistBoard, FormalDoc) 擁有獨立 Landing Page，結構如下：
1.  **Product Hero**: 產品介面大圖 + 一句話價值 (e.g., Ryko: Your Private AI Runtime).
2.  **Key Features**: 3-4 個核心功能演示 (Scroll Reveal).
3.  **Use Cases**: 此產品如何應用於實際場景。
4.  **Integration**: 如何與您現有的系統 (DB, Docx) 結合。

### 2.3 關於我們 (About) - 人味與故事
1.  **The Genesis**: 三位台大/清大校友的故事。為何離開大企業與新創，選擇成立思序？
2.  **The DNA**: 結合 Enterprise 的嚴謹與 Startup 的速度。
3.  **The Team**: 核心成員介紹 (Rick, Marson, Jack)。
4.  **Partners**: 詳細介紹與八維、宇鯨的技術合作。

### 2.4 案例專頁 (Case Study: Studio Doe)
*   **Focus**: Infrastructure & Scalability.
*   **Story**: 支撐億級營收背後的技術債解決方案 -> 模組化重構 -> AI 賦能。
*   **Takeaway**: 思序網路具備處理高併發、高複雜度商業邏輯的能力。

### 2.5 招募 (Careers)
*   **Current Openings**: Business Development, Sales (Coming Soon placeholder).
*   **Culture**: 強調 Remote/Flexibility/AI-First 的工作環境。

---

## 3. 視覺設計方向 (Visual Direction)

*   **Style**: **Clean, Product-Led Tech**.
*   **Palette**:
    *   Primary: **Clean White** (#FFFFFF) - 專業、開放。
    *   Secondary: **Soft Grey** (#F5F7FA) - 區塊層次。
    *   Accent: **Vaxal Blue** (e.g., #2563EB) - 信任、科技、行動。
*   **Typography**: Inter (En) + Noto Sans TC (Ch) - 現代無襯線字體，高易讀性。
*   **Imagery**:
    *   盡量減少 Stock Photos (免費用圖)。
    *   大量使用 **UI Mockups** (產品介面圖) 和 **Abstract Tech Visuals** (抽象數據流)。

---

## 4. 技術執行規格 (Technical Spec)

*   **Frontend**: Next.js 14 (App Router)
*   **Styling**: Tailwind CSS - 快速開發，易於維護 Design System。
*   **Animation**: Framer Motion - 製作細膩的 Scroll Reveal 和 UI 互動細節。
*   **CMS (Optional)**: 考慮使用 MDX 或輕量級 Headless CMS (如 Strapi/Sanity) 管理案例與職缺內容。

---

## 5. 專案執行階段 (Execution Roadmap)

1.  **Design Foundation**: 確立 Design System (Color, Type, Components)。
2.  **Content First**: 根據本提案，產出各頁面的詳細文案草稿 (Copywriting)。
3.  **Prototype & Build**:
    *   Sprint 1: Global Layout & Homepage Structure.
    *   Sprint 2: Product Pages (Ryko first).
    *   Sprint 3: About & Case Study.
    *   Sprint 4: Polish & Mobile Optimization.
4.  **Launch**: SEO Setup, Sitemap submission, Deployment.
