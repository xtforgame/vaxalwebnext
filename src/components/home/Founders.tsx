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
    <SectionWrapper className={styles.foundersSection} id="about">
      <div className={styles.header}>
        <h2 className={styles.title}>The Team DNA</h2>
        <p className={styles.subtitle}>
          我們由來自各個軟體新創公司的成員組成。結合了大企業的嚴謹歷練與新創公司的極致彈性。
        </p>
      </div>
      
      <div className={styles.grid}>
        {FOUNDERS.map((founder) => (
          <div key={founder.name} className={styles.founderCard}>
            <div className={styles.avatarPlaceholder}>Logo</div>
            <h3 className={styles.founderName}>{founder.name}</h3>
            <p className={styles.founderRole}>{founder.role}</p>
            <p className={styles.founderBio}>{founder.bio}</p>
          </div>
        ))}
      </div>
      
      <div className={styles.philosophyBox}>
        <h3 className={styles.philosophyTitle}>我們的哲學：Value {'>'} Price</h3>
        <p className={styles.philosophyText}>
          我們不只是旁觀的顧問，而是陪跑的夥伴。我們重視價值創造而非工時計算。
          在 AI 時代，我們用最高效的方法 (Vibe Coding)，為客戶交付最具競爭力的成果。
        </p>
      </div>
    </SectionWrapper>
  );
}
