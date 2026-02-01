'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './Philosophy.module.css';

export default function Philosophy() {
  const t = useTranslations('philosophy');

  const pillars = [
    { title: t('pillar1.title'), description: t('pillar1.description') },
    { title: t('pillar2.title'), description: t('pillar2.description') },
    { title: t('pillar3.title'), description: t('pillar3.description') },
  ];

  return (
    <SectionWrapper background="white" id="philosophy">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.badge}>{t('badge')}</span>
          <h2 className={styles.title}>{t('title')}</h2>
        </div>

        <div className={styles.valuesGrid}>
          {pillars.map((pillar, index) => (
            <div key={index} className={styles.valueCard}>
              <h3 className={styles.valueTitle}>{pillar.title}</h3>
              <p className={styles.valueDescription}>{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
