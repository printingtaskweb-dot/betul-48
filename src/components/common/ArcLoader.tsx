import React from 'react';

export interface ArcLoaderProps {
  /** Main status text, e.g. "Uploading Photo" or "Admin Command Center" */
  status?: string;
  /** Subtitle with details, e.g. "Applying GPS watermark…" or "Syncing to cloud…" */
  subtitle?: string;
  /** Current percentage (0–100) */
  percent?: number;
  /** Photo count, e.g. { current: 1, total: 1 } or "1 of 1 photo" */
  photoCount?: { current: number; total: number } | string;
  /**
   * Layout mode:
   * 'floating' (default): sleek floating island pill widget merged with UI with ZERO blackout.
   * 'center': centered floating card merged with UI with ZERO blackout.
   * 'inline': fits directly inside a section or card without any positioning.
   */
  mode?: 'floating' | 'center' | 'inline' | 'card' | 'fullscreen';
  /** Position for floating mode: 'bottom' (default) or 'top' */
  position?: 'bottom' | 'top' | 'center';
  fullscreen?: boolean;
  theme?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Logo-Integrated Betul Portal Arc Loader
 * Merged directly with the UI — ZERO screen blackout, ZERO dimming!
 * Features the official "B" logo emblem surrounded by 5 smooth harmonic
 * rotating arcs, real-time upload percentage, and status telemetry.
 */
export const ArcLoader: React.FC<ArcLoaderProps> = React.memo(({

  status = 'Processing…',
  subtitle,
  percent,
  photoCount,
  mode,
  position = 'bottom',
  fullscreen: _fullscreen,
  theme: _theme,
  className = '',
  style = {},
}) => {
  // Normalize mode: 'card' and 'fullscreen' are now treated as non-blackout floating/center widgets
  const effectiveMode: 'floating' | 'center' | 'inline' =
    mode === 'inline'
      ? 'inline'
      : mode === 'center' || position === 'center'
      ? 'center'
      : 'floating';

  // 5 website brand blue arcs
  const arcColors = [
    '#146C94', // Arc 1 (Outer): Brand Primary Blue
    '#19A7CE', // Arc 2: Vibrant Cyan
    '#5BB5D9', // Arc 3: Sky Blue
    '#AFD3E2', // Arc 4: Soft Accent
    '#0E526F', // Arc 5 (Inner): Deep Navy
  ];

  const photoCountText =
    typeof photoCount === 'object' && photoCount !== null
      ? `Photo ${photoCount.current} of ${photoCount.total}`
      : typeof photoCount === 'string'
      ? photoCount
      : null;

  const validPercent =
    typeof percent === 'number' ? Math.max(0, Math.min(100, Math.round(percent))) : null;

  // The Logo + 5-Arc Spinner
  const logoSpinner = (
    <div
      style={{
        position: 'relative',
        width: 68,
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <style>{`
        .betul-logo-arc {
          position: absolute;
          box-sizing: border-box;
          border-radius: 50%;
          border-style: solid;
          border-color: transparent;
          border-top-color: currentColor;
          border-right-color: currentColor;
          animation: betulArcRotate 1500ms cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
        }

        .betul-logo-arc:nth-child(1) {
          width: 66px;
          height: 66px;
          border-width: 2.5px;
          color: ${arcColors[0]};
          animation-delay: -60ms;
        }
        .betul-logo-arc:nth-child(2) {
          width: 58px;
          height: 58px;
          border-width: 2.25px;
          color: ${arcColors[1]};
          animation-delay: -120ms;
        }
        .betul-logo-arc:nth-child(3) {
          width: 50px;
          height: 50px;
          border-width: 2px;
          color: ${arcColors[2]};
          animation-delay: -180ms;
        }
        .betul-logo-arc:nth-child(4) {
          width: 42px;
          height: 42px;
          border-width: 1.75px;
          color: ${arcColors[3]};
          animation-delay: -240ms;
        }
        .betul-logo-arc:nth-child(5) {
          width: 34px;
          height: 34px;
          border-width: 1.5px;
          color: ${arcColors[4]};
          animation-delay: -300ms;
        }

        @keyframes betulArcRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes betulPillGlide {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes betulCenterGlide {
          0% {
            opacity: 0;
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      {/* 5 Rotating Arcs */}
      <div className="betul-logo-arc" />
      <div className="betul-logo-arc" />
      <div className="betul-logo-arc" />
      <div className="betul-logo-arc" />
      <div className="betul-logo-arc" />

      {/* Central Official "B" Logo Emblem */}
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: '#146C94',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: 'var(--font-primary, sans-serif)',
          fontWeight: 800,
          fontSize: 14,
          lineHeight: 1,
          boxShadow: '0 3px 10px rgba(20, 108, 148, 0.4)',
          zIndex: 2,
          userSelect: 'none',
        }}
      >
        B
      </div>
    </div>
  );

  // Status and Telemetry Block
  const telemetryBlock = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-primary, sans-serif)',
            fontSize: '0.88rem',
            fontWeight: 800,
            color: '#0f1f26',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {status}
        </span>
        {validPercent !== null && (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#146C94',
              background: 'rgba(20, 108, 148, 0.08)',
              padding: '1px 7px',
              borderRadius: 10,
            }}
          >
            {validPercent}%
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.74rem',
          color: '#6b8a99',
          fontFamily: 'var(--font-primary, sans-serif)',
        }}
      >
        {photoCountText && (
          <span style={{ fontWeight: 700, color: '#146C94' }}>
            {photoCountText} •
          </span>
        )}
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 500,
          }}
        >
          {subtitle || 'Syncing to municipal portal…'}
        </span>
      </div>

      {/* Slim progress bar */}
      {validPercent !== null && (
        <div
          style={{
            width: '100%',
            height: 5,
            borderRadius: 999,
            background: 'rgba(20, 108, 148, 0.1)',
            overflow: 'hidden',
            marginTop: 3,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${validPercent}%`,
              borderRadius: 999,
              background: 'linear-gradient(90deg, #146C94 0%, #19A7CE 100%)',
              transition: 'width 0.25s ease-out',
            }}
          />
        </div>
      )}
    </div>
  );

  // ── Mode 1: Inline (Fits directly inside a page/card, zero fixed overlay) ──
  if (effectiveMode === 'inline') {
    return (
      <div
        className={`betul-loader-inline ${className}`.trim()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 20px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 20,
          border: '1.5px solid rgba(20, 108, 148, 0.16)',
          boxShadow: '0 10px 30px -10px rgba(20, 108, 148, 0.14)',
          maxWidth: 400,
          width: '100%',
          margin: '0 auto',
          ...style,
        }}
      >
        {logoSpinner}
        {telemetryBlock}
      </div>
    );
  }

