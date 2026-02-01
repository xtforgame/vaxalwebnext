'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/i18n/navigation';
import styles from './ProductGrid.module.css';

export default function ProductGrid() {
  const t = useTranslations('products');

  const PRODUCTS = [
    {
      name: 'Ryko',
      tagline: t('ryko.tagline'),
      description: t('ryko.description'),
      href: '/products/ryko',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      )
    },
    {
      name: 'BrevFlow',
      tagline: t('brevflow.tagline'),
      description: t('brevflow.description'),
      href: '/products/brevflow',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
      )
    },
    {
      name: 'FormalDoc',
      tagline: t('formaldoc.tagline'),
      description: t('formaldoc.description'),
      href: '/products/formaldoc',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
      )
    },
    {
      name: 'SoloistBoard',
      tagline: t('soloistboard.tagline'),
      description: t('soloistboard.description'),
      href: '/products/soloistboard',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10h10V2z"/><path d="M22 2h-10v10h10V2z"/><path d="M12 12H2v10h10V12z"/><path d="M22 12h-10v10h10V12z"/></svg>
      )
    }
  ];

  return (
    <SectionWrapper className={styles.productSection} id="products">
      <div className={styles.header}>
        <span className={styles.badge}>{t('badge')}</span>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.subtitle}>{t('description')}</p>
      </div>

      <div className={styles.grid}>
        {PRODUCTS.map((product) => (
          <div key={product.name} className={styles.card}>
            <div className={styles.iconWrapper}>
              {product.icon}
            </div>
            <h3 className={styles.productTitle}>{product.name}</h3>
            <p className={styles.productTagline}>{product.tagline}</p>
            <p className={styles.productDescription}>{product.description}</p>
            <Link href={product.href} className={styles.learnMore}>
              {t('learnMore')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
