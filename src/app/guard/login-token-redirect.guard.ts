import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * The proxy still ends the login by redirecting to `/dashboard?token=...`, and the
 * landing page ('/') is the one that exchanges that token for a session. Without this,
 * the workspace route would see no session yet and drop the token. Forward it, query included.
 */
export const loginTokenRedirectGuard: CanActivateFn = (route) => {
  if (route.queryParamMap.has('token')) {
    return inject(Router).createUrlTree(['/'], { queryParams: route.queryParams });
  }
  return true;
};
