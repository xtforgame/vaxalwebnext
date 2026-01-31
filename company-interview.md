# 思序網路 (Si Xu Network) 訪談紀錄與產品核心整理

## 1. 產品矩陣 (Product Matrix)
我們擁有完整的 AI 產品線，但目前的商業模式主軸是「顧問 + 客製化導入 (Consulting + Customization)」，產品是達成服務的強大工具。

*   **Ryko (The Core Brain)**
    *   **定位**：AI 核心運行環境 (LLM Runtime Environment)。
    *   **特色**：支援 MCP (Model Context Protocol)、Skill、Multimodal。可自由切換模型，支援**全離線部署 (Local Model)**。
    *   **角色**：所有 AI 應用的基石，也是推給客戶的第一個建設。
*   **BrevFlow (The Nervous System)**
    *   **定位**：AI 自動化工作流平台 (AI Native Workflow)。
    *   **概念**：Zapier 的 AI 進化版。
    *   **特色**：節點不只是工具，還可以是 "Ryko Agent"。工作流就像是多個 AI 同事在協作 (e.g., 搜集新聞 -> 議題分析 -> 文案撰寫 -> 圖片生成 -> 廣告投放)。
*   **SoloistBoard (The Management Logic)**
    *   **定位**：AI 專案治理平台 (AI Project Management)。
    *   **概念**：AI 版的 Trello。
    *   **特色**：不同的 Ryko Agent 扮演不同角色 (PM, Spec Writer, Dev) 在看版上推進專案。從「被動執行流程」轉變為「主動治理專案」。
*   **FormalDoc (The Output Engine)**
    *   **定位**：文件標準化與生成系統。
    *   **功能**：將企業標準 docx 轉為樣板，並生成對應的 MCP Server，讓 AI 能產出符合正規格式的最終文件。
*   **VXL EC (The Enterprise Case)**
    *   **定位**：模組化、高客製電商架構。
    *   **案例**：Studio Doe。
    *   **策略**：作為展示技術實力的 "Hero Case"，但不作為行銷主推 (因為受眾太窄)。

---

## 2. 獲客與服務三部曲 (The 3-Step Engagement Strategy)
這是網站在 "How it works" 區塊的核心敘事。目標是降低客戶門檻，建立長遠信任。

### Step 1: 痛點突圍 (Beachhead / The Pilot)
*   **核心行為**：針對客戶一個明確痛點，開發 MCP/Skill 並串接 Ryko Agent。
*   **商業邏輯**：**不收開發費 (Free Pilot)**。
*   **目標**：讓客戶「無痛」開始使用。確保他們真的有感且持續使用 (Stickiness)。
*   **關鍵字**：無風險 (Risk-free)、立即見效 (Instant Value)、核心場景 (Core Pain-point)。

### Step 2: 全域串聯 (Integration & Expansion)
*   **核心行為**：透過 **BrevFlow** 串接更多企業數據 (DB, File System) 與工作流。
*   **商業邏輯**：開始收費 (SaaS / 權限管理 / 協作機制)。
*   **目標**：從「單點工具」擴展為「自動化流水線」。
*   **場景**：跨部門/跨專業的複雜任務自動化。

### Step 3: 智能治理 (AI Governance)
*   **核心行為**：導入 **SoloistBoard**。
*   **商業邏輯**：規模化維運。
*   **目標**：由 AI 主動治理專案，可控、可稽核。
*   **價值**：企業級的 AI 管理 (Enterprise AI Management)。

---

## 3. 關鍵案例策略 (Studio Doe & VXL EC)
**定位：Infrastructure Validity (基礎建設的信任錨點)**

*   **不作為主推產品**：VXL EC 架構太過龐大且專精 (Enterprise E-commerce)，不適合當作大眾化 SaaS 推廣。
*   **作為實力證言 (Proof of Competence)**：
    *   **高併發驗證**：支撐年收數億等級、每秒破百訂單的搶票情境 -> 證明我們的系統架構是穩固的 (Battle-tested)。
    *   **AI 落地基礎**：證明我們的 AI 不是跑在沙盒裡的玩具，而是能整合進這種高複雜度、高動態的商業環境中。
    *   **顧問實力**：長期陪伴 Studio Doe 成長，證明我們具備「營運級」的顧問經驗，而不只是「接案後跑路」的技術外包。
*   **首頁策略**：**輕描淡寫 (Subtle Authority)**。只在 Trust Bar 或 Hero Case 區塊放一個 Logo 或一句話，不佔用 Step 1-2-3 的核心動線。
*   **內頁策略**：設立專門的 Case Study 頁面，詳細講述「如何用穩固架構支撐 AI 轉型」，滿足想深究技術實力的潛在客戶。

---

## 4. 顧問筆記與轉化方向 (Consultant Notes)
*   **敘事挑戰**：Step 2 & 3 概念較深。
*   **簡化策略**：
    *   Step 1 = **Connect** (試點啟動 / Pilot) - 視覺：Ryko Chat
    *   Step 2 = **Automate** (工作流串接 / Workflow) - 視覺：BrevFlow Graph
    *   Step 3 = **Scale** (智能治理 / Governance) - 視覺：SoloistBoard Kanban
