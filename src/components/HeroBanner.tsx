import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface BannerSlide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
}

const SLIDES: BannerSlide[] = [
  {
    id: 1,
    tag: '#1 Cleanest City Model',
    title: 'Clean Indore & Betul Mission',
    subtitle: 'Report civic issues instantly with photo & auto GPS location. Track until resolved and verified.',
    cta: 'Report Civic Issue',
    ctaLink: '/complaint/new',
  },
  {
    id: 2,
    tag: 'Water Conservation',
    title: 'Report Water Leakage & Supply',
    subtitle: 'Save precious water every day. Spot a broken pipe or shortage? Route to department in 30 seconds.',
    cta: 'Report Water Issue',
    ctaLink: '/complaint/new?dept=water',
  },
  {
    id: 3,
    tag: 'Monsoon Preparedness',
    title: 'Rain Water & Flood Drainage',
    subtitle: 'Blocked storm drains or road waterlogging? Municipal teams ready for immediate dispatch.',
    cta: 'Report Drainage',
    ctaLink: '/complaint/new?dept=rainwater',
  },
  {
    id: 4,
    tag: 'Green Waste Initiative',
    title: 'Biodegradable Waste Pickup',
    subtitle: 'Garden trimmings, fallen branches, and leaves — specialized pickup fleet dispatched to your location.',
    cta: 'Report Green Waste',
    ctaLink: '/department/green',
  },
  {
    id: 5,
    tag: 'Debris Free City',
    title: 'C&D Waste Clearance Drive',
    subtitle: 'Construction and demolition waste clearance. Fast removal of roadside rubble and debris.',
    cta: 'Report C&D Waste',
    ctaLink: '/complaint/new?dept=cnd',
  },
];

export const HeroBanner: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(idx);
        setAnimating(false);
      }, 250);
    },
    [animating]
  );

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <div
      style={{
        position: 'relative',
        margin: '16px 20px',
        borderRadius: 28,
        overflow: 'hidden',
        boxShadow: '0 24px 48px -18px rgba(74, 14, 31, 0.4)',
      }}
    >
      <div
        style={{
          background: '#4A0E1F',
          padding: '44px 28px',
          position: 'relative',
          minHeight: 'clamp(280px, 35vw, 380px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: 'absolute',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 65%)',
            top: -100, right: -80,
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.9)',
              width: 'fit-content',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#fff',
              display: 'inline-block',
            }} />
            {slide.tag}
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 'clamp(32px, 8vw, 48px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#fff',
              margin: 0,
              textShadow: 'none',
            }}
          >
            {slide.title}
          </h1>

          {/* Subtitle with arrows */}
          <div style={{ position: 'relative', padding: '0 16px' }}>
            {/* Left arrow */}
            <button
              onClick={prev}
              aria-label="Previous slide"
              style={{
                position: 'absolute',
                top: '50%', transform: 'translateY(-50%)',
                left: -8,
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', fontSize: 12,
                transition: 'all 0.3s ease',
              }}
            >
              <ChevronLeft size={14} color="#fff" />
            </button>

            <p
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.75)',
                maxWidth: '90%',
                margin: 0,
              }}
            >
              {slide.subtitle}
            </p>

            {/* Right arrow */}
            <button
              onClick={next}
              aria-label="Next slide"
              style={{
                position: 'absolute',
                top: '50%', transform: 'translateY(-50%)',
                right: -8,
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', fontSize: 12,
                transition: 'all 0.3s ease',
              }}
            >
              <ChevronRight size={14} color="#fff" />
            </button>
          </div>

          {/* CTA Button */}
          <div style={{ marginTop: 12 }}>
            <a
              href={slide.ctaLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 32px',
                borderRadius: 999,
                background: '#FFFFFF',
                color: '#4A0E1F',
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: '0.02em',
                textDecoration: 'none',
                width: 'fit-content',
                transition: 'all 0.4s cubic-bezier(0.6, 0, 0.2, 1)',
                boxShadow: '0 8px 20px -8px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(6px)';
                e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px -8px rgba(0,0,0,0.15)';
              }}
            >
              {slide.cta}
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 24, justifyContent: 'center' }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                style={{
                  width: i === current ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
