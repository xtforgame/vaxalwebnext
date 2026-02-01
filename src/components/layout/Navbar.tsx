'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

const PRODUCTS = [
  { name: 'Ryko', href: '/products/ryko', description: 'AI Agent 對話介面' },
  { name: 'BrevFlow', href: '/products/brevflow', description: '跨平台工作流自動化' },
  { name: 'FormalDoc', href: '/products/formaldoc', description: '智能文件生成' },
  { name: 'SoloistBoard', href: '/products/soloistboard', description: '專案智能治理' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isMenuOpen) {
      setIsProductsOpen(false);
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsProductsOpen(false);
  };

  const toggleProducts = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsProductsOpen(!isProductsOpen);
  };

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          Vaxal
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.navLinks}>
          {/* Products with Dropdown */}
          <div className={styles.navDropdown}>
            <Link href="/products" className={styles.navLink}>
              Products
              <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </Link>
            <div className={styles.dropdownMenu}>
              {PRODUCTS.map((product) => (
                <Link key={product.href} href={product.href} className={styles.dropdownItem}>
                  <span className={styles.dropdownItemName}>{product.name}</span>
                  <span className={styles.dropdownItemDesc}>{product.description}</span>
                </Link>
              ))}
            </div>
          </div>

          <Link href="/case-study/studio-doe" className={styles.navLink}>
            Case Study
          </Link>
          <Link href="/about" className={styles.navLink}>
            About
          </Link>
          <Link href="/#contact" className={styles.ctaButton}>
            Start Pilot
          </Link>
        </nav>

        {/* Mobile Menu Button (Hamburger) */}
        <button
          className={styles.mobileMenuBtn}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>

        {/* Mobile Drawer */}
        <div className={`${styles.drawer} ${isMenuOpen ? styles.open : ''}`}>
          {/* Products with Expandable Sub-menu */}
          <div className={styles.mobileNavGroup}>
            <div className={styles.mobileNavHeader}>
              <Link href="/products" className={styles.mobileNavLink} onClick={closeMenu}>
                Products
              </Link>
              <button
                className={`${styles.mobileExpandBtn} ${isProductsOpen ? styles.expanded : ''}`}
                onClick={toggleProducts}
                aria-label="Expand products"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
            <div className={`${styles.mobileSubMenu} ${isProductsOpen ? styles.open : ''}`}>
              <div className={styles.mobileSubMenuInner}>
                {PRODUCTS.map((product) => (
                  <Link
                    key={product.href}
                    href={product.href}
                    className={styles.mobileSubLink}
                    onClick={closeMenu}
                  >
                    {product.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link href="/case-study/studio-doe" className={styles.mobileNavLink} onClick={closeMenu}>
            Case Study
          </Link>
          <Link href="/about" className={styles.mobileNavLink} onClick={closeMenu}>
            About
          </Link>
          <Link href="/#contact" className={`${styles.ctaButton} ${styles.mobileCta}`} onClick={closeMenu}>
            Start Pilot
          </Link>
        </div>
      </div>
    </header>
  );
}
