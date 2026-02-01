'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './Footer.module.css';

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.brandColumn}>
          <h3>Vaxal</h3>
          <p>{t('footer.description')}</p>
        </div>

        <div className={styles.linkColumn}>
          <h4>{t('footer.productsTitle')}</h4>
          <ul className={styles.linkList}>
            <li><Link href="/products/ryko" className={styles.footerLink}>Ryko</Link></li>
            <li><Link href="/products/brevflow" className={styles.footerLink}>BrevFlow</Link></li>
            <li><Link href="/products/formaldoc" className={styles.footerLink}>FormalDoc</Link></li>
            <li><Link href="/products/soloistboard" className={styles.footerLink}>SoloistBoard</Link></li>
          </ul>
        </div>

        <div className={styles.linkColumn}>
          <h4>{t('footer.companyTitle')}</h4>
          <ul className={styles.linkList}>
            <li><Link href="/case-study/studio-doe" className={styles.footerLink}>{t('footer.caseStudy')}</Link></li>
            <li><Link href="/about" className={styles.footerLink}>{t('footer.about')}</Link></li>
            <li><Link href="/#contact" className={styles.footerLink}>{t('footer.contact')}</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.copyright}>
        &copy; {new Date().getFullYear()} {t('footer.copyright')}
      </div>
    </footer>
  );
}
