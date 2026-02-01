import React from 'react';
import styles from './SectionWrapper.module.css';

interface SectionWrapperProps {
  id?: string;
  background?: 'white' | 'grey';
  padding?: 'default' | 'none' | 'top' | 'bottom';
  children: React.ReactNode;
  className?: string;
}

export default function SectionWrapper({
  id,
  background = 'white',
  padding = 'default',
  children,
  className = '',
}: SectionWrapperProps) {
  return (
    <section 
      id={id} 
      className={`${styles.section} ${styles[`background-${background}`]} ${styles[`padding-${padding}`]} ${className}`}
    >
      <div className={styles.container}>
        {children}
      </div>
    </section>
  );
}
