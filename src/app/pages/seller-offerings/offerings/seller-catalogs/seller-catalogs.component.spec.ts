import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import { Router } from '@angular/router';
import { SellerOfferingsPaths } from '../../seller-offerings.paths';
import { SellerCatalogsComponent } from './seller-catalogs.component';

describe('SellerCatalogsComponent', () => {
  let component: SellerCatalogsComponent;
  let fixture: ComponentFixture<SellerCatalogsComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerCatalogsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SellerCatalogsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create catalog event', () => {
    spyOn(router, 'navigate');

    component.goToCreate();

    expect(router.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.catalogues.new()]);
  });

  it('goToUpdate should emit seller update catalog event', () => {
    const cat = { id: 'cat-1' };
    spyOn(router, 'navigate');

    component.goToUpdate(cat.id);

    expect(router.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.catalogues.edit(cat.id)]);
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short words', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
