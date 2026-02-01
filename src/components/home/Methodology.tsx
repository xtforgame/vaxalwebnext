'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './Methodology.module.css';

export default function Methodology() {
  const t = useTranslations('methodology');

  const STEPS = [
    {
      number: t('step1.number'),
      title: t('step1.title'),
      description: t('step1.description'),
      visual: t('step1.visual'),
      visualClass: 'step1Visual'
    },
    {
      number: t('step2.number'),
      title: t('step2.title'),
      description: t('step2.description'),
      visual: t('step2.visual'),
      visualClass: 'step2Visual'
    },
    {
      number: t('step3.number'),
      title: t('step3.title'),
      description: t('step3.description'),
      visual: t('step3.visual'),
      visualClass: 'step3Visual'
    }
  ];

  return (
    <SectionWrapper background="grey" id="methodology">
      <div className={styles.header}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </div>

      <div className={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <div key={index} className={styles.stepItem}>
            <div className={styles.stepContent}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
            <div className={`${styles.visualPlaceholder} ${styles[step.visualClass]}`}>
              <div className={styles.mockContent}>
                <span className={styles.mockLabel}>{step.visual}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
