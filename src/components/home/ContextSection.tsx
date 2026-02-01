'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './ContextSection.module.css';

export default function ContextSection() {
  const t = useTranslations('context');

  return (
    <SectionWrapper background="white" padding="none" className={styles.contextSection}>
      <div className={styles.container}>
        <p className={styles.leadText}>
          {t('leadText')}
          <span className={styles.highlight}>{t('highlight1')}</span>、
          <span className={styles.highlight}>{t('highlight2')}</span>、
          <span className={styles.highlight}>{t('highlight3')}</span>。
        </p>
        <h2 className={styles.mainStatement}>
          {t('mainStatement1')}<br />
          {t('mainStatement2')}
          <span className={styles.accent}>{t('mainStatementAccent')}</span>。
        </h2>
        <p className={styles.closingText}>
          {t('closingText')}
        </p>
      </div>
    </SectionWrapper>
  );
}
