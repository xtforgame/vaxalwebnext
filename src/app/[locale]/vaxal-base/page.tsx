import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './vaxal-base.module.css';

export default async function VaxalBasePage() {
  const t = await getTranslations('vaxalBasePage');

  const INDUSTRIES = [
    t('industry1'), t('industry2'), t('industry3'), t('industry4'),
    t('industry5'), t('industry6'), t('industry7'),
  ];

  const STATS = [
    { value: t('stat1Value'), label: t('stat1Label') },
    { value: t('stat2Value'), label: t('stat2Label') },
    { value: t('stat3Value'), label: t('stat3Label') },
    { value: t('stat4Value'), label: t('stat4Label') },
    { value: t('stat5Value'), label: t('stat5Label') },
  ];

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <SectionWrapper background="transparent" padding="none">
          <span className={styles.badge}>{t('badge')}</span>
          <h1 className={styles.title}>
            {t('title').split('\n')[0]}<br />
            {t('title').split('\n')[1] || ''}
          </h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </SectionWrapper>
      </section>

      {/* Ch1: The Starting Point */}
      <article className={styles.article}>
        <SectionWrapper background="white" padding="none">
          <div className={styles.prose}>
            <h2 className={styles.chapterTitle}>{t('ch1Title')}</h2>
            <p>{t('ch1P1')}</p>
            <p>{t('ch1P2')}</p>
            <p className={styles.emphasis}>{t('ch1P3')}</p>
          </div>
        </SectionWrapper>
      </article>

      {/* Ch2: Symbiosis */}
      <article className={styles.article}>
        <SectionWrapper background="white" padding="none">
          <div className={styles.prose}>
            <h2 className={styles.chapterTitle}>{t('ch2Title')}</h2>
            <p>{t('ch2P1')}</p>
            <p>{t('ch2P2')}</p>
            <p>{t('ch2P3')}</p>
          </div>

          {/* Industry spread visual */}
          <figure className={styles.figure}>
            <div className={styles.industryGrid}>
              {INDUSTRIES.map((name) => (
                <div key={name} className={styles.industryTag}>
                  {name}
                </div>
              ))}
            </div>
            <figcaption className={styles.figcaption}>{t('figIndustryCaption')}</figcaption>
          </figure>
        </SectionWrapper>
      </article>

      {/* Ch3: Derivation */}
      <article className={styles.article}>
        <SectionWrapper background="white" padding="none">
          <div className={styles.prose}>
            <h2 className={styles.chapterTitle}>{t('ch3Title')}</h2>
            <p>{t('ch3P1')}</p>
            <p>{t('ch3P2')}</p>
          </div>
        </SectionWrapper>
      </article>

      {/* Ch4: The Loop — dark section */}
      <section className={styles.loopSection}>
        <SectionWrapper background="transparent" padding="none">
          <div className={styles.loopProse}>
            <h2 className={styles.loopTitle}>{t('ch4Title')}</h2>
            <p>{t('ch4P1')}</p>
            <p>{t('ch4P2')}</p>
            <p>{t('ch4P3')}</p>
          </div>
          <blockquote className={styles.pullQuote}>
            {t('pullQuote')}
          </blockquote>
        </SectionWrapper>
      </section>

      {/* Stats */}
      <section className={styles.stats}>
        <SectionWrapper background="grey" padding="none">
          <h2 className={styles.statsTitle}>{t('statsTitle')}</h2>
          <div className={styles.statsGrid}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </SectionWrapper>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <SectionWrapper background="white" padding="none">
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>{t('ctaTitle')}</h2>
            <Button size="lg" href="/contact">{t('ctaButton')}</Button>
          </div>
        </SectionWrapper>
      </section>
    </div>
  );
}
