'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './CaseTeaser.module.css';

export default function CaseTeaser() {
  const t = useTranslations('caseTeaser');

  return (
    <SectionWrapper background="dark" id="case-study">
      <div className={styles.content}>
        <div className={styles.textSide}>
          <span className={styles.tag}>{t('badge')}</span>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.description}>{t('description')}</p>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <h4>{t('stat1.value')}</h4>
              <p>{t('stat1.label')}</p>
            </div>
            <div className={styles.statItem}>
              <h4>{t('stat2.value')}</h4>
              <p>{t('stat2.label')}</p>
            </div>
          </div>

          <Button size="lg" href="/case-study/studio-doe">
            {t('cta')}
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
