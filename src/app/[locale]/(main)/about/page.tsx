import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
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

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <SectionWrapper padding="none">
          <span className={styles.badge}>{t('badge')}</span>
          <h1 className={styles.title}>
            {t('title').split('\n')[0]}<br />
            {t('title').split('\n')[1] || ''}
          </h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </SectionWrapper>
      </header>

      <SectionWrapper background="grey" className={styles.philosophy}>
        <div className={styles.contentGrid}>
          <div>
            <h2 className={styles.sectionTitle}>{t('visionTitle')}</h2>
            <p className={styles.leadText}>
              {t('visionLeadText')}
            </p>
            <p className={styles.bodyText}>
              {t('visionBodyText')}
            </p>
          </div>
          <div className={styles.valuesCard}>
            <h3>{t('coreValuesTitle')}</h3>
            <ul>
              <li><strong>{t('coreValue1.title')}:</strong> {t('coreValue1.description')}</li>
              <li><strong>{t('coreValue2.title')}:</strong> {t('coreValue2.description')}</li>
              <li><strong>{t('coreValue3.title')}:</strong> {t('coreValue3.description')}</li>
            </ul>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper background="white" className={styles.team}>
        <h2 className={styles.sectionTitle}>{t('dnaTitle')}</h2>
        <div className={styles.teamContent}>
          <p className={styles.teamIntro}>
            {t('dnaIntro')}
          </p>

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
        </div>
      </SectionWrapper>
    </div>
  );
}
