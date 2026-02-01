import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './about.module.css';

const FOUNDERS = [
  {
    name: 'Rick Chen',
    role: 'CEO',
    bio: '專注於 AI 戰略與商業架構，深信 AI 應是企業成長的催化劑而非單純的工具替代。'
  },
  {
    name: 'Marson Mao',
    role: 'CTO',
    bio: '負責核心產品架構，擁抱 Vibe Coding 與自動化治理，致力於打造極致穩定的軟體基建。'
  },
  {
    name: 'Kathy Pan',
    role: 'COO',
    bio: '負責公司營運與流程優化，確保團隊在高速成長中維持穩健的執行力。'
  },
  {
    name: 'Jack Lin',
    role: 'Director, E-Commerce Solution',
    bio: '專長於高併發系統與自動化流程。感同身受企業從 0 到 100 的成長痛點。'
  }
];

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <SectionWrapper padding="none">
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
            <p style={{ color: 'var(--muted-text)', lineHeight: '1.7', fontSize: '1.125rem' }}>
              思序網路 (Vaxal) 的成立初衷很單純：讓複雜的技術變得可治理、可擴展且具備具體的商業價值。我們的目標很清晰：在 AI 浪潮中，為企業打造能實質推動產業進步的「數位基建」。
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

      <SectionWrapper background="white" className={styles.team}>
        <h2 className={styles.sectionTitle}>The DNA</h2>
        <div className={styles.teamContent}>
          <p style={{ fontSize: '1.125rem', color: 'var(--muted-text)', lineHeight: '1.7', marginBottom: '40px' }}>
            我們是一群來自台大、清大的校友，團隊成員更來自頂尖軟體企業與創新實驗室。我們融合了大公司的嚴謹品質控管與小團隊的極速敏捷開發。
          </p>
          
          <div className={styles.foundersGrid}>
            {FOUNDERS.map((founder) => (
              <div key={founder.name} className={styles.founderCard}>
                <div className={styles.avatarPlaceholder}>Vaxal</div>
                <h3 className={styles.founderName}>{founder.name}</h3>
                <p className={styles.founderRole}>{founder.role}</p>
                <p className={styles.founderBio}>{founder.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
