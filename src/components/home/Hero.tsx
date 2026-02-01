'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './Hero.module.css';

export default function Hero() {
  const t = useTranslations('hero');

  return (
    <SectionWrapper background="base" padding="none" className={styles.heroSection}>
      <div className={styles.heroContent}>
        <div className={styles.textContent}>
          <h1 className={styles.headline}>
            <span className={styles.headlineAccent}>{t('headline1')}</span><br />
            {t('headline2')}
          </h1>
          <p className={styles.subheadline}>
            {t('subheadline')}
          </p>
          <div className={styles.ctaGroup}>
            <Button size="lg" href="/#contact">
              {t('cta')}
            </Button>
            <Button variant="outline" size="lg" href="/case-study/studio-doe">
              {t('viewCase')}
            </Button>
          </div>
        </div>

        <div className={styles.visualContent}>
          <div className={styles.mockHeader}>
            <div className={styles.mockDots}>
              <span className={styles.mockDot}></span>
              <span className={styles.mockDot}></span>
              <span className={styles.mockDot}></span>
            </div>
            <span className={styles.mockTitle}>{t('mockTitle')}</span>
          </div>

          <div className={styles.mockChat}>
            <div className={`${styles.mockMessage} ${styles.user}`}>
              <div className={styles.mockAvatar}>You</div>
              <div className={styles.mockBubble}>
                {t('mockUser1')}
              </div>
            </div>

            <div className={`${styles.mockMessage} ${styles.agent}`}>
              <div className={styles.mockAvatar}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className={styles.mockBubble}>
                {t('mockAgent')}
              </div>
            </div>

            <div className={`${styles.mockMessage} ${styles.user}`}>
              <div className={styles.mockAvatar}>You</div>
              <div className={styles.mockBubble}>
                {t('mockUser2')}
              </div>
            </div>
          </div>

          <div className={styles.mockInput}>
            <div className={styles.mockInputField}>
              {t('mockPlaceholder')}
            </div>
            <div className={styles.mockSendBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
