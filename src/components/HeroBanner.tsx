import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Clock,
  TrendingUp,
  Recycle,
  Droplets,
  Trash2,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

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
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '<', '>', '%', '&', '@', '!', '#', '$', '^', '*', '(', ')', '-',
  '_', '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"',
  '?', '/', '~', '`',
];

const SCRAMBLE_COLORS = ['#146C94', '#19A7CE', '#AFD3E2', '#F6F1F1', '#0f1f26'];

interface Stat {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

const STATS: Stat[] = [
  {
    icon: <CheckCircle2 size={18} />,
    value: 12400,
    suffix: '+',
    label: 'Complaints Resolved',
    color: '#146C94',
  },
  {
    icon: <Clock size={18} />,
    value: 48,
    suffix: 'h',
    label: 'Avg. Response Time',
    color: '#19A7CE',
  },
  {
    icon: <TrendingUp size={18} />,
    value: 94,
    suffix: '%',
    label: 'Citizen Satisfaction',
    color: '#AFD3E2',
  },
];

const HOW_IT_WORKS = [
  {
    icon: <MapPin size={16} />,
    label: 'Report',
    desc: 'Photo + GPS',
    color: '#19A7CE',
  },
  {
    icon: <Clock size={16} />,
    label: 'Assign',
    desc: 'Auto-routed',
    color: '#146C94',
  },
  {
    icon: <CheckCircle2 size={16} />,
    label: 'Resolve',
    desc: 'Verified close',
    color: '#AFD3E2',
  },
];

const StatCounter: React.FC<{ stat: Stat; trigger: boolean }> = ({ stat, trigger }) => {
  const numRef = useRef<HTMLSpanElement>(null);
  const objRef = useRef({ val: 0 });

  useEffect(() => {
    if (!trigger || !numRef.current) return;
    objRef.current.val = 0;
    const tween = gsap.to(objRef.current, {
      val: stat.value,
      duration: 2.2,
      ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.textContent =
            stat.value >= 1000
              ? Math.round(objRef.current.val).toLocaleString('en-IN')
              : Math.round(objRef.current.val).toString();
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [trigger, stat.value]);

  return (
    <div className="hero-stat-card">
      <span className="hero-stat-icon" style={{ color: stat.color }}>
        {stat.icon}
      </span>
      <div className="hero-stat-body">
        <span className="hero-stat-number">
          <span ref={numRef}>0</span>
          <span className="hero-stat-suffix">{stat.suffix}</span>
        </span>
        <span className="hero-stat-label">{stat.label}</span>
      </div>
    </div>
  );
};

export const HeroBanner: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => setStatsVisible(true), 600);
    return () => window.clearTimeout(timeout);
  }, []);

