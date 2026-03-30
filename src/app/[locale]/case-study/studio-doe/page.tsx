import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './studio-doe.module.css';

export default async function StudioDoeCase() {
  const t = await getTranslations('caseStudyPage');

  return (
    <div className={styles.casePage}>
      {/* Hero */}
      <section className={styles.hero}>
        <SectionWrapper background="transparent" padding="none">
          <span className={styles.badge}>{t('badge')}</span>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <label>{t('metaClient')}</label>
              <span>{t('metaClientName')}</span>
            </div>
            <div className={styles.metaItem}>
              <label>{t('metaService')}</label>
              <span>{t('metaServiceName')}</span>
            </div>
            <div className={styles.metaItem}>
              <label>{t('metaTimeline')}</label>
              <span>{t('metaTimelineValue')}</span>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* Article Body */}
      <article className={styles.article}>
        <SectionWrapper background="white" padding="none">
          <div className={styles.prose}>

            {/* Chapter 1: The Beginning */}
            <p>{t('ch1P1')}</p>
            <p>{t('ch1P2')}</p>
          </div>

          {/* Visual break: Store screenshot */}
          <figure className={styles.figure}>
            <div className={styles.imagePlaceholder}>
              <span>{t('fig1Alt')}</span>
            </div>
            <figcaption className={styles.figcaption}>{t('fig1Caption')}</figcaption>
          </figure>

          <div className={styles.prose}>

            {/* Chapter 2: The Decision */}
            <p>{t('ch2P1')}</p>
            <p>{t('ch2P2')}</p>
            <p className={styles.emphasis}>{t('ch2P3')}</p>
          </div>

          {/* Visual break: Architecture diagram */}
          <figure className={styles.figure}>
            <div className={styles.imagePlaceholder}>
              <span>{t('fig2Alt')}</span>
            </div>
            <figcaption className={styles.figcaption}>{t('fig2Caption')}</figcaption>
          </figure>

          <div className={styles.prose}>

            {/* Chapter 3: Evolution */}
            <p>{t('ch3P1')}</p>
          </div>

          {/* Visual break: Timeline */}
          <div className={styles.timeline}>
            <div className={styles.timelineCard}>
              <span className={styles.timelineYear}>{t('module1Year')}</span>
              <h3 className={styles.timelineCardTitle}>{t('module1Title')}</h3>
              <p>{t('module1Desc')}</p>
            </div>
            <div className={styles.timelineCard}>
              <span className={styles.timelineYear}>{t('module2Year')}</span>
              <h3 className={styles.timelineCardTitle}>{t('module2Title')}</h3>
              <p>{t('module2Desc')}</p>
            </div>
            <div className={styles.timelineCard}>
              <span className={styles.timelineYear}>{t('module3Year')}</span>
              <h3 className={styles.timelineCardTitle}>{t('module3Title')}</h3>
              <p>{t('module3Desc')}</p>
            </div>
            <div className={styles.timelineCard}>
              <span className={styles.timelineYear}>{t('module4Year')}</span>
              <h3 className={styles.timelineCardTitle}>{t('module4Title')}</h3>
              <p>{t('module4Desc')}</p>
            </div>
          </div>

          <div className={styles.prose}>
            <p>{t('ch3P2')}</p>
          </div>
        </SectionWrapper>
      </article>

      {/* The Turning Point — dark break */}
      <section className={styles.turningSection}>
        <SectionWrapper background="transparent" padding="none">
          <div className={styles.turningProse}>
            <p>{t('ch4P1')}</p>
            <p>{t('ch4P2')}</p>
            <p>{t('ch4P3')}</p>
          </div>
          <blockquote className={styles.pullQuote}>
            {t('pullQuote')}
          </blockquote>
        </SectionWrapper>
      </section>

      {/* Continue article — AI compatibility */}
      <article className={styles.article}>
        <SectionWrapper background="white" padding="none">
          <div className={styles.prose}>
            <p>{t('ch5P1')}</p>
            <p>{t('ch5P2')}</p>
          </div>

          {/* Visual break: AI integration */}
          <figure className={styles.figure}>
            <div className={styles.imagePlaceholder}>
              <span>{t('fig3Alt')}</span>
            </div>
            <figcaption className={styles.figcaption}>{t('fig3Caption')}</figcaption>
          </figure>
        </SectionWrapper>
      </article>

      {/* Testimonial & CTA */}
      <section className={styles.closing}>
        <SectionWrapper background="white" padding="none">
          <div className={styles.testimonialCard}>
            <blockquote className={styles.testimonialQuote}>
              {t('testimonial')}
            </blockquote>
            <p className={styles.testimonialAuthor}>{t('testimonialAuthor')}</p>
          </div>
          <div className={styles.closingCta}>
            <h2 className={styles.ctaTitle}>{t('ctaTitle')}</h2>
            <Button size="lg" href="/contact">{t('ctaButton')}</Button>
          </div>
        </SectionWrapper>
      </section>
    </div>
  );
}
