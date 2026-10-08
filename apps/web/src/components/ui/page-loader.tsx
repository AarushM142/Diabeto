import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  durationMs?: number;
  onComplete?: () => void;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Initializing Clinical Decision Support Engine...',
  durationMs = 1000,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    let animationFrameId: number;

    const updateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed < durationMs) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        if (onComplete) {
          onComplete();
        }
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationFrameId);
  }, [durationMs, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: '#F9F8F4',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflow: 'hidden',
        }}
      >
        {/* Paper Grain Overlay */}
        <div className="paper-grain-overlay" aria-hidden="true" />

        {/* Ambient Subtle Radial Glows */}
        <div
          style={{
            position: 'absolute',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(140, 154, 132, 0.22) 0%, rgba(249, 248, 244, 0) 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* Center Illuminated Emblem with Expanding Rings */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
          {/* Pulsing Ripple 1 */}
          <motion.div
            animate={{
              scale: [1, 1.45, 1.8],
              opacity: [0.7, 0.3, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: '84px',
              height: '84px',
              borderRadius: '26px',
              border: '2px solid var(--accent-sage)',
              pointerEvents: 'none',
            }}
          />

          {/* Pulsing Ripple 2 */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1.6],
              opacity: [0.8, 0.4, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.3,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: '84px',
              height: '84px',
              borderRadius: '26px',
              border: '1.5px solid var(--text-forest)',
              pointerEvents: 'none',
            }}
          />

          {/* Center Brand Emblem */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 1, -1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'relative',
              zIndex: 10,
              width: '74px',
              height: '74px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #2D3A31 0%, #3D4F43 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 30px rgba(45, 58, 49, 0.22)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            <span
              className="font-serif"
              style={{
                color: '#FFFFFF',
                fontSize: '2.4rem',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              d.
            </span>
          </motion.div>
        </div>

        {/* Brand Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: '18px', zIndex: 10 }}
        >
          <span
            className="font-serif"
            style={{
              fontSize: '1.85rem',
              fontWeight: 700,
              color: 'var(--text-forest)',
              letterSpacing: '-0.02em',
              display: 'block',
            }}
          >
            diabeto.
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              marginTop: '3px',
              display: 'block',
            }}
          >
            Senior Care Precision Platform
          </span>
        </motion.div>

        {/* Animated ECG Pulse Waveform */}
        <div style={{ position: 'relative', width: '240px', height: '40px', margin: '6px 0 20px', zIndex: 10 }}>
          <svg width="240" height="40" viewBox="0 0 240 40" fill="none">
            {/* Background Faint Line */}
            <path
              d="M0 20 H70 L80 10 L90 32 L100 6 L112 28 L122 18 L130 20 H240"
              stroke="rgba(45, 58, 49, 0.12)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Animated Active ECG Line */}
            <motion.path
              d="M0 20 H70 L80 10 L90 32 L100 6 L112 28 L122 18 L130 20 H240"
              stroke="url(#ecgGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, pathOffset: 0 }}
              animate={{
                pathLength: [0.15, 0.4, 0.15],
                pathOffset: [0, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <defs>
              <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-sage)" stopOpacity="0.2" />
                <stop offset="50%" stopColor="var(--text-forest)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--status-ok)" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Progress Bar Container */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '300px',
            height: '8px',
            backgroundColor: 'var(--surface-clay)',
            borderRadius: '12px',
            border: '1px solid var(--border-stone)',
            overflow: 'hidden',
            marginBottom: '16px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #8C9A84 0%, #2D3A31 100%)',
              borderRadius: '12px',
              transition: 'width 0.05s linear',
            }}
          />
        </div>

        {/* Dynamic Status Text & Percentage */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} className="animate-pulse" color="var(--text-forest)" />
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-forest)' }}>
              {message}
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--accent-sage-dark)',
                fontFamily: 'monospace',
                background: 'var(--surface-clay)',
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid var(--border-stone)',
              }}
            >
              {progress}%
            </span>
          </div>

          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>


          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
