import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from '@/components/products/ProductLayout.module.css';
import Button from '@/components/ui/Button';

export default function SoloistBoardPage() {
  return (
    <>
      <SectionWrapper className={styles.heroSection} padding="none">
        <div className={styles.heroContent}>
          <span className={styles.heroTag}>AI Governance</span>
          <h1 className={styles.heroTitle}>
            Project Management <br />
            that Drives Itself.
          </h1>
          <p className={styles.heroSubtitle}>
            SoloistBoard 是 AI 時代的 Trello。在這裡，不同的 Ryko Agent 扮演 PM、規格撰寫者與工程師。它們不僅是卡片上的頭像，而是主動推進進度的生產力引擎。
          </p>
          <div style={{ marginTop: '48px' }}>
            <Button size="lg" href="/contact">Get Early Access</Button>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper className={styles.assertionSection}>
        <div className={styles.assertionWrapper}>
          <h2 className={styles.assertionTitle}>從「管理」走向「自律」</h2>
          <p className={styles.assertionText}>
            專案軟體不該只是紀錄狀態的死板工具。SoloistBoard 賦予看板生命。
            當您建立一個需求卡片，負責「規格」的 Agent 會主動詢問細節；負責「開發」的 Agent 會開始撰寫代碼。我們將專案開發變成一場 AI 與人的協奏曲。
          </p>
        </div>
      </SectionWrapper>

      <SectionWrapper className={styles.stepsSection}>
        <div className={styles.stepsHeader}>
          <h2 className={styles.stepsTitle}>Active Governance</h2>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>01</span>
            <h3 className={styles.stepTitle}>Role-Based Agents</h3>
            <p className={styles.stepDesc}>
              專款專用。您可以為專案配置不同的 Agent 角色：Product Owner Agent 負責釐清需求邊界，Tech Lead Agent 負責架構審查。它們在看板上擁有自己的身分與職責。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: Kanban board columns with Agent avatars on top ]
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>02</span>
            <h3 className={styles.stepTitle}>Proactive Push</h3>
            <p className={styles.stepDesc}>
              告別被動等待。SoloistBoard 的 Agent 會主動檢查卡片停滯時間，發送提醒，甚至自動生成會議摘要或日報。它確保專案永遠保持向前推進的動能。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: Notification popups from Agents nudging the progress ]
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>03</span>
            <h3 className={styles.stepTitle}>Unified Context</h3>
            <p className={styles.stepDesc}>
              所有 Agent 共享同一個專案上下文。無論是文件、對話紀錄還是代碼變更，都成為 Agent 的長期記憶。這大幅降低了人類與 AI 之間重複溝通的成本。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: A central brain connecting to various project artifacts ]
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
