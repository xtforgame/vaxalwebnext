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
      tagline: t('products.ryko.tagline'),
      description: t('products.ryko.description'),
      href: '/products/ryko'
    },
    {
      id: 'brevflow',
      name: 'BrevFlow',
      tagline: t('products.brevflow.tagline'),
      description: t('products.brevflow.description'),
      href: '/products/brevflow'
    },
    {
      id: 'formaldoc',
      name: 'FormalDoc',
      tagline: t('products.formaldoc.tagline'),
      description: t('products.formaldoc.description'),
      href: '/products/formaldoc'
    },
    {
      id: 'soloistboard',
      name: 'SoloistBoard',
      tagline: t('products.soloistboard.tagline'),
      description: t('products.soloistboard.description'),
      href: '/products/soloistboard'
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
                  {t('productsPage.exploreProduct')} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  );
}
