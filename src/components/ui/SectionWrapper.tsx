import React from 'react';
import styles from './SectionWrapper.module.css';

interface SectionWrapperProps {
  id?: string;
  background?: 'white' | 'grey' | 'base' | 'dark' | 'transparent';
  padding?: 'default' | 'none' | 'top' | 'bottom' | 'sm';
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
  const sectionClassName = [
    styles.section,
    styles[`background-${background}`],
    styles[`padding-${padding}`],
    className,
  ].filter(Boolean).join(' ');

  return (
    <section id={id} className={sectionClassName}>
      <div className={styles.container}>
        {children}
      </div>
    </section>
  );
}
