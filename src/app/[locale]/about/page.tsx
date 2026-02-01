import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './about.module.css';

export default async function AboutPage() {
  const t = await getTranslations('aboutPage');

  const DNA_ITEMS = [
    { title: t('dna1.title'), description: t('dna1.description') },
    { title: t('dna2.title'), description: t('dna2.description') },
    { title: t('dna3.title'), description: t('dna3.description') },
    { title: t('dna4.title'), description: t('dna4.description') },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <SectionWrapper padding="none" background="transparent">
          <span className={styles.badge}>{t('badge')}</span>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('intro')}</p>
        </SectionWrapper>
      </header>

      <SectionWrapper background="grey" className={styles.philosophy}>
        <div className={styles.contentGrid}>
          <div>
            <h2 className={styles.sectionTitle}>{t('storyTitle')}</h2>
            <p className={styles.bodyText}>{t('storyP1')}</p>
            <p className={styles.bodyText}>{t('storyP2')}</p>
            <p className={styles.bodyText}>{t('storyP3')}</p>
          </div>
          <div className={styles.valuesCard}>
            <h3>{t('visionTitle')}</h3>
            <p className={styles.visionText}>{t('visionP1')}</p>
            <p className={styles.visionText}>{t('visionP2')}</p>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper background="white" className={styles.team}>
        <h2 className={styles.sectionTitle}>{t('dnaTitle')}</h2>
        <div className={styles.dnaGrid}>
          {DNA_ITEMS.map((item, index) => (
            <div key={index} className={styles.dnaCard}>
              <h3 className={styles.dnaTitle}>{item.title}</h3>
              <p className={styles.dnaDescription}>{item.description}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  );
}
