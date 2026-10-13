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
      className="hero-section"
      style={{
        margin: '16px 14px',
      }}
    >
      <div
        className="hero-content"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        {/* Badge */}
        <div className="hero-badge">
          <span className="dot" />
          {slide.tag}
        </div>

        {/* Title */}
        <h1 className="hero-title">
          {slide.title}
        </h1>

        {/* Subtitle with arrows */}
        <div className="hero-desc">
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="arrow left"
          >
            <ChevronLeft size={16} />
          </button>

          {slide.subtitle}

          <button
            onClick={next}
            aria-label="Next slide"
            className="arrow right"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* CTA Button */}
        <div style={{ marginTop: 12 }}>
          <a
            href={slide.ctaLink}
            className="hero-cta"
          >
            {slide.cta}
            <ArrowRight size={14} />
          </a>
        </div>

        {/* Dots */}
        <div className="hero-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`dot ${i === current ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
