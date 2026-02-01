import React from 'react';
import Link from 'next/link';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  href?: string;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  href,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const rootClassName = `
    ${styles.button} 
    ${styles[variant]} 
    ${styles[size]} 
    ${fullWidth ? styles.fullWidth : ''}
    ${className}
  `.trim();

  if (href) {
    return (
      <Link href={href} className={rootClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button className={rootClassName} {...props}>
      {children}
    </button>
  );
}
