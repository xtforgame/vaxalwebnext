import { getTranslations } from 'next-intl/server';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/i18n/navigation';
import styles from './products.module.css';

export default async function ProductsPage() {
  const t = await getTranslations();

  const ALL_PRODUCTS = [
    {
      id: 'ryko',
      name: 'Ryko',
      tagline: t('productsPage.ryko.tagline'),
      description: t('productsPage.ryko.description'),
      href: '/products/ryko'
    },
    {
      id: 'brevflow',
      name: 'BrevFlow',
      tagline: t('productsPage.brevflow.tagline'),
      description: t('productsPage.brevflow.description'),
      href: '/products/brevflow'
    },
    {
      id: 'soloistboard',
      name: 'SoloistBoard',
      tagline: t('productsPage.soloistboard.tagline'),
      description: t('productsPage.soloistboard.description'),
      href: '/products/soloistboard'
    },
    {
      id: 'formaldoc',
      name: 'FormalDoc',
      tagline: t('productsPage.formaldoc.tagline'),
      description: t('productsPage.formaldoc.description'),
      href: '/products/formaldoc'
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <SectionWrapper padding="none">
          <h1 className={styles.title}>{t('productsPage.title')}</h1>
          <p className={styles.subtitle}>{t('productsPage.description')}</p>
        </SectionWrapper>
      </header>

      <SectionWrapper className={styles.gridSection}>
        <div className={styles.productGrid}>
          {ALL_PRODUCTS.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.cardHeader}>
                <span className={styles.productTag}>{product.tagline}</span>
                <h2 className={styles.productName}>{product.name}</h2>
              </div>
              <p className={styles.productDesc}>{product.description}</p>
              <div className={styles.cardFooter}>
                <Link href={product.href} className={styles.link}>
                  {product.href !== '#' ? t('productsPage.exploreProduct') : t('productsPage.comingSoon')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  );
}
