import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './about.module.css';

export default async function AboutPage() {
  const t = await getTranslations('aboutPage');
  const tFounders = await getTranslations('founders');

  const FOUNDERS = [
    { name: tFounders('founder1.name'), role: tFounders('founder1.role'), bio: tFounders('founder1.bio') },
    { name: tFounders('founder2.name'), role: tFounders('founder2.role'), bio: tFounders('founder2.bio') },
    { name: tFounders('founder3.name'), role: tFounders('founder3.role'), bio: tFounders('founder3.bio') },
    { name: tFounders('founder4.name'), role: tFounders('founder4.role'), bio: tFounders('founder4.bio') },
  ];

  const MILESTONES = [
    { year: t('milestone1.year'), label: t('milestone1.label'), detail: t('milestone1.detail') },
    { year: t('milestone2.year'), label: t('milestone2.label'), detail: t('milestone2.detail') },
    { year: t('milestone3.year'), label: t('milestone3.label'), detail: t('milestone3.detail') },
    { year: t('milestone4.year'), label: t('milestone4.label'), detail: t('milestone4.detail') },
  ];

  const STATS = [
    { value: t('statsYears'), label: t('statsYearsLabel') },
    { value: t('statsPartners'), label: t('statsPartnersLabel') },
    { value: t('statsModules'), label: t('statsModulesLabel') },
    { value: t('statsDeep'), label: t('statsDeepLabel') },
  ];

  return (
    <div className={styles.container}>
      {/* Hero */}
      <header className={styles.hero}>
        <SectionWrapper padding="none">
          <span className={styles.badge}>{t('badge')}</span>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </SectionWrapper>
      </header>

      {/* Origin Story */}
      <section className={styles.origin}>
        <SectionWrapper background="white" padding="none">
          <div className={styles.originContent}>
            <h2 className={styles.sectionTitle}>{t('originTitle')}</h2>
            <p className={styles.originText}>{t('originText')}</p>
          </div>
        </SectionWrapper>
      </section>

      {/* Milestones + Stats */}
      <section className={styles.milestones}>
        <SectionWrapper background="grey" padding="none">
          <h2 className={styles.sectionTitle}>{t('milestonesTitle')}</h2>

          <div className={styles.timeline}>
            {MILESTONES.map((m) => (
              <div key={m.year} className={styles.timelineItem}>
                <span className={styles.timelineYear}>{m.year}</span>
                <h3 className={styles.timelineLabel}>{m.label}</h3>
                <p className={styles.timelineDetail}>{m.detail}</p>
              </div>
            ))}
          </div>

          <div className={styles.statsRow}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </SectionWrapper>
      </section>

      {/* Core Values */}
      <section className={styles.values}>
        <SectionWrapper background="white" padding="none">
          <h2 className={styles.sectionTitle}>{t('coreValuesTitle')}</h2>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>{t('coreValue1.title')}</h3>
              <p className={styles.valueDescription}>{t('coreValue1.description')}</p>
            </div>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>{t('coreValue2.title')}</h3>
              <p className={styles.valueDescription}>{t('coreValue2.description')}</p>
            </div>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>{t('coreValue3.title')}</h3>
              <p className={styles.valueDescription}>{t('coreValue3.description')}</p>
            </div>
          </div>
        </SectionWrapper>
      </section>

      {/* Team DNA + Founders */}
      <section className={styles.team}>
        <SectionWrapper background="white" padding="none">
          <h2 className={styles.sectionTitle}>{t('dnaTitle')}</h2>
          <p className={styles.teamIntro}>{t('dnaIntro')}</p>
          <div className={styles.foundersGrid}>
            {FOUNDERS.map((founder) => (
              <div key={founder.name} className={styles.founderCard}>
                <div className={styles.avatarPlaceholder}>Vaxal</div>
                <h3 className={styles.founderName}>{founder.name}</h3>
                <p className={styles.founderRole}>{founder.role}</p>
                <p className={styles.founderBio}>{founder.bio}</p>
              </div>
            ))}
          </div>
        </SectionWrapper>
      </section>

      {/* Bridge CTA to Vaxal Base */}
      <section className={styles.bridge}>
        <SectionWrapper background="transparent" padding="none">
          <h2 className={styles.bridgeTitle}>{t('bridgeTitle')}</h2>
          <p className={styles.bridgeText}>{t('bridgeText')}</p>
          <Button size="lg" href="/vaxal-base">{t('bridgeCta')}</Button>
        </SectionWrapper>
      </section>
    </div>
  );
}
