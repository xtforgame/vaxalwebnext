import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './Philosophy.module.css';

export default function Philosophy() {
  return (
    <SectionWrapper background="grey" className={styles.philosophySection} id="philosophy">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>我們就是最好的證明</h2>
        </div>
        
        <p className={styles.quote}>
          "How do we know it works? We built our entire company on it."
        </p>
        
        <div className={styles.description}>
          <p style={{ fontSize: '1.125rem', color: 'var(--muted-text)', lineHeight: '1.8', marginBottom: '40px' }}>
            Ryko、BrevFlow、SoloistBoard 這些複雜系統，正是思序網路 (Vaxal) 使用自身開發的 AI 工作流與 Vibe Coding 打造出來的。我們不只是理論家，更是這套生產力革命的第一批受益者。
          </p>
        </div>

        <div className={styles.valuesGrid}>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>落地的價值</h3>
            <p className={styles.valueDescription}>不賣展示用的 Demo。每一階段的導入，都必須轉化為可量化的實質效率提升。</p>
          </div>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>透明的治理</h3>
            <p className={styles.valueDescription}>主動提供 AI 對話紀錄導出服務。客戶留下是因為信賴我們的價值，而非因為技術黑盒。</p>
          </div>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>共生式的夥伴關係</h3>
            <p className={styles.valueDescription}>來自新創基因，我們感同身受企業成長的痛點。我們要做的是陪跑的夥伴，而非旁觀的顧問。</p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
