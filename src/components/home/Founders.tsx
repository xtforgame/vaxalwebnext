import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './Founders.module.css';

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

export default function Founders() {
  return (
    <SectionWrapper background="grey" id="team">
      <div className={styles.header}>
        <h2 className={styles.title}>The Team DNA</h2>
        <p className={styles.subtitle}>
          我們是一群來自台大、清大的校友，團隊成員更來自頂尖軟體企業與創新實驗室。我們融合了大公司的嚴謹品質控管與小團隊的極速敏捷開發。
        </p>
      </div>

      <div className={styles.grid}>
        {FOUNDERS.map((founder) => (
          <div key={founder.name} className={styles.founderCard}>
            <div className={styles.avatarPlaceholder}>Vaxal</div>
            <h3 className={styles.founderName}>{founder.name}</h3>
            <p className={styles.founderRole}>{founder.role}</p>
            <p className={styles.founderBio}>{founder.bio}</p>
          </div>
        ))}
      </div>

      <div className={styles.philosophyBox}>
        <h3 className={styles.philosophyTitle}>Our Philosophy: Value {'>'} Price</h3>
        <p className={styles.philosophyText}>
          我們不是在旁觀看的顧問，而是與你並肩奔跑的戰友。我們堅持價值優先於價格，在 AI 時代，用最高效的方式為客戶交付最具競爭力的成果。
        </p>
      </div>
    </SectionWrapper>
  );
}
