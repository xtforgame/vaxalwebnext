import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './CaseTeaser.module.css';

export default function CaseTeaser() {
  return (
    <SectionWrapper background="dark" id="case-study">
      <div className={styles.content}>
        <div className={styles.textSide}>
          <span className={styles.tag}>Hero Case Study</span>
          <h2 className={styles.title}>
            Decoding the Infrastructure behind a Leading Fashion Brand.
          </h2>
          <p className={styles.description}>
            我們為 Studio Doe 打造了具備「高併發、極致穩定、深度模組化」的 EC 基建。在面對億級營收的流量高峰與複雜行銷場景下，依然保持零失誤的高效維運。
          </p>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <h4>100%</h4>
              <p>Peak uptime during major drops</p>
            </div>
            <div className={styles.statItem}>
              <h4>100M+</h4>
              <p>Annual revenue supported</p>
            </div>
          </div>

          <Button size="lg" href="/case-study/studio-doe">
            Read Full Case Study
          </Button>
        </div>

        <div className={styles.visualSide}>
          <span className={styles.visualLabel}>
            Studio Doe Infrastructure Visualization<br />
            Modules | Traffic Peaks | Managed Logic
          </span>
        </div>
      </div>
    </SectionWrapper>
  );
}
