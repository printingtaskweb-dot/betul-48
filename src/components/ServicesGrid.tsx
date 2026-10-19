import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';

type Service = {
  slug: string;
  icon?: string;
  image?: string;
  gradient: string;
  shadow: string;
  route: string;
  svgIcon?: React.ReactNode;
};

const SERVICES: Service[] = [
  {
    slug: 'Green City',
    image: '/green-city-icon-logo-free-vector.jpg',
    gradient: 'linear-gradient(135deg, #166534, #16a34a)',
    shadow: 'rgba(22,163,74,0.3)',
    route: '/department/green',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9z"/>
        <path d="M5.5 12.5C8 15 10 18 12 22c2-4 4-7 6.5-9.5"/>
        <path d="M12 2v10"/>
        <path d="M12 2c-3 0-6 2-6 5s3 5 6 5 6-2 6-5-3-5-6-5z"/>
      </svg>
    ),
  },
  {
    slug: 'water',
    image: '/rain-droplet-into-rings_78370-3843.avif',
    gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
    shadow: 'rgba(37,99,235,0.3)',
    route: '/complaint/new?dept=water',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    ),
  },
  {
    slug: 'rainwater',
    image: '/rainwater-harvesting-vector-icon-sustainable-260nw-2506520391.webp',
    icon: '🌧️',
    gradient: 'linear-gradient(135deg, #4338ca, #6366f1)',
    shadow: 'rgba(99,102,241,0.3)',
    route: '/complaint/new?dept=rainwater',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        <path d="M8 14a4 4 0 0 0 8 0"/>
      </svg>
    ),
  },
  {
    slug: 'cnd',
    image: '/C&D.png',
    gradient: 'linear-gradient(135deg, #92400e, #b45309)',
    shadow: 'rgba(180,83,9,0.3)',
    route: '/complaint/new?dept=cnd',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    slug: 'clean',
    image: '/cleaning.png',
    gradient: 'linear-gradient(135deg, #065f46, #059669)',
    shadow: 'rgba(5,150,105,0.3)',
    route: '/complaint/new?dept=clean',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    slug: 'roads',
    image: '/road.png',
    gradient: 'linear-gradient(135deg, #991b1b, #dc2626)',
    shadow: 'rgba(220,38,38,0.3)',
    route: '/complaint/new?dept=roads',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19l4-14h8l4 14"/>
        <path d="M2 19h20"/>
        <path d="M12 5v14"/>
      </svg>
    ),
  },
  {
    slug: 'streetlight',
    image: '/street_light.png',
    gradient: 'linear-gradient(135deg, #78350f, #d97706)',
    shadow: 'rgba(217,119,6,0.3)',
    route: '/complaint/new?dept=streetlight',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21h6"/>
        <path d="M12 17v4"/>
        <path d="M12 3a6 6 0 0 0-6 6c0 2 1 3.5 2 4.5h8c1-1 2-2.5 2-4.5a6 6 0 0 0-6-6z"/>
      </svg>
    ),
  },
  {
    slug: 'sewage',
    image: '/sewage.png',
    gradient: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
    shadow: 'rgba(124,58,237,0.3)',
    route: '/complaint/new?dept=sewage',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18"/>
        <path d="M5 12V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/>
        <path d="M7 12v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6"/>
      </svg>
    ),
  },
  // ── 4 new categories ──────────────────────────────────────────────────────
  {
    slug: 'parks',
    icon: '🌳',
    gradient: 'linear-gradient(135deg, #15803d, #0d9488)',
    shadow: 'rgba(13,148,136,0.3)',
    route: '/complaint/new?dept=parks',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12m0 0c-3.5-2-6-5-6-8a6 6 0 0 1 12 0c0 3-2.5 6-6 8z"/>
      </svg>
    ),
  },
  {
    slug: 'electricity',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #ca8a04, #d97706)',
    shadow: 'rgba(217,119,6,0.35)',
    route: '/complaint/new?dept=electricity',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    slug: 'solid-waste',
    icon: '🗑️',
    gradient: 'linear-gradient(135deg, #475569, #64748b)',
    shadow: 'rgba(100,116,139,0.3)',
    route: '/complaint/new?dept=solid-waste',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
      </svg>
    ),
  },
  {
    slug: 'noise',
    icon: '🔊',
    gradient: 'linear-gradient(135deg, #ea580c, #dc2626)',
    shadow: 'rgba(234,88,12,0.3)',
    route: '/complaint/new?dept=noise',
    svgIcon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    ),
  },
];

// ── Inline responsive grid styles injected once ───────────────────────────────
const GRID_STYLE_ID = 'services-grid-responsive-style';

function ensureGridStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(GRID_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = GRID_STYLE_ID;
  style.textContent = `
    .services-grid-responsive {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    @media (min-width: 640px) {
      .services-grid-responsive {
        grid-template-columns: repeat(6, 1fr);
      }
    }
    @media (min-width: 900px) {
      .services-grid-responsive {
        grid-template-columns: repeat(5, 1fr);
      }
    }
    .service-item-hoverable {
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      will-change: transform, box-shadow;
    }
    @media (hover: hover) {
      .service-item-hoverable:hover {
        transform: scale(1.06) translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        z-index: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

export const ServicesGrid: React.FC = () => {
  const { language } = useAuth();

  // Inject grid + hover styles once on first render
  React.useEffect(() => {
    ensureGridStyles();
  }, []);

  return (
    <div style={{ padding: '0 20px', marginTop: 8 }}>
      <div className="section-header" style={{ padding: 0 }}>
        <div className="left">
          <h3>
            {t(language, 'ourServices')}
          </h3>
          <p>
            {language === 'hi' ? 'सभी नगर निगम विभाग' : 'All Municipal Departments'}
          </p>
        </div>
        <Link
          to="/complaint/new"
          className="right"
        >
          {t(language, 'viewAll')} →
        </Link>
      </div>

      <div className="services-grid services-grid-responsive">
        {SERVICES.map((svc) => {
          const label = t(language, svc.slug as any) || svc.slug;

          return (
            <Link
              key={svc.slug}
              to={svc.route}
              className="service-item service-item-hoverable"
            >
              {/* SVG icon in white card */}
              <div className="service-icon">
                {svc.svgIcon}
              </div>

              {/* Label always below */}
              <span>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
