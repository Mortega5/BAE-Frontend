import { IconDefinition, IconName } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowsUpDownLeftRight,
  faBolt,
  faBrain,
  faBuilding,
  faBuildingShield,
  faBuildingUser,
  faCertificate,
  faChartColumn,
  faChartLine,
  faChartPie,
  faClipboardList,
  faClock,
  faCloud,
  faCode,
  faComments,
  faDatabase,
  faEye,
  faFileLines,
  faGaugeHigh,
  faGears,
  faGlobe,
  faGraduationCap,
  faHandshake,
  faHardDrive,
  faHeadset,
  faLaptopCode,
  faLightbulb,
  faLock,
  faMagnifyingGlass,
  faMobileScreen,
  faPlugCirclePlus,
  faScaleBalanced,
  faScrewdriverWrench,
  faServer,
  faShareNodes,
  faShield,
  faShuffle,
  faSliders,
  faStar,
  faUsers,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { faAnglesLeft, faAnglesRight, faArrowDown, faArrowRight, faBars, faCartShopping, faCheck, faChevronDown, faChevronLeft, faChevronRight, faEdit, faLayerGroup, faPlus, faSave, faTrash, faXmark } from '@fortawesome/pro-solid-svg-icons';

export interface PopularIcon {
  name: string;
  icon: IconDefinition;
}

export interface IconCategory {
  labelKey: string;
  icons: PopularIcon[];
}

export const POPULAR_ICON_CATEGORIES: IconCategory[] = [
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_business',
    icons: [
      { name: 'building', icon: faBuilding },
      { name: 'users', icon: faUsers },
      { name: 'building-user', icon: faBuildingUser },
      { name: 'sitemap', icon: faShareNodes },
      { name: 'clipboard-list', icon: faClipboardList },
      { name: 'gears', icon: faGears },
      { name: 'arrows-move', icon: faArrowsUpDownLeftRight },
      { name: 'clock', icon: faClock },
      { name: 'globe', icon: faGlobe },
      { name: 'sliders', icon: faSliders },
      { name: 'plug-circle-plus', icon: faPlugCirclePlus },
    ],
  },
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_data',
    icons: [
      { name: 'brain', icon: faBrain },
      { name: 'chart-line', icon: faChartLine },
      { name: 'database', icon: faDatabase },
      { name: 'chart-pie', icon: faChartPie },
      { name: 'search', icon: faMagnifyingGlass },
      { name: 'lightbulb', icon: faLightbulb },
      { name: 'gauge', icon: faGaugeHigh },
      { name: 'eye', icon: faEye },
      { name: 'shuffle', icon: faShuffle },
      { name: 'chart-bar', icon: faChartColumn },
    ],
  },
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_security',
    icons: [
      { name: 'shield', icon: faShield },
      { name: 'building-shield', icon: faBuildingShield },
      { name: 'user-shield', icon: faUserShield },
      { name: 'certificate', icon: faCertificate },
      { name: 'balance', icon: faScaleBalanced },
      { name: 'lock', icon: faLock },
      { name: 'hard-drive', icon: faHardDrive },
    ],
  },
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_tech',
    icons: [
      { name: 'cloud', icon: faCloud },
      { name: 'code', icon: faCode },
      { name: 'laptop-code', icon: faLaptopCode },
      { name: 'server', icon: faServer },
      { name: 'mobile', icon: faMobileScreen },
      { name: 'tools', icon: faScrewdriverWrench },
    ],
  },
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_customer',
    icons: [
      { name: 'headset', icon: faHeadset },
      { name: 'comments', icon: faComments },
      { name: 'file', icon: faFileLines },
      { name: 'graduation-cap', icon: faGraduationCap },
      { name: 'bolt', icon: faBolt },
      { name: 'star', icon: faStar },
      { name: 'handshake', icon: faHandshake },
    ],
  },
];

export const POPULAR_ICONS: PopularIcon[] = POPULAR_ICON_CATEGORIES.flatMap(c => c.icons);

export function findIconByName(name: string | undefined | null): IconDefinition | null {
  if (!name) return null;
  const found = POPULAR_ICONS.find(i => i.name === name);
  return found ? found.icon : null;
}

/** Icons already bundled somewhere in the app (business icons above plus a
 * few UI/chrome icons), keyed by their real FontAwesome name so any consumer
 * can reference them by IconName without importing the definition itself. */
const BUTTON_ICONS: Partial<Record<IconName, IconDefinition>> = {
  [faXmark.iconName]: faXmark,
  [faPlus.iconName]: faPlus,
  [faTrash.iconName]: faTrash,
  [faEdit.iconName]: faEdit,
  [faLayerGroup.iconName]: faLayerGroup,
  [faBars.iconName]: faBars,
  [faArrowDown.iconName]: faArrowDown,
  [faSave.iconName]: faSave,
  [faArrowRight.iconName]: faArrowRight,
  [faCartShopping.iconName]: faCartShopping,
  [faCheck.iconName]: faCheck,
  [faChevronDown.iconName]: faChevronDown,
  [faChevronLeft.iconName]: faChevronLeft,
  [faChevronRight.iconName]: faChevronRight,
  [faAnglesLeft.iconName]: faAnglesLeft,
  [faAnglesRight.iconName]: faAnglesRight,
  ...Object.fromEntries(POPULAR_ICONS.map(({ icon }) => [icon.iconName, icon])),
};

export function findButtonIcon(name: IconName | string): IconDefinition | undefined {
  return name ? BUTTON_ICONS[name as IconName] : undefined;
}
