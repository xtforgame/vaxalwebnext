import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.brandColumn}>
          <h3>Si Xu Network</h3>
          <p>
            Build with Intelligence. Scale with Trust.<br/>
            Your pragmatic growth partner in the AI era.
          </p>
        </div>
        
        <div className={styles.linkColumn}>
          <h4>Products</h4>
          <ul className={styles.linkList}>
            <li><Link href="/products/ryko" className={styles.footerLink}>Ryko</Link></li>
            <li><Link href="/products/brevflow" className={styles.footerLink}>BrevFlow</Link></li>
            <li><Link href="/products/soloistboard" className={styles.footerLink}>SoloistBoard</Link></li>
          </ul>
        </div>
        
        <div className={styles.linkColumn}>
          <h4>Company</h4>
          <ul className={styles.linkList}>
            <li><Link href="/about" className={styles.footerLink}>About Us</Link></li>
            <li><Link href="/careers" className={styles.footerLink}>Careers</Link></li>
            <li><Link href="/contact" className={styles.footerLink}>Contact</Link></li>
          </ul>
        </div>

        <div className={styles.linkColumn}>
          <h4>Connect</h4>
          <ul className={styles.linkList}>
            <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GitHub</a></li>
            <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>LinkedIn</a></li>
          </ul>
        </div>
      </div>
      
      <div className={styles.copyright}>
        &copy; {new Date().getFullYear()} Si Xu Network. All rights reserved.
      </div>
    </footer>
  );
}
