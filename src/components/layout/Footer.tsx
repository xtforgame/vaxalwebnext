'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './Footer.module.css';

export default function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.brandColumn}>
          <h3>{t('brand')}</h3>
          <p>{t('description')}</p>
        </div>

        <div className={styles.linkColumn}>
          <h4>{t('productsTitle')}</h4>
          <ul className={styles.linkList}>
            <li><Link href="/products/ryko" className={styles.footerLink}>Ryko</Link></li>
            <li><Link href="/products/brevflow" className={styles.footerLink}>BrevFlow</Link></li>
            <li><Link href="/products/soloistboard" className={styles.footerLink}>SoloistBoard</Link></li>
          </ul>
        </div>

        <div className={styles.linkColumn}>
          <h4>{t('companyTitle')}</h4>
          <ul className={styles.linkList}>
            <li><Link href="/about" className={styles.footerLink}>{t('aboutUs')}</Link></li>
            <li><Link href="/careers" className={styles.footerLink}>{t('careers')}</Link></li>
            <li><Link href="/contact" className={styles.footerLink}>{t('contact')}</Link></li>
          </ul>
        </div>

        <div className={styles.linkColumn}>
          <h4>{t('connectTitle')}</h4>
          <ul className={styles.linkList}>
            <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GitHub</a></li>
            <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>LinkedIn</a></li>
          </ul>
        </div>
      </div>

      <div className={styles.copyright}>
        &copy; {new Date().getFullYear()} {t('copyright')}
      </div>
    </footer>
  );
}
