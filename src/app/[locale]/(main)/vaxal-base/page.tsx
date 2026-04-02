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

  const HIGHLIGHTS = [
    { title: t('highlight1'), desc: t('highlight1Desc') },
    { title: t('highlight2'), desc: t('highlight2Desc') },
    { title: t('highlight3'), desc: t('highlight3Desc') },
    { title: t('highlight4'), desc: t('highlight4Desc') },
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
      </article>

      {/* Section 3 — with industry grid */}
      <article className={styles.article}>
        <div className={styles.prose}>
          <h2 className={styles.chapterTitle}>{t('ch3Title')}</h2>
          <p>{t('ch3P1')}</p>
          <p>{t('ch3P2')}</p>
          <p>{t('ch3P3')}</p>
        </div>

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
      </article>

      {/* Section 4 */}
      <article className={styles.article}>
        <div className={styles.prose}>
          <h2 className={styles.chapterTitle}>{t('ch4Title')}</h2>
          <p>{t('ch4P1')}</p>
          <p>{t('ch4P2')}</p>
        </div>
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
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>{t('ctaTitle')}</h2>
          <Button size="lg" href="/contact">{t('ctaButton')}</Button>
        </div>
      </section>
    </div>
  );
}
