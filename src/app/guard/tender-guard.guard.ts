import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { environment } from '../../environments/environment';

/** Tenders run on top of quotes (same quote-management service), so both flags must be on. */
@Injectable({
  providedIn: 'root'
})
export class tenderGuardGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    if (!environment.QUOTES_ENABLED || !environment.TENDER_ENABLED) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
}
