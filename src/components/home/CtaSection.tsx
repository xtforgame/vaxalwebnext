'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './CtaSection.module.css';

export default function CtaSection() {
  const t = useTranslations('cta');

  return (
    <SectionWrapper background="dark" id="contact" className={styles.ctaSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.subtitle}>{t('description')}</p>
        <div className={styles.buttonGroup}>
          <Button size="lg" href="/contact">
            {t('button')}
          </Button>
          <Button variant="outline" size="lg" href="/about" className={styles.outlineBtn}>
            {t('buttonSecondary')}
          </Button>
        </div>
      </div>
    </SectionWrapper>
  );
}
