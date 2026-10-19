import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

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

const SCRAMBLE_CHARS = [
  // Lowercase
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  // Uppercase
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  // Numbers
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  // Special
  '<', '>', '%', '&', '@', '!', '#', '$', '^', '*', '(', ')', '-',
  '_', '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"',
  '?', '/', '~', '`',
];

const SCRAMBLE_COLORS = ['#85AF00', '#FFCC00', '#FB9CFD', '#A19BFF', '#FF4C00'];

export const HeroBanner: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const splitInstancesRef = useRef<SplitText[]>([]);

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

  // ── GSAP SplitText scramble-on-hover effect ─────────────────
  useEffect(() => {
    if (!contentRef.current) return;

    // Revert any previous SplitText instances before re-splitting
    splitInstancesRef.current.forEach((s) => s.revert());
    splitInstancesRef.current = [];

    const tagEl = contentRef.current.querySelector(
      '.hero-badge span:last-child'
    ) as HTMLElement | null;
    const titleEl = contentRef.current.querySelector(
      '.hero-title'
    ) as HTMLElement | null;
    const descEl = contentRef.current.querySelector(
      '.hero-desc-full'
    ) as HTMLElement | null;
    const shortEl = contentRef.current.querySelector(
      '.hero-desc-short'
    ) as HTMLElement | null;

    if (!tagEl || !titleEl || !descEl || !shortEl) return;

    // Split each target into lines + chars
    const targets = [tagEl, titleEl, descEl, shortEl];

    targets.forEach((el) => {
      const split = new SplitText(el, {
        type: 'lines,chars',
        linesClass: 'split-line',
        charsClass: 'split-char',
      });
      splitInstancesRef.current.push(split);

      // Cast Element[] -> HTMLElement[] once so .dataset/.style type-check
      const chars = split.chars as HTMLElement[];
      const lines = split.lines as HTMLElement[];

      // Attach the hover effect to each line
      lines.forEach((line) => {
        const onEnter = () => {
          const charsInLine = chars.filter((char) => line.contains(char));
          const totalChars = charsInLine.length;
          const middleIndex = (totalChars - 1) / 2;

          charsInLine.forEach((char, index) => {
            if (!char.dataset.orig) {
              char.dataset.orig = char.textContent || '';
            }

            const distanceFromCenter = Math.abs(index - middleIndex);

            gsap.fromTo(
              char,
              { color: '#fff' },
              {
                color: gsap.utils.random(SCRAMBLE_COLORS),
                ease: 'power3.out',
                duration: 0.3,
                delay: distanceFromCenter * 0.03,
                repeat: 1,
                yoyo: true,
                overwrite: 'auto',

                onStart: () => {
                  const randomNum = gsap.utils.random(['0', '1']);
                  const randomNumThree = gsap.utils.random(['0', '1', '2']);

                  // Randomly replace the character
                  if (randomNum === '1') {
                    char.textContent = gsap.utils.random(SCRAMBLE_CHARS);
                  }

                  // Randomly add a size label
                  if (randomNumThree === '1') {
                    const detail = document.createElement('span');
                    detail.classList.add('detail-size');
                    detail.textContent = `△x = ${char.clientWidth}px`;
                    char.appendChild(detail);
                  }

                  // Randomly add a colored border
                  if (randomNumThree === '1') {
                    char.style.border = `1px solid ${gsap.utils.random(
                      SCRAMBLE_COLORS
                    )}`;
                  }
                },

                onComplete: () => {
                  // ✅ FIX: dataset values are `string | undefined`;
                  // coalesce to '' so textContent (string | null) type-checks.
                  char.textContent = char.dataset.orig ?? '';
                  char.style.border = 'none';
                },
              }
            );
          });
        };

        line.addEventListener('mouseenter', onEnter);

        // Store the handler so we can clean it up
        (line as any)._scrambleHandler = onEnter;
      });
    });

    // Cleanup: revert splits and remove listeners
    return () => {
      splitInstancesRef.current.forEach((split) => {
        (split.lines as HTMLElement[]).forEach((line) => {
          const handler = (line as any)._scrambleHandler;
          if (handler) line.removeEventListener('mouseenter', handler);
        });
        split.revert();
      });
      splitInstancesRef.current = [];
    };
  }, [current]);

  return (
    <section className="hero-section">
      <div className="hero-art" aria-hidden="true">
        <svg viewBox="0 0 520 360" role="presentation">
          <defs>
            <linearGradient id="hero-hill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#AFD3E2" />
              <stop offset="100%" stopColor="#19A7CE" />
            </linearGradient>
            <linearGradient id="hero-road" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#F6F1F1" />
              <stop offset="100%" stopColor="#AFD3E2" />
            </linearGradient>
          </defs>
          <circle cx="390" cy="86" r="49" fill="#AFD3E2" opacity=".9" />
          <path
            d="M0 221c71-59 127-64 193-20 51 34 94 19 143-29 68-66 127-57 184-19v207H0z"
            fill="url(#hero-hill)"
          />
          <path
            d="M0 276c69-51 137-43 193-9 65 39 111 33 171-13 61-46 112-38 156-7v113H0z"
            fill="#146C94"
            opacity=".88"
          />
          <path d="M72 249h48v85H72z" fill="#F6F1F1" />
          <path d="M82 227h28v22H82z" fill="#19A7CE" />
          <path d="M150 223h61v111h-61z" fill="#F6F1F1" />
          <path d="M160 203h41v20h-41z" fill="#AFD3E2" />
          <path d="M225 252h44v82h-44z" fill="#AFD3E2" />
          <path d="M286 231h56v103h-56z" fill="#F6F1F1" />
          <path d="M298 210h32v21h-32z" fill="#19A7CE" />
          <path d="M358 267h43v67h-43z" fill="#F6F1F1" />
          <g fill="#19A7CE">
            <circle cx="58" cy="274" r="21" />
            <circle cx="51" cy="261" r="13" />
            <circle cx="422" cy="266" r="24" />
            <circle cx="432" cy="250" r="15" />
            <circle cx="471" cy="287" r="17" />
            <circle cx="465" cy="274" r="11" />
          </g>
          <path
            d="M178 334c47-29 88-35 132-23 28 8 49 8 80-3"
            fill="none"
            stroke="url(#hero-road)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M253 311l10 2m26 8 10 3m27 1 10-2"
            stroke="#146C94"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <g transform="translate(365 129)">
            <path
              d="M25 0c-14 0-25 11-25 25 0 18 25 43 25 43s25-25 25-43C50 11 39 0 25 0z"
              fill="#19A7CE"
            />
            <circle cx="25" cy="25" r="9" fill="#F6F1F1" />
          </g>
          <g transform="translate(31 112)">
            <rect width="154" height="54" rx="16" fill="#fff" opacity=".94" />
            <circle cx="27" cy="27" r="13" fill="#AFD3E2" />
            <path
              d="M21 27l4 4 8-9"
              fill="none"
              stroke="#146C94"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="49"
              y="18"
              width="82"
              height="6"
              rx="3"
              fill="#146C94"
              opacity=".75"
            />
            <rect
              x="49"
              y="30"
              width="59"
              height="5"
              rx="2.5"
              fill="#146C94"
              opacity=".25"
            />
          </g>
        </svg>
      </div>
      <div
        ref={contentRef}
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
