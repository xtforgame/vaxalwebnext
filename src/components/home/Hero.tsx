import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <SectionWrapper background="base" padding="none" className={styles.heroSection}>
      <div className={styles.heroContent}>
        <div className={styles.textContent}>
          <h1 className={styles.headline}>
            <span className={styles.headlineAccent}>Build with Intelligence.</span><br />
            Scale with Trust.
          </h1>
          <p className={styles.subheadline}>
            我們將機器的智慧轉化為企業的資產，確保技術的每一分投資都有清晰、可量化的價值。從無痛試點到企業級治理，思序網路 (Vaxal) 是您最堅實的技術夥伴。
          </p>
          <div className={styles.ctaGroup}>
            <Button size="lg" href="/#contact">
              Start Pilot
            </Button>
            <Button variant="outline" size="lg" href="/case-study/studio-doe">
              View Case Study
            </Button>
          </div>
        </div>

        <div className={styles.visualContent}>
          <div className={styles.mockHeader}>
            <div className={styles.mockDots}>
              <span className={styles.mockDot}></span>
              <span className={styles.mockDot}></span>
              <span className={styles.mockDot}></span>
            </div>
            <span className={styles.mockTitle}>Ryko Agent</span>
          </div>

          <div className={styles.mockChat}>
            <div className={`${styles.mockMessage} ${styles.user}`}>
              <div className={styles.mockAvatar}>You</div>
              <div className={styles.mockBubble}>
                幫我分析 Q4 的銷售數據，找出表現最好的產品。
              </div>
            </div>

            <div className={`${styles.mockMessage} ${styles.agent}`}>
              <div className={styles.mockAvatar}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className={styles.mockBubble}>
                正在連接銷售資料庫... 找到 3 個表現最佳的產品：產品 A (+42%)、產品 B (+38%)、產品 C (+31%)。需要詳細分析嗎？
              </div>
            </div>

            <div className={`${styles.mockMessage} ${styles.user}`}>
              <div className={styles.mockAvatar}>You</div>
              <div className={styles.mockBubble}>
                好，幫我生成一份給主管會議的報告。
              </div>
            </div>
          </div>

          <div className={styles.mockInput}>
            <div className={styles.mockInputField}>
              Ask Ryko anything...
            </div>
            <div className={styles.mockSendBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
