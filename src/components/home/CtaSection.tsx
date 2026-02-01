import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './CtaSection.module.css';

export default function CtaSection() {
  return (
    <SectionWrapper id="contact" className={styles.ctaSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Ready to Build with Trust?</h2>
        <p className={styles.subtitle}>
          從一個小痛點開始。讓我們展示 AI 如何能為您的企業帶來具體、可量化的改變。
        </p>
        <div className={styles.buttonGroup}>
          <Button size="lg" href="/contact">
            Start Your Pilot
          </Button>
          <Button variant="outline" size="lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }} href="/about">
            Learn More About Us
          </Button>
        </div>
      </div>
    </SectionWrapper>
  );
}