  // ── Mode 2: Center Floating Card (Zero blackout, 100% transparent background) ──
  if (effectiveMode === 'center') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'transparent',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          className={`betul-loader-card ${className}`.trim()}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(20, 108, 148, 0.22)',
            borderRadius: 24,
            padding: '16px 22px',
            boxShadow:
              '0 20px 45px -10px rgba(20, 108, 148, 0.28), 0 4px 16px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            maxWidth: 380,
            width: '100%',
            animation: 'betulCenterGlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            ...style,
          }}
        >
          {logoSpinner}
          {telemetryBlock}
        </div>
      </div>
    );
  }

  // ── Mode 3: Floating Island Pill (ZERO blackout, floats at bottom/top like native dynamic widget) ──
  const isTop = position === 'top';

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        ...(isTop ? { top: 20 } : { bottom: 28 }),
        zIndex: 99999,
        background: 'transparent',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        className={`betul-floating-pill ${className}`.trim()}
        style={{
          pointerEvents: 'auto',
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(20, 108, 148, 0.22)',
          borderRadius: 999,
          padding: '10px 20px 10px 14px',
          boxShadow:
            '0 20px 45px -10px rgba(20, 108, 148, 0.3), 0 4px 16px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          maxWidth: 420,
          width: 'auto',
          minWidth: 290,
          animation: 'betulPillGlide 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          ...style,
        }}
      >
        {logoSpinner}
        {telemetryBlock}
      </div>
    </div>
  );
});

ArcLoader.displayName = "ArcLoader";

export default ArcLoader;
