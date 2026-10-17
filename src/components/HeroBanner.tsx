import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface BannerSlide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  subtitleShort?: string;
  cta: string;
  ctaLink: string;
}

const SLIDES: BannerSlide[] = [
  {
    id: 1,
    tag: '#1 Cleanest City Model',
    title: 'Clean Indore & Betul Mission',
    subtitle:
      'Report civic issues instantly with photo & auto GPS location. Track until resolved and verified.',
    subtitleShort: 'Report civic issues with photo & GPS. Track until resolved.',
    cta: 'Report Civic Issue',
    ctaLink: '/complaint/new',
  },
  {
    id: 2,
    tag: 'Water Conservation',
    title: 'Report Water Leakage & Supply',
    subtitle:
      'Save precious water every day. Report broken pipes and water shortages in seconds.',
    subtitleShort: 'Report broken pipes & water shortages in seconds.',
    cta: 'Report Water Issue',
    ctaLink: '/complaint/new?dept=water',
  },
  {
    id: 3,
    tag: 'Monsoon Preparedness',
    title: 'Rain Water & Flood Drainage',
    subtitle:
      'Report blocked storm drains and road waterlogging for faster municipal action.',
    subtitleShort: 'Report blocked drains & waterlogging for faster action.',
    cta: 'Report Drainage',
    ctaLink: '/complaint/new?dept=rainwater',
  },
  {
    id: 4,
    tag: 'Green Waste Initiative',
    title: 'Biodegradable Waste Pickup',
    subtitle:
      'Report garden trimmings, fallen branches, and leaves that need specialized pickup.',
    subtitleShort: 'Report garden trimmings & leaves for specialized pickup.',
    cta: 'Report Green Waste',
    ctaLink: '/department/green',
  },
  {
    id: 5,
    tag: 'Debris Free City',
    title: 'C&D Waste Clearance Drive',
    subtitle:
      'Report construction rubble and demolition waste dumped along roadsides.',
    subtitleShort: 'Report construction rubble dumped along roadsides.',
    cta: 'Report C&D Waste',
    ctaLink: '/complaint/new?dept=cnd',
  },
];

export const HeroBanner: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      if (animating || idx === current) return;

      setAnimating(true);

      window.setTimeout(() => {
        setCurrent(idx);
        setAnimating(false);
      }, 200);
    },
    [animating, current]
  );

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length);
  }, [current, goTo]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((previous) => (previous + 1) % SLIDES.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const slide = SLIDES[current];

  return (
    <section className="hero-section">
      <div
        className={`hero-content ${animating ? 'hero-fading' : ''}`}
        aria-live="polite"
      >
        <div className="hero-badge">
          <span className="hero-status-dot" />
          <span>{slide.tag}</span>
        </div>

        <h1 className="hero-title">{slide.title}</h1>

        <div className="hero-desc">
          <p className="hero-desc-text">
            {/* Full text on larger screens, short text on mobile */}
            <span className="hero-desc-full">{slide.subtitle}</span>
            <span className="hero-desc-short">
              {slide.subtitleShort ?? slide.subtitle}
            </span>
          </p>

          <div className="hero-arrows">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="hero-arrow"
            >
              <ChevronLeft size={17} />
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="hero-arrow"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        <div className="hero-actions">
          <a href={slide.ctaLink} className="hero-cta">
            {slide.cta}
            <ArrowRight size={15} />
          </a>
        </div>

        <div className="hero-dots" aria-label="Banner slides">
          {SLIDES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === current ? 'true' : undefined}
              className={`hero-dot ${index === current ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
