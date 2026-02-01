'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './Philosophy.module.css';

export default function Philosophy() {
  const t = useTranslations('philosophy');

  return (
    <SectionWrapper background="white" id="philosophy">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('title')}</h2>
        </div>

        <p className={styles.quote}>
          {t('quote')}
        </p>

        <p className={styles.description}>
          {t('description')}
        </p>

        <div className={styles.valuesGrid}>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>{t('pillar1.title')}</h3>
            <p className={styles.valueDescription}>
              {t('pillar1.description')}
            </p>
          </div>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>{t('pillar2.title')}</h3>
            <p className={styles.valueDescription}>
              {t('pillar2.description')}
            </p>
          </div>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>{t('pillar3.title')}</h3>
            <p className={styles.valueDescription}>
              {t('pillar3.description')}
            </p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
