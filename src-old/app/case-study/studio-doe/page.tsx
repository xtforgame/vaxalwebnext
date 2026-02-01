import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './studio-doe.module.css';

export default function StudioDoeCase() {
  return (
    <div className={styles.casePage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <SectionWrapper background="transparent" padding="none">
          <span className={styles.badge}>E-commerce Infrastructure</span>
          <h1 className={styles.title}>
            Powering Studio Doe&apos;s<br />
            Digital Transformation.
          </h1>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <label>Client</label>
              <span>Studio Doe</span>
            </div>
            <div className={styles.metaItem}>
              <label>Service</label>
              <span>Infrastructure & AI Roadmap</span>
            </div>
            <div className={styles.metaItem}>
              <label>Timeline</label>
              <span>Long-term Partner</span>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* Challenge & Approach */}
      <SectionWrapper background="white" className={styles.section}>
        <div className={styles.contentGrid}>
          <div className={styles.textBlock}>
            <h2 className={styles.sectionTitle}>The Challenge</h2>
            <p>
              身為台灣頂尖的時裝品牌，Studio Doe 在大促期間面臨極端的流量峰值。傳統的單體架構已無法支撐品牌的高速成長，亟需一套高可用、可擴展且能深度整合後續 AI 功能的技術基建。
            </p>
            <p>
              「穩定」只是基本，「彈性」與「前瞻性」才是決定品牌長期競爭力的關鍵。
            </p>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>100%</span>
              <span className={styles.statLabel}>Peak Uptime during Flash Sales</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>100M+</span>
              <span className={styles.statLabel}>Annual Revenue Supported</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>90%</span>
              <span className={styles.statLabel}>Reduction in Deployment Time</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>Sub-2s</span>
              <span className={styles.statLabel}>Page Load Time Worldwide</span>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Visual / Solution */}
      <SectionWrapper background="grey" className={`${styles.section} ${styles.solutionSection}`}>
        <h2 className={styles.sectionTitle} style={{ textAlign: 'center' }}>The Solution: Modular Architecture</h2>
        <p className={styles.solutionIntro}>
          思序網路 (Vaxal) 協助 Studio Doe 從架構底層出發，建立了完整的 CI/CD 流程、微服務化組件，並導入了基於 Ryko 的 AI 實驗室環境。
        </p>
        <div className={styles.fullVisual}>
          High-Resolution Visual: Infrastructure Map with Real-time Traffic Visualization
        </div>
      </SectionWrapper>

      {/* Result Section */}
      <SectionWrapper background="white" className={`${styles.section} ${styles.impactSection}`}>
        <div className={styles.contentGrid}>
          <div className={styles.textBlock}>
            <h2 className={styles.sectionTitle}>The Impact</h2>
            <p>
              現在，Studio Doe 不再需要擔心促銷活動導致的系統崩潰。品牌團隊可以專注於創意與行銷，而技術基建則由 Vaxal 提供最堅實的後盾。
            </p>
            <p>
              這套系統也為後續的 AI 尺寸推薦、智能補貨系統打下了完美的數據與接口基礎。
            </p>
            <Button size="lg" href="/contact">Start Your Journey</Button>
          </div>
          <div className={styles.testimonialCard}>
            <blockquote className={styles.testimonialQuote}>
              「思序網路不只是開發商，更是我們的技術策略合夥人。他們解決了我們最恐懼的穩定性問題，並陪著我們探索未來的可能性。」
            </blockquote>
            <p className={styles.testimonialAuthor}>— An Chih, Founder of Studio Doe</p>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
