import { AuthGuard } from 'src/app/guard/auth.guard';
import { AdminPaths } from './admin.paths';

/**
 * Roles (AuthGuard route-data keys) allowed into each admin section. Both
 * admin.routes.ts (per-route guard) and AdminComponent (side-nav filtering)
 * read from here, so a section is never listed for a role its route rejects.
 *
 * Mirrors the backend checks: every admin endpoint requires the platform
 * admin role except certificate upload, which certifiers can also use.
 */
export const AdminAccess = {
  categories: ['admin'],
  defaultCatalog: ['admin'],
  verification: ['admin', 'certifier'],
  revenue: ['admin'],
  email: ['admin'],
  analytics: ['admin'],
  searchFilters: ['admin'],
  features: ['admin'],
} as const satisfies Record<string, readonly string[]>;

export type AdminSection = keyof typeof AdminAccess;

/**
 * Sections only usable from the personal session: their backends reject requests
 * made on behalf of an organization (email's notify config in charging, and
 * analytics config behind the proxy's checkOrganizations).
 */
const PERSONAL_SESSION_ONLY: readonly AdminSection[] = ['email', 'analytics'];

/** Order the /admin landing redirect tries sections in; categories stays the admin default. */
export const ADMIN_SECTION_ORDER: AdminSection[] = [
  'categories',
  'defaultCatalog',
  'verification',
  'revenue',
  'email',
  'analytics',
  'searchFilters',
  'features',
];

export function adminSectionUrl(section: AdminSection): string {
  return section === 'categories' ? AdminPaths.categories.list() : AdminPaths[section]();
}

export function canOpenAdminSection(auth: AuthGuard, section: AdminSection): boolean {
  return auth.hasAnyRole(AdminAccess[section])
    && (!PERSONAL_SESSION_ONLY.includes(section) || auth.hasAnyRole(['individual']));
}
