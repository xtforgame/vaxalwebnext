'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when route changes (optional, but good UX)
  // Since this is a simple implementation, we'll just close it on link click
  const closeMenu = () => {
    setIsMenuOpen(false);
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
          思序網路 Vaxal
        </Link>
        
        {/* Desktop Navigation */}
        <nav className={styles.navLinks}>
          <Link href="/products" className={styles.navLink}>
            Products
          </Link>
          <Link href="/case-study/studio-doe" className={styles.navLink}>
            Case study
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
          <Link href="/products" className={styles.mobileNavLink} onClick={closeMenu}>
            Products
          </Link>
          <Link href="/case-study/studio-doe" className={styles.mobileNavLink} onClick={closeMenu}>
            Case study
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
