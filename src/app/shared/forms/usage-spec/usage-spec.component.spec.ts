import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { UsageServiceService } from 'src/app/services/usage-service.service';

import { UsageSpecComponent } from './usage-spec.component';

describe('UsageSpecComponent', () => {
  let component: UsageSpecComponent;
  let fixture: ComponentFixture<UsageSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [UsageSpecComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require at least one metric', () => {
    const metrics = component.usageSpecForm.get('metrics')!;
    expect(metrics.hasError('metricsRequired')).toBeTrue();

    metrics.setValue([{ name: 'cpu' }]);
    expect(metrics.valid).toBeTrue();
  });

  it('should treat a spec without lifecycle status as a draft', () => {
    component.usageSpec = { id: 'u1' };
    expect(component.isDraft).toBeTrue();

    component.usageSpec = { id: 'u1', lifecycleStatus: 'Launched' };
    expect(component.isDraft).toBeFalse();
  });

  it('should load the names of the provider\'s other, non-deleted usage specs', async () => {
    const usageService = TestBed.inject(UsageServiceService);
    spyOn(usageService, 'getAllUsageSpecsOfParty').and.resolveTo([
      { id: 'self', name: 'Mine' },
      { id: 'u2', name: 'Other' },
      { id: 'u3', name: 'Gone', lifecycleStatus: 'Retired' },
    ]);
    component.usageSpec = { id: 'self' };
    component.partyId = 'party-1';

    component.ngOnChanges({ partyId: {} as any });
    await fixture.whenStable();

    expect(component.existingNames).toEqual(['Other']);
  });

  describe('delete', () => {
    let api: ApiServiceService;
    let usageService: UsageServiceService;

    beforeEach(() => {
      api = TestBed.inject(ApiServiceService);
      usageService = TestBed.inject(UsageServiceService);
      component.usageSpec = { id: 'u1', name: 'Metric', lifecycleStatus: 'Active' };
    });

    it('should block deleting a metric used by a live offer', async () => {
      spyOn(api, 'getOfferingsUsingUsageSpec').and.resolveTo([
        { id: 'o1', name: 'Live offer', lifecycleStatus: 'Launched' },
        { id: 'o2', name: 'Old offer', lifecycleStatus: 'Retired' },
      ]);

      component.openDeleteConfirm();
      await fixture.whenStable();

      expect(component.deleteCheck).toBe('blocked');
    });

    it('should allow deleting a metric only used by retired offers', async () => {
      spyOn(api, 'getOfferingsUsingUsageSpec').and.resolveTo([{ id: 'o2', lifecycleStatus: 'Obsolete' }]);

      component.openDeleteConfirm();
      await fixture.whenStable();

      expect(component.deleteCheck).toBe('ok');
    });

    it('should not allow deleting when the check fails', async () => {
      spyOn(api, 'getOfferingsUsingUsageSpec').and.rejectWith(new Error('boom'));

      component.openDeleteConfirm();
      await fixture.whenStable();

      expect(component.deleteCheck).toBe('error');
    });

    it('should mark a draft as Obsolete and a published metric as Retired', () => {
      const updateSpy = spyOn(usageService, 'updateUsageSpec').and.returnValue(of({}));
      spyOn(component, 'goBack');
      component.deleteCheck = 'ok';

      component.onDeleteResolved(true);
      expect(updateSpy).toHaveBeenCalledWith({ lifecycleStatus: 'Obsolete' }, 'u1');

      component.usageSpec = { id: 'u2', lifecycleStatus: 'Launched' };
      component.onDeleteResolved(true);
      expect(updateSpy).toHaveBeenCalledWith({ lifecycleStatus: 'Retired' }, 'u2');
    });

    it('should not delete while the in-use check has not passed', () => {
      const updateSpy = spyOn(usageService, 'updateUsageSpec').and.returnValue(of({}));
      component.deleteCheck = 'blocked';

      component.onDeleteResolved(true);

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  it('should ask whether to publish or save a draft when creating', () => {
    component.formType = 'create';
    component.submitForm();
    expect(component.showPublishDraftModal).toBeTrue();
  });

  it('should create the metric with the status chosen in the publish/draft modal', () => {
    const usageService = TestBed.inject(UsageServiceService);
    const postSpy = spyOn(usageService, 'postUsageSpec').and.returnValue(of({}));
    spyOn(component, 'goBack');
    component.usageSpecForm.patchValue({ metrics: [{ id: 'm1', name: 'cpu' }] });

    component.publish();
    expect(postSpy.calls.mostRecent().args[0].lifecycleStatus).toBe('Launched');

    component.saveDraft();
    expect(postSpy.calls.mostRecent().args[0].lifecycleStatus).toBe('Active');
  });

  it('should publish a draft and keep the page open', () => {
    const usageService = TestBed.inject(UsageServiceService);
    const updateSpy = spyOn(usageService, 'updateUsageSpec').and.returnValue(of({}));
    const backSpy = spyOn(component, 'goBack');
    component.usageSpec = { id: 'u1', lifecycleStatus: 'Active' };

    component.onPublishResolved(true);

    expect(updateSpy).toHaveBeenCalledWith({ lifecycleStatus: 'Launched' }, 'u1');
    expect(component.usageSpec.lifecycleStatus).toBe('Launched');
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('should keep the status when publishing fails', () => {
    const usageService = TestBed.inject(UsageServiceService);
    spyOn(usageService, 'updateUsageSpec').and.returnValue(throwError(() => ({ error: { error: 'nope' } })));
    component.usageSpec = { id: 'u1', lifecycleStatus: 'Active' };

    component.onPublishResolved(true);

    expect(component.usageSpec.lifecycleStatus).toBe('Active');
    expect(component.actionLoading).toBeFalse();
  });
});
