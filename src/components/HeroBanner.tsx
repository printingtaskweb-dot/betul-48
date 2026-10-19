import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface HeroCardData {
  id: number;
  className: string;
  rot: number;
  depth: number;
  img: string;
  alt: string;
}

const HERO_CARDS: HeroCardData[] = [
  {
    id: 1,
    className: 'card card-1',
    rot: -9,
    depth: 14,
    img: '/cleaning.png',
    alt: 'Sanitation & Cleaning',
  },
  {
    id: 2,
    className: 'card card-2',
    rot: -5,
    depth: 10,
    img: '/road.png',
    alt: 'Roads & Infrastructure',
  },
  {
    id: 3,
    className: 'card card-3',
    rot: -2,
    depth: 8,
    img: '/water.png',
    alt: 'Water Supply',
  },
  {
    id: 4,
    className: 'card card-4',
    rot: 3,
    depth: 12,
    img: '/street_light.png',
    alt: 'Street Lighting',
  },
  {
    id: 5,
    className: 'card card-5',
    rot: 0,
    depth: 6,
    img: '/green.png',
    alt: 'Green Waste Initiative',
  },
  {
    id: 6,
    className: 'card card-6',
    rot: 4,
    depth: 11,
    img: '/sewage.png',
    alt: 'Sewage Drainage',
  },
  {
    id: 7,
    className: 'card card-7',
    rot: 7,
    depth: 9,
    img: '/C&D.png',
    alt: 'C&D Waste Clearance',
  },
  {
    id: 8,
    className: 'card card-8',
    rot: -4,
    depth: 13,
    img: '/rain_water.png',
    alt: 'Rainwater Drainage',
  },
];

