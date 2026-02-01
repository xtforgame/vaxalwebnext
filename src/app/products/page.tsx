import SectionWrapper from '@/components/ui/SectionWrapper';
import Link from 'next/link';
import styles from './products.module.css';

const ALL_PRODUCTS = [
  {
    id: 'ryko',
    name: 'Ryko',
    tagline: 'AI Runtime & Bridge',
    description: 'The secure bridge between LLMs and your internal data. Supports MCP protocols for precise tool dispatching.',
    href: '/products/ryko'
  },
  {
    id: 'brevflow',
    name: 'BrevFlow',
    tagline: 'AI Native Automations',
    description: 'Transform complex business logic into reliable AI workflows. Build once, automate everywhere.',
    href: '/products/brevflow'
  },
  {
    id: 'soloistboard',
    name: 'SoloistBoard',
    tagline: 'AI Governance Platform',
    description: 'Orchestrate autonomous agents and human teams in one place. Total visibility into AI-driven projects.',
    href: '/products/soloistboard'
  },
  {
    id: 'formaldoc',
    name: 'FormalDoc',
    tagline: 'Intelligent Documentation',
    description: 'Convert enterprise standards into AI templates. Automating high-precision business output.',
    href: '/products/formaldoc'
  }
];

export default function ProductsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <SectionWrapper>
          <h1 className={styles.title}>The Ecosystem.</h1>
          <p className={styles.subtitle}>
            A specialized suite of tools designed to bring machine intelligence into corporate governance.
          </p>
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
                  {product.href !== '#' ? 'Explore Documentation →' : 'Coming Soon'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  );
}
