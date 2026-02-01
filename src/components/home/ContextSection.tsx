'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './ContextSection.module.css';

export default function ContextSection() {
  const t = useTranslations('context');

  return (
    <SectionWrapper background="white" padding="none" className={styles.contextSection}>
      <div className={styles.container}>
        <h2 className={styles.mainStatement}>
          {t('headline')}<br />
          <span className={styles.accent}>{t('headlineAccent')}</span>
        </h2>
        <p className={styles.closingText}>
          {t('description')}
        </p>
      </div>
    </SectionWrapper>
  );
}
