import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from '@/components/products/ProductLayout.module.css';
import Button from '@/components/ui/Button';

export default function BrevFlowPage() {
  return (
    <>
      <SectionWrapper className={styles.heroSection}>
        <div className={styles.heroContent}>
          <span className={styles.heroTag}>AI Automation Flow</span>
          <h1 className={styles.heroTitle}>
            Workflow Automation,<br />
            Reimagined for Agents.
          </h1>
          <p className={styles.heroSubtitle}>
            BrevFlow 是專為 AI 時代打造的工作流平台。這裡的節點不只是死板的 API 觸發器，而是具備判斷力的 Ryko Agent。就像指派任務給一群數位同事，而非編寫一段腳本。
          </p>
          <div style={{ marginTop: '48px' }}>
            <Button size="lg" href="/contact">Start Automating</Button>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper className={styles.assertionSection}>
        <div className={styles.assertionWrapper}>
          <h2 className={styles.assertionTitle}>從「觸發」走向「協作」</h2>
          <p className={styles.assertionText}>
            傳統自動化 (Zapier/n8n) 雖然強大，但處理不了模糊的判斷。
            BrevFlow 引入了「Agent Node」。當流程遇到需要決策的節點時，交給 AI 判斷，處理完再繼續執行。這讓自動化不再容易因為例外狀況而中斷。
          </p>
        </div>
      </SectionWrapper>

      <SectionWrapper className={styles.stepsSection}>
        <div className={styles.stepsHeader}>
          <h2 className={styles.stepsTitle}>Flow Mechanics</h2>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>01</span>
            <h3 className={styles.stepTitle}>Agent as a Node</h3>
            <p className={styles.stepDesc}>
              在工作流中直接嵌入 Ryko Agent。您可以設定這個節點的角色（例如：「資深編輯」），並給予它上下文。它會像真人一樣處理輸入的資料，產出高品質的結果。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: A flow chart where one node is a glowing brain/avatar ]
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>02</span>
            <h3 className={styles.stepTitle}>Collaborative Mesh</h3>
            <p className={styles.stepDesc}>
              串聯多個 Agent 形成協作網。由「研究員 Agent」蒐集資料，交給「分析師 Agent」撰寫報告，最後由「審核 Agent」檢查。BrevFlow 管理這中間所有的訊息傳遞與狀態同步。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: Multiple agents passing documents to each other in a sequence ]
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>03</span>
            <h3 className={styles.stepTitle}>Human-in-the-Loop</h3>
            <p className={styles.stepDesc}>
              保持控制權。在關鍵節點設置人工審核機制。當 AI 信心分數不足，或涉及高風險操作時，BrevFlow 會自動暫停並通知並通知管理員介入，確保安全。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: A flow pausing at a lock icon, waiting for user approval ]
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
