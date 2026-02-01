import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './about.module.css';

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <SectionWrapper>
          <span className={styles.badge}>Our Story</span>
          <h1 className={styles.title}>
            Intelligence is <br/>
            the New Standard.
          </h1>
          <p className={styles.subtitle}>
            Born from the intersection of enterprise software and AI research, Vaxal is built to bridge the gap between technical potential and corporate reality.
          </p>
        </SectionWrapper>
      </header>

      <SectionWrapper className={styles.philosophy}>
        <div className={styles.contentGrid}>
          <div>
            <h2 className={styles.sectionTitle}>The Vision</h2>
            <p className={styles.leadText}>
              我們深信 AI 不應只是孤立的工具，而是企業流動的血液。
            </p>
            <p>
              思序網路 (Vaxal) 的成立初衷很單純：讓複雜的技術變得可治理、可擴展且具備具體的商業價值。我們不追求虛幻的 AI 泡沫，我們追求的是能實質推動產業進步的「數位基建」。
            </p>
          </div>
          <div className={styles.valuesCard}>
            <h3>Our Core Values</h3>
            <ul>
              <li><strong>Scale with Trust:</strong> 規模化必須建立在安全與透明的基礎上。</li>
              <li><strong>Value {'>'} Price:</strong> 我們交付的是長期的技術資產，而非短期的人力。</li>
              <li><strong>Vibe Coding:</strong> 用最高效、最直覺的方式達成複雜的工程目標。</li>
            </ul>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper background="grey" className={styles.team}>
        <h2 className={styles.sectionTitle}>The DNA</h2>
        <div className={styles.teamContent}>
          <p>
            我們的團隊成員來自頂尖軟體企業與創新實驗室。我們融合了大公司的嚴謹品質控管與小團隊的極速敏捷開發。
          </p>
          <div className={styles.foundersRef}>
             {/* Refers back to homepage team section or duplicates key info */}
             Rick Chen (Strategy), Marson Mao (Technology), Jack Lin (Engineering)
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
