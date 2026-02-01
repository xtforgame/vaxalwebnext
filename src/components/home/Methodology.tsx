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
      subtitle: t('step1.subtitle'),
      description: t('step1.description'),
      features: [t('step1.feature1'), t('step1.feature2'), t('step1.feature3')],
      visualClass: 'step1Visual'
    },
    {
      number: t('step2.number'),
      title: t('step2.title'),
      subtitle: t('step2.subtitle'),
      description: t('step2.description'),
      features: [t('step2.feature1'), t('step2.feature2'), t('step2.feature3')],
      visualClass: 'step2Visual'
    },
    {
      number: t('step3.number'),
      title: t('step3.title'),
      subtitle: t('step3.subtitle'),
      description: t('step3.description'),
      features: [t('step3.feature1'), t('step3.feature2'), t('step3.feature3')],
      visualClass: 'step3Visual'
    }
  ];

  return (
    <SectionWrapper background="grey" id="methodology">
      <div className={styles.header}>
        <span className={styles.badge}>{t('badge')}</span>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.subtitle}>{t('description')}</p>
      </div>

      <div className={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <div key={index} className={styles.stepItem}>
            <div className={styles.stepContent}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepSubtitle}>{step.subtitle}</p>
              <p className={styles.stepDescription}>{step.description}</p>
              <ul className={styles.featureList}>
                {step.features.map((feature, i) => (
                  <li key={i} className={styles.featureItem}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${styles.visualPlaceholder} ${styles[step.visualClass]}`}>
              <div className={styles.mockContent}>
                <span className={styles.mockLabel}>{step.title}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
