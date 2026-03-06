import React from 'react';

type RipresNavigatorProps = {
  currentIndex: number;
  total: number;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onJump?: (index: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
  slides?: Array<{ title: string; path: string }>;
};

export const RipresNavigator: React.FC<RipresNavigatorProps> = ({
  currentIndex,
  total,
  title,
  onPrev,
  onNext,
  onJump,
  hasPrev,
  hasNext,
  slides = []
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        columnGap: 12,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: 999,
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        zIndex: 1000,
        width: 340,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Slide Menu Popover */}
      {showMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 280,
            maxHeight: 400,
            background: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            padding: '8px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            zIndex: 1001,
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, padding: '8px 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Jump to Slide</div>
          {slides.map((slide, idx) => (
            <button
              key={`${slide.path}-${idx}`}
              onClick={() => {
                onJump?.(idx);
                setShowMenu(false);
              }}
              style={{
                background: idx === currentIndex ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                color: idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.7)',
                padding: '10px 12px',
                borderRadius: 8,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'var(--font-main)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = idx === currentIndex ? 'rgba(255,255,255,0.1)' : 'transparent'; e.currentTarget.style.color = idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.7)'; }}
            >
              <span style={{ opacity: 0.4, width: 20, fontSize: 11, fontFamily: 'var(--font-mono)' }}>{String(idx + 1).padStart(2, '0')}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slide.title}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: 8,
          cursor: hasPrev ? 'pointer' : 'not-allowed',
          opacity: hasPrev ? 1 : 0.2,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { if (hasPrev) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        ←
      </button>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowMenu(!showMenu)}
        onKeyDown={(e) => e.key === 'Enter' && setShowMenu(!showMenu)}
        style={{
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 4,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {currentIndex + 1} / {total} · {title}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        style={{
          background: '#fff',
          border: 'none',
          color: '#000',
          padding: '6px 12px',
          borderRadius: 8,
          cursor: hasNext ? 'pointer' : 'not-allowed',
          opacity: hasNext ? 1 : 0.3,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { if (hasNext) e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        →
      </button>
    </div>
  );
};

export default RipresNavigator;
