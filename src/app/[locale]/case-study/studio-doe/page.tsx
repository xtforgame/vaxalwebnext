import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './studio-doe.module.css';

export default async function StudioDoeCase() {
  const t = await getTranslations('caseStudyPage');

  return (
    <div className={styles.casePage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <SectionWrapper background="transparent" padding="none">
          <span className={styles.badge}>{t('badge')}</span>
          <h1 className={styles.title}>
            {t('title').split('\n')[0]}<br />
            {t('title').split('\n')[1] || ''}
          </h1>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <label>{t('client')}</label>
              <span>{t('clientName')}</span>
            </div>
            <div className={styles.metaItem}>
              <label>{t('service')}</label>
              <span>{t('serviceName')}</span>
            </div>
            <div className={styles.metaItem}>
              <label>{t('timeline')}</label>
              <span>{t('timelineValue')}</span>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* Challenge & Approach */}
      <SectionWrapper background="white" className={styles.section}>
        <div className={styles.contentGrid}>
          <div className={styles.textBlock}>
            <h2 className={styles.sectionTitle}>{t('challengeTitle')}</h2>
            <p>
              {t('challengeP1')}
            </p>
            <p>
              {t('challengeP2')}
            </p>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{t('stat1.value')}</span>
              <span className={styles.statLabel}>{t('stat1.label')}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{t('stat2.value')}</span>
              <span className={styles.statLabel}>{t('stat2.label')}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{t('stat3.value')}</span>
              <span className={styles.statLabel}>{t('stat3.label')}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{t('stat4.value')}</span>
              <span className={styles.statLabel}>{t('stat4.label')}</span>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Visual / Solution */}
      <SectionWrapper background="grey" className={`${styles.section} ${styles.solutionSection}`}>
        <h2 className={styles.sectionTitle} style={{ textAlign: 'center' }}>{t('solutionTitle')}</h2>
        <p className={styles.solutionIntro}>
          {t('solutionIntro')}
        </p>
        <div className={styles.fullVisual}>
          {t('solutionVisual')}
        </div>
      </SectionWrapper>

      {/* Result Section */}
      <SectionWrapper background="white" className={`${styles.section} ${styles.impactSection}`}>
        <div className={styles.contentGrid}>
          <div className={styles.textBlock}>
            <h2 className={styles.sectionTitle}>{t('impactTitle')}</h2>
            <p>
              {t('impactP1')}
            </p>
            <p>
              {t('impactP2')}
            </p>
            <Button size="lg" href="/contact">{t('impactCta')}</Button>
          </div>
          <div className={styles.testimonialCard}>
            <blockquote className={styles.testimonialQuote}>
              {t('testimonial')}
            </blockquote>
            <p className={styles.testimonialAuthor}>{t('testimonialAuthor')}</p>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
