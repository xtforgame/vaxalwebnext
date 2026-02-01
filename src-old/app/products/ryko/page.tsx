import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from '@/components/products/ProductLayout.module.css';
import Button from '@/components/ui/Button';

export default function RykoPage() {
  return (
    <>
      {/* 1. Philosophy: The Engine */}
      <SectionWrapper className={styles.heroSection} padding="none">
        <div className={styles.heroContent}>
          <span className={styles.heroTag}>Core Infrastructure</span>
          <h1 className={styles.heroTitle}>
            The Operating System <br />
            for Enterprise Intelligence.
          </h1>
          <p className={styles.heroSubtitle}>
            Ryko 不僅是一個 AI 模型容器，它是連接企業資料與 LLM 的核心運行環境。支援 MCP 協議、Skill 掛載與多模態交互，讓 AI 理解您的業務語言。
          </p>
          <div style={{ marginTop: '48px', display: 'flex', gap: '16px' }}>
            <Button size="lg" href="/contact">Deploy Ryko</Button>
          </div>
        </div>
      </SectionWrapper>

      {/* 2. Assertion: Why this matters (Context) */}
      <SectionWrapper className={styles.assertionSection}>
        <div className={styles.assertionWrapper}>
          <h2 className={styles.assertionTitle}>從「對話」走向「執行」</h2>
          <p className={styles.assertionText}>
            大多數 AI 應用仍停留在 Chatbot 階段，無法觸及企業核心資料。
            Ryko 打破了這道牆。它是一個標準化的運行環境，能讓 LLM 安全地透過工具 (Tools) 讀寫企業內部 API，將 AI 的角色從「諮詢顧問」轉變為「實戰員工」。
          </p>
        </div>
      </SectionWrapper>

      {/* 3. Method: How it works */}
      <SectionWrapper className={styles.stepsSection}>
        <div className={styles.stepsHeader}>
          <h2 className={styles.stepsTitle}>Capabilities</h2>
          <p className={styles.stepsSubtitle}>企業級 AI 運行的三大基石</p>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>01</span>
            <h3 className={styles.stepTitle}>MCP Standard Support</h3>
            <p className={styles.stepDesc}>
              全面支援 Model Context Protocol (MCP)。您的內部工具只需撰寫一次，即可被 Ryko 驅動的任何模型調用。透過標準化接口，讓 AI 精準調度企業資源。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Animation: Ryko dispatching tasks to various MCP Servers ]
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>02</span>
            <h3 className={styles.stepTitle}>Multi-Model Agnostic</h3>
            <p className={styles.stepDesc}>
              不被單一模型綁架。Ryko 允許您在 GPT-4, Claude 3 或 Llama 3 之間自由切換。根據任務難度選擇最合適的模型，平衡成本與效能。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: Switching models (OpenAI → Anthropic → Local Llama) seamlessly ]
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>03</span>
            <h3 className={styles.stepTitle}>Offline & Privacy First</h3>
            <p className={styles.stepDesc}>
              對於敏感資料，Ryko 支援完全離線部署 (Air-gapped)。配合本地端模型，確保數據在您的機房內閉環運行，符合最嚴格的資安規範。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: Shield icon protecting a server rack, data staying inside ]
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
