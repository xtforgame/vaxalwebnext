import SectionWrapper from '@/components/ui/SectionWrapper';
import Link from 'next/link';
import styles from './ProductGrid.module.css';

const PRODUCTS = [
  {
    name: 'Ryko',
    description: 'AI 核心運行環境。支援 MCP 與微服務化，讓 AI 代理人能精準調度企業內部工具與數據。',
    href: '/products/ryko',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    )
  },
  {
    name: 'BrevFlow',
    description: 'AI Native 自動化工作流。跨越平台的限制，將複雜的業務邏輯自動化為高效、可靠的 AI 流程。',
    href: '/products/brevflow',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
    )
  },
  {
    name: 'SoloistBoard',
    description: 'AI 專案治理平台。透過看板式管理與 AI 自律代理人，主動推進專案進度，降低溝通成本。',
    href: '/products/soloistboard',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10h10V2z"/><path d="M22 2h-10v10h10V2z"/><path d="M12 12H2v10h10V12z"/><path d="M22 12h-10v10h10V12z"/></svg>
    )
  },
  {
    name: 'FormalDoc',
    description: '標準化文件生成系統。將企業規範轉化為 AI 樣板，自動產出正規、精確的專業商務文件。',
    href: '/products/formaldoc',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
    )
  }
];

export default function ProductGrid() {
  return (
    <SectionWrapper className={styles.productSection} id="products">
      <div className={styles.header}>
        <h2 className={styles.title}>The Vaxal Ecosystem</h2>
        <p className={styles.subtitle}>
          我們建立的工具，不只是為了自動化，更是為了賦予企業規模化的治理能力。
        </p>
      </div>
      
      <div className={styles.grid}>
        {PRODUCTS.map((product) => (
          <div key={product.name} className={styles.card}>
            <div className={styles.iconWrapper}>
              {product.icon}
            </div>
            <h3 className={styles.productTitle}>{product.name}</h3>
            <p className={styles.productDescription}>{product.description}</p>
            <Link href={product.href} className={styles.learnMore}>
              Learn more
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