  // GSAP intro + float + parallax + scroll
  useEffect(() => {
    if (!sectionRef.current) return;
    const section = sectionRef.current;
    const cards = Array.from(section.querySelectorAll('.hero-float-card'));

    gsap.set('.hero-title', { opacity: 0, y: 40 });
    gsap.set('.hero-badge', { opacity: 0, y: -20 });
    gsap.set('.hero-desc', { opacity: 0, y: 30 });
    gsap.set('.hero-actions', { opacity: 0, y: 30 });
    gsap.set('.hero-how', { opacity: 0, y: 30 });
    gsap.set('.hero-stats', { opacity: 0, y: 30 });
    gsap.set('.hero-dots', { opacity: 0 });
    gsap.set('.hero-art svg', { opacity: 0, scale: 0.95 });

    cards.forEach((card, i) => {
      const rot = i === 0 ? -9 : i === 1 ? -5 : i === 2 ? 4 : 0;
      (card as HTMLElement).dataset.restRot = String(rot);
      gsap.set(card, { y: -80, rotation: rot + 25, opacity: 0, scale: 0.7 });
    });

    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .to('.hero-badge', { opacity: 1, y: 0, duration: 0.8 }, 0.1)
      .to('.hero-title', { opacity: 1, y: 0, duration: 0.9 }, 0.25)
      .to('.hero-desc', { opacity: 1, y: 0, duration: 0.8 }, 0.45)
      .to('.hero-actions', { opacity: 1, y: 0, duration: 0.8 }, 0.6)
      .to('.hero-how', { opacity: 1, y: 0, duration: 0.8 }, 0.75)
      .to('.hero-stats', { opacity: 1, y: 0, duration: 0.8 }, 0.9)
      .to('.hero-dots', { opacity: 1, duration: 0.6 }, 1.1)
      .to('.hero-art svg', { opacity: 1, scale: 1, duration: 1.1 }, 0.4)
      .to(
        '.hero-float-card',
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotation: (i: number, el: HTMLElement) => parseFloat(el.dataset.restRot || '0'),
          duration: 1.1,
          stagger: { each: 0.1, from: 'center' },
          ease: 'back.out(1.4)',
        },
        0.6
      );

    cards.forEach((card, i) => {
      const rot = parseFloat((card as HTMLElement).dataset.restRot || '0');
      gsap.to(card, {
        y: `+=${8 + (i % 3) * 5}`,
        rotation: rot + (i % 2 === 0 ? 1.5 : -1.5),
        duration: 3 + (i % 4) * 0.5,
        delay: 1.8 + i * 0.1,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    });

    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: MouseEvent) => {
      const r = section.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
    };
    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseleave', onLeave);

    let rafId = 0;
    const parallax = () => {
      tx += (mx - tx) * 0.05;
      ty += (my - ty) * 0.05;
      cards.forEach((card) => {
        const d = 10 + (parseInt((card as HTMLElement).style.zIndex) || 0);
        (card as HTMLElement).style.translate = `${tx * d}px ${ty * d * 0.5}px`;
      });
      rafId = requestAnimationFrame(parallax);
    };
    parallax();

    const hoverHandlers: Array<{
      el: Element;
      enter: () => void;
      leave: () => void;
      move: (e: MouseEvent) => void;
    }> = [];

    cards.forEach((card) => {
      const enter = () => {
        gsap.to(card, {
          scale: 1.12,
          zIndex: 20,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };
      const move = (e: MouseEvent) => {
        const r = (card as HTMLElement).getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
          rotateX: -py * 16,
          rotateY: px * 16,
          duration: 0.4,
          ease: 'power2.out',
          transformPerspective: 700,
          overwrite: 'auto',
        });
      };
      const leave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          duration: 0.8,
          ease: 'elastic.out(1, 0.6)',
          overwrite: 'auto',
        });
      };
      card.addEventListener('mouseenter', enter);
      card.addEventListener('mousemove', move as EventListener);
      card.addEventListener('mouseleave', leave);
      hoverHandlers.push({ el: card, enter, leave, move });
    });

    const scrollTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.8,
      onUpdate: (self) => {
        const p = self.progress;
        const moves = [
          { x: -120, y: -40, rot: -25 },
          { x: 40, y: 80, rot: 12 },
          { x: 160, y: -20, rot: 28 },
        ];
        cards.forEach((card, i) => {
          const m = moves[i] || { x: 0, y: 0, rot: 0 };
          const rest = parseFloat((card as HTMLElement).dataset.restRot || '0');
          gsap.set(card, {
            x: m.x * p,
            y: m.y * p,
            rotation: rest + m.rot * p,
          });
        });
      },
    });

    return () => {
      section.removeEventListener('mousemove', onMove);
      section.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
      hoverHandlers.forEach(({ el, enter, leave, move }) => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mousemove', move as EventListener);
        el.removeEventListener('mouseleave', leave);
      });
      scrollTrigger.kill();
    };
  }, []);

  const slide = SLIDES[current];

  // SplitText scramble on hover
  useEffect(() => {
    if (!contentRef.current) return;

    splitInstancesRef.current.forEach((s) => s.revert());
    splitInstancesRef.current = [];

    const tagEl = contentRef.current.querySelector('.hero-badge span:last-child') as HTMLElement | null;
    const titleEl = contentRef.current.querySelector('.hero-title') as HTMLElement | null;
    const descEl = contentRef.current.querySelector('.hero-desc-full') as HTMLElement | null;
    const shortEl = contentRef.current.querySelector('.hero-desc-short') as HTMLElement | null;

    if (!tagEl || !titleEl || !descEl || !shortEl) return;

    const targets = [tagEl, titleEl, descEl, shortEl];

    targets.forEach((el) => {
      const split = new SplitText(el, {
        type: 'lines,chars',
        linesClass: 'split-line',
        charsClass: 'split-char',
      });
      splitInstancesRef.current.push(split);

      const chars = split.chars as HTMLElement[];
      const lines = split.lines as HTMLElement[];

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
                  if (randomNum === '1') {
                    char.textContent = gsap.utils.random(SCRAMBLE_CHARS);
                  }
                  if (randomNumThree === '1') {
                    const detail = document.createElement('span');
                    detail.classList.add('detail-size');
                    detail.textContent = `△x = ${char.clientWidth}px`;
                    char.appendChild(detail);
                  }
                  if (randomNumThree === '1') {
                    char.style.border = `1px solid ${gsap.utils.random(SCRAMBLE_COLORS)}`;
                  }
                },
                onComplete: () => {
                  char.textContent = char.dataset.orig ?? '';
                  char.style.border = 'none';
                },
              }
            );
          });
        };

        line.addEventListener('mouseenter', onEnter);
        (line as any)._scrambleHandler = onEnter;
      });
    });

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
    <section ref={sectionRef} className="hero-section">
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
            <span className="hero-desc-full">{slide.subtitle}</span>
            <span className="hero-desc-short">
              {slide.subtitleShort ?? slide.subtitle}
            </span>
          </p>

          <div className="hero-arrows">
            <button type="button" onClick={prev} aria-label="Previous slide" className="hero-arrow">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={next} aria-label="Next slide" className="hero-arrow">
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

        <div className="hero-how" aria-label="How it works">
          <span className="hero-how-label">How it works</span>
          <div className="hero-how-steps">
            {HOW_IT_WORKS.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="hero-how-step">
                  <span
                    className="hero-how-icon"
                    style={{ background: step.color + '22', color: step.color }}
                  >
                    {step.icon}
                  </span>
                  <span className="hero-how-step-name">{step.label}</span>
                  <span className="hero-how-step-desc">{step.desc}</span>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <ArrowRight size={12} className="hero-how-arrow" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="hero-stats" aria-label="Key statistics">
          {STATS.map((stat) => (
            <StatCounter key={stat.label} stat={stat} trigger={statsVisible} />
          ))}
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

      <div className="hero-art" aria-hidden="true">
        <div className="hero-float-card hero-float-card--a">
          <Recycle size={14} style={{ color: '#146C94' }} />
          <span>Green Waste</span>
          <strong>↑ 18%</strong>
        </div>
        <div className="hero-float-card hero-float-card--b">
          <Droplets size={14} style={{ color: '#19A7CE' }} />
          <span>Water Saved</span>
          <strong>3.2 ML</strong>
        </div>
        <div className="hero-float-card hero-float-card--c">
          <Trash2 size={14} style={{ color: '#AFD3E2' }} />
          <span>Waste Cleared</span>
          <strong>94 T</strong>
        </div>

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
            <rect x="49" y="18" width="82" height="6" rx="3" fill="#146C94" opacity=".75" />
            <rect x="49" y="30" width="59" height="5" rx="2.5" fill="#146C94" opacity=".25" />
          </g>
        </svg>
      </div>
    </section>
  );
};

export default HeroBanner;
