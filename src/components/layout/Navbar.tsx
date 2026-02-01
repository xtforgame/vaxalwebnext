import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          Vaxal
        </Link>
        
        <nav className={styles.navLinks}>
          <Link href="/products" className={styles.navLink}>
            Products
          </Link>
          <Link href="/case-study" className={styles.navLink}>
            Case study
          </Link>
          <Link href="/about" className={styles.navLink}>
            About
          </Link>
          <Link href="/contact" className={styles.ctaButton}>
            Start Pilot
          </Link>
        </nav>
      </div>
    </header>
  );
}
