'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './Founders.module.css';

export default function Founders() {
  const t = useTranslations('founders');

  const founders = [
    { name: t('founder1.name'), role: t('founder1.role'), bio: t('founder1.bio') },
    { name: t('founder2.name'), role: t('founder2.role'), bio: t('founder2.bio') },
    { name: t('founder3.name'), role: t('founder3.role'), bio: t('founder3.bio') },
    { name: t('founder4.name'), role: t('founder4.role'), bio: t('founder4.bio') },
  ];

  return (
    <SectionWrapper background="grey" id="team">
      <div className={styles.header}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </div>

      <div className={styles.grid}>
        {founders.map((founder) => (
          <div key={founder.name} className={styles.founderCard}>
            <div className={styles.avatarPlaceholder}>Vaxal</div>
            <h3 className={styles.founderName}>{founder.name}</h3>
            <p className={styles.founderRole}>{founder.role}</p>
            <p className={styles.founderBio}>{founder.bio}</p>
          </div>
        ))}
      </div>

      <div className={styles.philosophyBox}>
        <h3 className={styles.philosophyTitle}>{t('philosophyTitle')}</h3>
        <p className={styles.philosophyText}>{t('philosophyText')}</p>
      </div>
    </SectionWrapper>
  );
}
