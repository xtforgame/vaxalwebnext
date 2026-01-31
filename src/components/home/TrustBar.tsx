import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './TrustBar.module.css';

const PARTNERS = [
  { name: 'Studio Doe' },
  { name: 'Eight Dimension' },
  { name: 'Cosmic Whale' },
  { name: 'Next.js' },
  { name: 'OpenAI' },
  { name: 'Vercel' },
];

export default function TrustBar() {
  return (
    <SectionWrapper className={styles.trustBar}>
      <h2 className={styles.title}>Trusted by leaders & powered by top-tier tech</h2>
      <div className={styles.logoGrid}>
        {PARTNERS.map((partner) => (
          <div key={partner.name} className={styles.logoItem}>
            {partner.name}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
