import { NavHeaderLink, NavLink, ThemeConfig } from './theme.interfaces';

// Define navigation links for the theme
const oceiHeaderLinks: NavLink[] = [
  {
    label: 'HEADER._home', // Translation key
    url: '/dashboard',
    isRouterLink: true
  },
  {
    label: 'HEADER._browse',
    id: 'searchDropdown', // ID para el toggle de Flowbite
    children: [
      { label: 'HEADER._services', url: '/search', isRouterLink: true },
      { label: 'HEADER._catalogs', url: '/catalogues', isRouterLink: true },
      { label: 'HEADER._blueprints', url: '/search/urn:ngsi-ld:product-offering:bd1bb611-0b9e-4e79-ba25-abf1240039e1', isRouterLink: true }
    ]
  }
];

const oceiFooterLinks: NavHeaderLink[] = [

];

// Export the main theme configuration object
export const OCEI_THEME_CONFIG: ThemeConfig = {
  name: 'Ocei', // This MUST match the name used in the SCSS class (theme-galaxy)
  displayName: 'OCEI Marketplace',
  isDefault: true,
  assets: {
    logoUrl: 'assets/themes/ocei/ocei-logo.png',
    jumboBgUrl: 'assets/themes/ocei/jumboBackground.png',
    cardDefaultBgUrl: 'assets/themes/ocei/cardBackground.png'
  },
  links: {
    headerLinks: oceiHeaderLinks,
    footerLinks: oceiFooterLinks,

    linkedin: 'https://www.linkedin.com/company/o-cei-horizon',
    youtube: 'https://www.youtube.com/@o-cei'
  },
  dashboard: {
    showFeaturedOfferings: true,
    showPlatformBenefits: false,
  }
};
