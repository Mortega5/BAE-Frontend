import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import { Router } from '@angular/router';
import { SellerOfferingsPaths } from '../../seller-offerings.paths';
import { SellerProductSpecComponent } from './seller-product-spec.component';

describe('SellerProductSpecComponent', () => {
  let component: SellerProductSpecComponent;
  let fixture: ComponentFixture<SellerProductSpecComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [SellerProductSpecComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SellerProductSpecComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create product spec event', () => {
    spyOn(router, 'navigate');

    component.goToCreate();

    expect(router.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.softwares.new()]);
  });

  it('goToUpdate should emit seller update product spec event', () => {
    const prod = { id: 'prod-1' };
    spyOn(router, 'navigate');

    component.goToUpdate(prod.id);

    expect(router.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.softwares.edit(prod.id)]);
  });

  it('onTypeChange should map bundle filters and reload product specs', () => {
    const refreshSpy = jasmine.createSpy('refresh');
    component.paginatedTable = { refresh: refreshSpy } as any;

    component.onTypeChange({ target: { value: 'simple' } });
    expect(component.isBundle).toBeFalse();
    expect(refreshSpy).toHaveBeenCalledWith(true);

    component.onTypeChange({ target: { value: 'bundle' } });
    expect(component.isBundle).toBeTrue();

    component.onTypeChange({ target: { value: 'all' } });
    expect(component.isBundle).toBeUndefined();
  });
});
