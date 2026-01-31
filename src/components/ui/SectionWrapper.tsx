import React from 'react';
import styles from './SectionWrapper.module.css';

interface SectionWrapperProps {
  id?: string;
  background?: 'white' | 'grey';
  children: React.ReactNode;
  className?: string;
}

export default function SectionWrapper({
  id,
  background = 'white',
  children,
  className = '',
}: SectionWrapperProps) {
  return (
    <section 
      id={id} 
      className={`${styles.section} ${styles[`background-${background}`]} ${className}`}
    >
      <div className={styles.container}>
        {children}
      </div>
    </section>
  );
}
