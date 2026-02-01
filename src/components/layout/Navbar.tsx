'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './Navbar.module.css';

export default function Navbar() {
  const t = useTranslations();

  const PRODUCTS = [
    { name: 'Ryko', href: '/products/ryko', description: t('products.ryko.tagline') },
    { name: 'BrevFlow', href: '/products/brevflow', description: t('products.brevflow.tagline') },
    { name: 'FormalDoc', href: '/products/formaldoc', description: t('products.formaldoc.tagline') },
    { name: 'SoloistBoard', href: '/products/soloistboard', description: t('products.soloistboard.tagline') },
  ];
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
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          <Image
            src="/vaxal.svg"
            alt="Vaxal"
            width={120}
            height={38}
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.navLinks}>
          {/* Products with Dropdown */}
          <div className={styles.navDropdown}>
            <Link href="/products" className={styles.navLink}>
              {t('nav.products')}
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
            {t('nav.caseStudy')}
          </Link>
          <Link href="/about" className={styles.navLink}>
            {t('nav.about')}
          </Link>
          <Link href="/#contact" className={styles.ctaButton}>
            {t('nav.startPilot')}
          </Link>
          <LanguageSwitcher />
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
                {t('nav.products')}
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
            {t('nav.caseStudy')}
          </Link>
          <Link href="/about" className={styles.mobileNavLink} onClick={closeMenu}>
            {t('nav.about')}
          </Link>
          <Link href="/#contact" className={`${styles.ctaButton} ${styles.mobileCta}`} onClick={closeMenu}>
            {t('nav.startPilot')}
          </Link>
          <div className={styles.mobileLangSwitcher}>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
