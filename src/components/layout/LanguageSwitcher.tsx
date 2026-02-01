'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import styles from './LanguageSwitcher.module.css';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: 'zh' | 'en') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className={styles.switcher}>
      <button
        className={`${styles.option} ${locale === 'zh' ? styles.active : ''}`}
        onClick={() => switchLocale('zh')}
        aria-label="Switch to Chinese"
      >
        中
      </button>
      <span className={styles.divider}>/</span>
      <button
        className={`${styles.option} ${locale === 'en' ? styles.active : ''}`}
        onClick={() => switchLocale('en')}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
