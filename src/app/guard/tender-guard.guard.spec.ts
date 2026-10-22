import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

import { tenderGuardGuard } from './tender-guard.guard';

describe('tenderGuardGuard', () => {
  let guard: tenderGuardGuard;
  let routerSpy: jasmine.SpyObj<Router>;
  let originalQuotesEnabled: boolean;
  let originalTenderEnabled: boolean;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    originalQuotesEnabled = environment.QUOTES_ENABLED;
    originalTenderEnabled = environment.TENDER_ENABLED;

    TestBed.configureTestingModule({
      providers: [tenderGuardGuard, { provide: Router, useValue: routerSpy }],
    });

    guard = TestBed.inject(tenderGuardGuard);
  });

  afterEach(() => {
    environment.QUOTES_ENABLED = originalQuotesEnabled;
    environment.TENDER_ENABLED = originalTenderEnabled;
  });

  it('lets through when both quotes and tenders are enabled', () => {
    environment.QUOTES_ENABLED = true;
    environment.TENDER_ENABLED = true;

    expect(guard.canActivate()).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('redirects to the dashboard when tenders are disabled', () => {
    environment.QUOTES_ENABLED = true;
    environment.TENDER_ENABLED = false;

    expect(guard.canActivate()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('redirects to the dashboard when quotes are disabled, even with tenders on', () => {
    environment.QUOTES_ENABLED = false;
    environment.TENDER_ENABLED = true;

    expect(guard.canActivate()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
