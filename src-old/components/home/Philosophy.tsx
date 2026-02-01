import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './Philosophy.module.css';

export default function Philosophy() {
  return (
    <SectionWrapper background="white" id="philosophy">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>我們就是最好的證明</h2>
        </div>

        <p className={styles.quote}>
          How do we know it works? We built our entire company on it.
        </p>

        <p className={styles.description}>
          Ryko、BrevFlow、SoloistBoard 這些複雜系統，正是思序網路 (Vaxal) 使用自身開發的 AI 工作流與 Vibe Coding 打造出來的。我們不只是理論家，更是這套生產力革命的第一批受益者。
        </p>

        <div className={styles.valuesGrid}>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>落地的價值</h3>
            <p className={styles.valueDescription}>
              不賣展示用的 Demo。每一階段的導入，都必須轉化為可量化的實質效率提升。
            </p>
          </div>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>透明的治理</h3>
            <p className={styles.valueDescription}>
              主動提供 AI 對話紀錄導出服務。客戶留下是因為信賴我們的價值，而非因為技術黑盒。
            </p>
          </div>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>夥伴心態</h3>
            <p className={styles.valueDescription}>
              出身新創，我們理解成長的痛。我們是與你並肩奔跑的戰友，而非在旁觀看的顧問。
            </p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
