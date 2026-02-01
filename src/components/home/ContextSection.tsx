import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './ContextSection.module.css';

export default function ContextSection() {
  return (
    <SectionWrapper background="white" padding="none" className={styles.contextSection}>
      <div className={styles.container}>
        <p className={styles.leadText}>
          過去，數位轉型意味著 <span className={styles.highlight}>高昂成本</span>、<span className={styles.highlight}>漫長導入</span> 與 <span className={styles.highlight}>未知的成效</span>。
        </p>
        <h2 className={styles.mainStatement}>
          現在，LLM AI 時代抹平了門檻。<br />
          智慧不再是大型企業的奢侈品，而是每一間企業都能隨手取用的 <span className={styles.accent}>基礎建設</span>。
        </h2>
        <p className={styles.closingText}>
          這是一場全球同步的進步浪潮，而最好的入場時間，就是現在。
        </p>
      </div>
    </SectionWrapper>
  );
}
