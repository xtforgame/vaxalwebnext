import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from '@/components/products/ProductLayout.module.css';
import Button from '@/components/ui/Button';

export default async function BrevFlowPage() {
  const t = await getTranslations('brevflowPage');

  return (
    <>
      <SectionWrapper className={styles.heroSection} padding="none">
        <div className={styles.heroContent}>
          <span className={styles.heroTag}>{t('tag')}</span>
          <h1 className={styles.heroTitle}>{t('title')}</h1>
          <p className={styles.heroSubtitle}>{t('subtitle')}</p>
          <div style={{ marginTop: '48px' }}>
            <Button size="lg" href="/#contact">{t('cta')}</Button>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper className={styles.assertionSection}>
        <div className={styles.assertionWrapper}>
          <h2 className={styles.assertionTitle}>{t('assertionTitle')}</h2>
          <p className={styles.assertionText}>{t('assertionText')}</p>
        </div>
      </SectionWrapper>

      <SectionWrapper className={styles.stepsSection}>
        <div className={styles.stepsHeader}>
          <h2 className={styles.stepsTitle}>{t('capabilitiesTitle')}</h2>
          <p className={styles.stepsSubtitle}>{t('capabilitiesSubtitle')}</p>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>01</span>
            <h3 className={styles.stepTitle}>{t('cap1Title')}</h3>
            <p className={styles.stepDesc}>{t('cap1Desc')}</p>
          </div>
          <div className={styles.stepVisual}>
            <div className={styles.visualPlaceholder}>Visual Designer</div>
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>02</span>
            <h3 className={styles.stepTitle}>{t('cap2Title')}</h3>
            <p className={styles.stepDesc}>{t('cap2Desc')}</p>
          </div>
          <div className={styles.stepVisual}>
            <div className={styles.visualPlaceholder}>Cross-Platform</div>
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>03</span>
            <h3 className={styles.stepTitle}>{t('cap3Title')}</h3>
            <p className={styles.stepDesc}>{t('cap3Desc')}</p>
          </div>
          <div className={styles.stepVisual}>
            <div className={styles.visualPlaceholder}>AI Decisions</div>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
