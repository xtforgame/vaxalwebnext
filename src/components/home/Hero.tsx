import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <SectionWrapper className={styles.heroSection}>
      <div className={styles.heroContent}>
        <div className={styles.textContent}>
          <h1 className={styles.headline}>
            Build with Intelligence.<br />
            Scale with Trust.
          </h1>
          <p className={styles.subheadline}>
            反對 AI 泡沫，我們只交付可量化的真實成果。<br />
            從無痛試點到企業級治理，思序網路是您最堅實的技術夥伴。
          </p>
          <div className={styles.ctaGroup}>
            <Button size="lg" href="/contact">
              Start Pilot
            </Button>
            <Button variant="outline" size="lg" href="/case-study">
              View Case Study
            </Button>
          </div>
        </div>
        
        <div className={styles.visualContent}>
          {/* TODO: Replace with Ryko Agent Animation */}
          <div className={styles.mockupPlaceholder}>
            [ Ryko Agent UI Animation ]<br />
            Show: User Ask - AI Answer - Impact
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
