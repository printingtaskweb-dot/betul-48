import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://www.betulnagar.co.in';
const DEFAULT_DESCRIPTION = 'Report civic issues, track complaint status, and get local updates from Betul Nagar Palika. Use Jila Betul for municipal services and citizen support.';

const pageMetadata: Record<string, { title: string; description: string; index: boolean }> = {
  '/': {
    title: 'Jila Betul | Betul Nagar Palika Civic Services',
    description: DEFAULT_DESCRIPTION,
    index: true,
  },
  '/news': {
    title: 'Betul News | Local News and Community Updates',
    description: 'Read local news, public alerts, and community updates from Betul. Share verified updates with the Jila Betul community.',
    index: true,
  },
  '/department/green': {
    title: 'Green Waste Services | Jila Betul',
    description: 'Find green waste collection and disposal information from Betul Nagar Palika.',
    index: true,
  },
  '/auth': { title: 'Sign In | Jila Betul', description: 'Sign in to access Jila Betul citizen services.', index: false },
  '/forgot-password': { title: 'Reset Password | Jila Betul', description: 'Reset your Jila Betul account password.', index: false },
  '/reset-password': { title: 'Choose a New Password | Jila Betul', description: 'Set a new password for your Jila Betul account.', index: false },
  '/profile': { title: 'Citizen Profile | Jila Betul', description: 'Manage your Jila Betul citizen profile.', index: false },
  '/complaint/new': { title: 'Report a Civic Issue | Jila Betul', description: 'Submit a civic complaint to Betul Nagar Palika.', index: false },
  '/track': { title: 'Track a Complaint | Jila Betul', description: 'Check the status of a civic complaint submitted to Betul Nagar Palika.', index: false },
  '/callback': { title: 'Request a Call Back | Jila Betul', description: 'Request help from Betul Nagar Palika support.', index: false },
  '/dept/login': { title: 'Department Staff Login | Jila Betul', description: 'Department staff portal for Jila Betul.', index: false },
  '/dept/dashboard': { title: 'Department Dashboard | Jila Betul', description: 'Department complaint management portal.', index: false },
  '/admin': { title: 'Administrator Login | Jila Betul', description: 'Jila Betul administrator portal.', index: false },
  '/admin/dashboard': { title: 'Administrator Dashboard | Jila Betul', description: 'Jila Betul municipal administration portal.', index: false },
  '/municipal/dashboard': { title: 'Municipal Dashboard | Jila Betul', description: 'Betul municipal operations dashboard.', index: false },
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = pageMetadata[pathname] ?? {
      title: 'Page Not Found | Jila Betul',
      description: DEFAULT_DESCRIPTION,
      index: false,
    };
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;

    document.title = metadata.title;
    setMeta('name', 'description', metadata.description);
    setMeta('name', 'robots', metadata.index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow');
    setMeta('property', 'og:title', metadata.title);
    setMeta('property', 'og:description', metadata.description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('name', 'twitter:title', metadata.title);
    setMeta('name', 'twitter:description', metadata.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
}