export const HeroBanner: React.FC = () => {
  const { language } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!heroRef.current) return;

    let animFrameId: number;
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;

    const ctx = gsap.context(() => {
      // INITIAL STATES
      gsap.set('.small-team .word > span', { y: '105%' });
      gsap.set('.big-results .letter', { y: 80, opacity: 0 });
      gsap.set('#subline', { opacity: 0, y: 20 });

      // Apply each card's rest rotation and initial entrance values
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      cards.forEach((card) => {
        const rot = parseFloat(card.dataset.rot || '0') || 0;
        card.dataset.restRot = rot.toString();
        gsap.set(card, { y: -800, rotation: rot + 25, opacity: 0, scale: 0.7 });
      });

      // INTRO TIMELINE
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .to(
          '.small-team .word > span',
          {
            y: '0%',
            duration: 0.9,
            stagger: 0.08,
            ease: 'power3.out',
          },
          0.2
        )
        .to(
          '.big-results .letter',
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.05,
            ease: 'back.out(1.6)',
          },
          0.45
        )
        .to(
          cards,
          {
            y: 0,
            opacity: 1,
            scale: 1,
            rotation: (_i, el) => parseFloat((el as HTMLElement).dataset.restRot || '0') || 0,
            duration: 1.1,
            stagger: { each: 0.08, from: 'center' },
            ease: 'back.out(1.4)',
          },
          0.7
        )
        .to('#subline', { opacity: 1, y: 0, duration: 0.8 }, 1.4);

      // CONTINUOUS FLOAT ON CARDS
      cards.forEach((card, i) => {
        const rot = parseFloat(card.dataset.restRot || '0') || 0;
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

      // MOUSEMOVE PARALLAX
      const hero = heroRef.current;
      if (hero) {
        const onMouseMove = (e: MouseEvent) => {
          const r = hero.getBoundingClientRect();
          mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
          my = ((e.clientY - r.top) / r.height - 0.5) * 2;
        };

        const onMouseLeave = () => {
          mx = 0;
          my = 0;
        };

        hero.addEventListener('mousemove', onMouseMove);
        hero.addEventListener('mouseleave', onMouseLeave);

        const parallax = () => {
          tx += (mx - tx) * 0.05;
          ty += (my - ty) * 0.05;
          cards.forEach((card) => {
            const d = parseFloat(card.dataset.depth || '8') || 8;
            (card.style as any).translate = `${tx * d}px ${ty * d * 0.5}px`;
          });
          animFrameId = requestAnimationFrame(parallax);
        };
        animFrameId = requestAnimationFrame(parallax);
      }

      // CARD 3D TILT ON HOVER
      cards.forEach((card) => {
        const onCardMove = (e: MouseEvent) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(card, {
            rotateX: -py * 16,
            rotateY: px * 16,
            scale: 1.12,
            zIndex: 20,
            duration: 0.4,
            ease: 'power2.out',
            transformPerspective: 700,
            overwrite: 'auto',
          });
        };

        const onCardLeave = () => {
          gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            zIndex: card.style.zIndex || '',
            duration: 0.8,
            ease: 'elastic.out(1, 0.6)',
            overwrite: 'auto',
          });
        };

        const onCardClick = () => {
          gsap.fromTo(
            card,
            { scale: 1.15 },
            {
              scale: 1.05,
              duration: 0.15,
              yoyo: true,
              repeat: 1,
              ease: 'power2.inOut',
            }
          );
        };

        card.addEventListener('mousemove', onCardMove);
        card.addEventListener('mouseleave', onCardLeave);
        card.addEventListener('click', onCardClick);
      });

      // SCROLL: CARDS FAN OUT, "big results" SCALES UP
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set('.big-results', { scale: 1 + 0.15 * p, opacity: 1 - 0.4 * p });
          gsap.set('.small-team', { y: -60 * p, opacity: 1 - p * 1.5 });
          const moves = [
            { x: -260, y: -40, rot: -25 },
            { x: -200, y: 20, rot: -18 },
            { x: -120, y: 80, rot: -10 },
            { x: -40, y: 120, rot: -4 },
            { x: 40, y: 120, rot: 4 },
            { x: 120, y: 80, rot: 12 },
            { x: 200, y: 20, rot: 22 },
            { x: 260, y: -40, rot: 28 },
          ];
          cards.forEach((card, i) => {
            const m = moves[i];
            if (!m) return;
            const rest = parseFloat(card.dataset.restRot || '0') || 0;
            gsap.set(card, {
              x: m.x * p,
              y: m.y * p,
              rotation: rest + m.rot * p,
            });
          });
          gsap.set('#subline', { opacity: 1 - p * 2 });
        },
      });
    }, heroRef);

    return () => {
      cancelAnimationFrame(animFrameId);
      ctx.revert();
    };
  }, []);

  return (
    <section className="hero hero-animation-section" id="heroSection" ref={heroRef}>
      <style>{`
        .hero-animation-section {
          --hero-bg: #F6F1F1;
          --hero-ink: #0f1f26;
          --hero-ink-soft: #1f3540;
          --hero-mute: #6b8a99;
          --hero-line: #c4d8e2;
          --hero-ghost: #b8d0da;
          --accent-1: #146C94;
          --accent-2: #19A7CE;
          --accent-3: #AFD3E2;
          --accent-4: #e2f0f7;

          position: relative;
          min-height: 78vh;
          padding: 40px 24px 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 5;
          overflow: hidden;
          background: radial-gradient(
            120% 70% at 50% 0%,
            #ffffff 0%,
            #F6F1F1 55%,
            #e2e8ec 100%
          );
        }

        .hero-animation-section .grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.05;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }

        .hero-animation-section .small-team {
          font-family: var(--font-primary, "DM Sans", system-ui, sans-serif);
          font-weight: 700;
          font-size: clamp(36px, 5.8vw, 84px);
          letter-spacing: -0.035em;
          line-height: 1;
          color: var(--hero-ink);
          text-align: center;
          margin-bottom: 0;
          z-index: 4;
          position: relative;
        }

        .hero-animation-section .small-team .word {
          display: inline-block;
          overflow: hidden;
          vertical-align: top;
        }

        .hero-animation-section .small-team .word > span {
          display: inline-block;
          transform: translateY(105%);
        }

        .hero-animation-section .big-results-wrap {
          position: relative;
          width: 100%;
          margin-top: -16px;
          display: flex;
          justify-content: center;
          z-index: 1;
          user-select: none;
        }

        .hero-animation-section .big-results {
          font-family: var(--font-primary, "DM Sans", system-ui, sans-serif);
          font-style: italic;
          font-weight: 800;
          font-size: clamp(96px, 19vw, 280px);
          letter-spacing: -0.045em;
          line-height: 0.85;
          color: var(--hero-ghost);
          text-align: center;
          white-space: nowrap;
          user-select: none;
          z-index: 1;
          text-shadow: 0 4px 12px rgba(20, 108, 148, 0.08);
        }

        .hero-animation-section .big-results .letter {
          display: inline-block;
          transform-origin: bottom;
          will-change: transform, opacity;
        }

        .hero-animation-section .cards-row {
          position: absolute;
          left: 0;
          right: 0;
          top: 48%;
          height: 320px;
          z-index: 3;
          pointer-events: none;
        }

        .hero-animation-section .cards-row > * {
          pointer-events: auto;
        }

        .hero-animation-section .card {
          position: absolute;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
          border: 1.5px solid rgba(20, 108, 148, 0.18);
          box-shadow: 0 24px 44px -14px rgba(20, 108, 148, 0.35),
            0 10px 22px -6px rgba(20, 108, 148, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          cursor: pointer;
          will-change: transform;
          transition: box-shadow 0.4s ease;
        }

        .hero-animation-section .card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            155deg,
            rgba(255, 255, 255, 0.3) 0%,
            transparent 40%,
            rgba(20, 108, 148, 0.06) 100%
          );
          pointer-events: none;
          border-radius: inherit;
          z-index: 2;
        }

        .hero-animation-section .card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        .hero-animation-section .card:hover {
          box-shadow: 0 36px 64px -16px rgba(20, 108, 148, 0.5),
            0 18px 32px -8px rgba(20, 108, 148, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .hero-animation-section .card-1 { width: 130px; height: 180px; left: 4%; top: 30px; z-index: 1; }
        .hero-animation-section .card-2 { width: 160px; height: 220px; left: 12%; top: 50px; z-index: 2; }
        .hero-animation-section .card-3 { width: 200px; height: 270px; left: 22%; top: 20px; z-index: 4; }
        .hero-animation-section .card-4 { width: 150px; height: 200px; left: 36%; top: 70px; z-index: 3; }
        .hero-animation-section .card-5 { width: 230px; height: 310px; left: 44%; top: 0px; z-index: 5; }
        .hero-animation-section .card-6 { width: 160px; height: 215px; left: 59%; top: 55px; z-index: 3; }
        .hero-animation-section .card-7 { width: 175px; height: 240px; left: 70%; top: 30px; z-index: 4; }
        .hero-animation-section .card-8 { width: 130px; height: 175px; left: 84%; top: 50px; z-index: 2; }

        /* Report Civic Issue pill placed lower to avoid overlapping cards */
        .hero-animation-section .subline {
          margin-top: 250px;
          text-align: center;
          z-index: 10;
          position: relative;
        }

        .hero-animation-section .subline .arrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--hero-ink);
          color: #fafaf7;
          border: none;
          padding: 13px 24px 13px 28px;
          border-radius: 999px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 14px 24px -8px rgba(0, 0, 0, 0.4),
            0 5px 10px -2px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -2px 4px rgba(0, 0, 0, 0.4);
          transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
        }

        .hero-animation-section .subline .arrow-pill:hover {
          transform: translateY(-2px);
        }

        .hero-animation-section .subline .arrow-pill .ar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(180deg, var(--accent-1), var(--accent-2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
        }

        .hero-animation-section .subline .arrow-pill:hover .ar {
          transform: rotate(45deg);
        }

        .hero-animation-section .subline-text {
          margin-top: 20px;
          font-size: 13px;
          color: var(--hero-mute);
          letter-spacing: 0.06em;
          font-weight: 500;
        }

        @media (max-width: 750px) {
          .hero-animation-section {
            padding: 30px 16px 36px;
            min-height: 72vh;
          }
          .hero-animation-section .small-team {
            font-size: 11vw;
          }
          .hero-animation-section .big-results {
            font-size: 24vw;
          }
          .hero-animation-section .cards-row {
            height: 220px;
            top: 50%;
          }
          .hero-animation-section .card-1 { width: 80px; height: 110px; left: 0%; top: 20px; }
          .hero-animation-section .card-2 { width: 90px; height: 130px; left: 10%; top: 35px; }
          .hero-animation-section .card-3 { width: 110px; height: 150px; left: 22%; top: 15px; }
          .hero-animation-section .card-4 { width: 90px; height: 120px; left: 36%; top: 50px; }
          .hero-animation-section .card-5 { width: 130px; height: 180px; left: 46%; top: 0; }
          .hero-animation-section .card-6 { width: 95px; height: 130px; left: 62%; top: 40px; }
          .hero-animation-section .card-7 { width: 100px; height: 140px; left: 74%; top: 20px; }
          .hero-animation-section .card-8 { width: 80px; height: 110px; left: 87%; top: 35px; }
          .hero-animation-section .subline {
            margin-top: 175px;
          }
        }
      `}</style>

      {/* Grain background overlay */}
      <div className="grain" />

      {/* Masked reveal title */}
      <h1 className="small-team" id="smallTeam">
        <span className="word">
          <span>{language === 'hi' ? 'छोटा' : 'Small'}</span>
        </span>
        &nbsp;
        <span className="word">
          <span>{language === 'hi' ? 'दल,' : 'team,'}</span>
        </span>
      </h1>

      {/* Big results back text with individual letter hover/reveal */}
      <div className="big-results-wrap">
        <div className="big-results" id="bigResults">
          {'big results'.split('').map((char, idx) => (
            <span key={idx} className="letter">
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
      </div>

      {/* 8 fanned-out floating portrait cards using public civic images */}
      <div className="cards-row" id="cardsRow">
        {HERO_CARDS.map((card, idx) => (
          <div
            key={card.id}
            ref={(el) => {
              cardRefs.current[idx] = el;
            }}
            className={card.className}
            data-rot={card.rot}
            data-depth={card.depth}
          >
            <img src={card.img} alt={card.alt} loading="eager" />
          </div>
        ))}
      </div>

      {/* CTA Pill button and subline */}
      <div className="subline" id="subline">
        <button
          className="arrow-pill"
          onClick={() => navigate('/complaint/new')}
          title={language === 'hi' ? 'शिकायत दर्ज करें' : 'Report Civic Issue'}
        >
          {language === 'hi' ? 'शिकायत दर्ज करें' : 'Report Civic Issue'}
          <span className="ar">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </span>
        </button>
        <div className="subline-text">
          {language === 'hi'
            ? '8 नगर पालिका वार्ड • 100% सत्यापित समाधान • त्वरित कार्रवाई'
            : '8 municipal wards. 100% verified resolution. Zero delay.'}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
