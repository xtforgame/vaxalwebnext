import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './studio-doe.module.css';

export default async function StudioDoeCase() {
  const t = await getTranslations('caseStudyPage');

  const HIGHLIGHTS = [
    { title: t('highlight1'), desc: t('highlight1Desc') },
    { title: t('highlight2'), desc: t('highlight2Desc') },
    { title: t('highlight3'), desc: t('highlight3Desc') },
    { title: t('highlight4'), desc: t('highlight4Desc') },
  ];

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

      {/* Intro */}
      <section className={styles.intro}>
        <div className={styles.prose}>
          <p>{t('introP1')}</p>
          <p>{t('introP2')}</p>
        </div>
      </section>

      {/* Highlights */}
      <section className={styles.highlights}>
        <div className={styles.highlightsGrid}>
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className={styles.highlightCard}>
              <h3 className={styles.highlightTitle}>{h.title}</h3>
              <p className={styles.highlightDesc}>{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 1 */}
      <article className={styles.article}>
        <div className={styles.prose}>
          <h2 className={styles.chapterTitle}>{t('ch1Title')}</h2>
          <p>{t('ch1P1')}</p>
          <p>{t('ch1P2')}</p>
        </div>
      </article>

      {/* Section 2 */}
      <article className={styles.article}>
        <div className={styles.prose}>
          <h2 className={styles.chapterTitle}>{t('ch2Title')}</h2>
          <p>{t('ch2P1')}</p>
          <p>{t('ch2P2')}</p>
        </div>

        <figure className={styles.figure}>
          <div className={styles.imagePlaceholder}>
            <span>{t('fig2Alt')}</span>
          </div>
          <figcaption className={styles.figcaption}>{t('fig2Caption')}</figcaption>
        </figure>
      </article>

      {/* Section 3 */}
      <article className={styles.article}>
        <div className={styles.prose}>
          <h2 className={styles.chapterTitle}>{t('ch3Title')}</h2>
          <p>{t('ch3P1')}</p>
          <p>{t('ch3P2')}</p>
        </div>

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

        <figure className={styles.figure}>
          <div className={styles.imagePlaceholder}>
            <span>{t('fig1Alt')}</span>
          </div>
          <figcaption className={styles.figcaption}>{t('fig1Caption')}</figcaption>
        </figure>
      </article>

      {/* Section 4 — with pull quote */}
      <article className={styles.article}>
        <div className={styles.prose}>
          <h2 className={styles.chapterTitle}>{t('ch4Title')}</h2>
          <p>{t('ch4P1')}</p>
        </div>

        <blockquote className={styles.pullQuote}>
          {t('pullQuote')}
        </blockquote>

        <div className={styles.prose}>
          <p>{t('ch4P2')}</p>
          <p>{t('ch4P3')}</p>
        </div>

        <figure className={styles.figure}>
          <div className={styles.imagePlaceholder}>
            <span>{t('fig3Alt')}</span>
          </div>
          <figcaption className={styles.figcaption}>{t('fig3Caption')}</figcaption>
        </figure>
      </article>

      {/* Section 5 */}
      <article className={styles.article}>
        <div className={styles.prose}>
          <h2 className={styles.chapterTitle}>{t('ch5Title')}</h2>
          <p>{t('ch5P1')}</p>
          <p className={styles.emphasis}>{t('ch5P2')}</p>
        </div>
      </article>

      {/* CTA */}
      <section className={styles.closing}>
        <div className={styles.closingCta}>
          <h2 className={styles.ctaTitle}>{t('ctaTitle')}</h2>
          <Button size="lg" href="/contact">{t('ctaButton')}</Button>
        </div>
      </section>
    </div>
  );
}
