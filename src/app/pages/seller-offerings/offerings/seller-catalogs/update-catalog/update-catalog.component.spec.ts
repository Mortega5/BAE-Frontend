import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import { Router } from '@angular/router';
import { SellerOfferingsPaths } from '../../../seller-offerings.paths';
import { UpdateCatalogComponent } from './update-catalog.component';

describe('UpdateCatalogComponent', () => {
  let component: UpdateCatalogComponent;
  let fixture: ComponentFixture<UpdateCatalogComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdateCatalogComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(UpdateCatalogComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    component.cat = {
      id: 'cat-1',
      name: 'Current Catalog',
      description: 'Current description',
      lifecycleStatus: 'Active',
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('setCatalogData should include changed name and status', () => {
    component.generalForm.patchValue({ name: 'Updated Catalog', description: 'New desc', lifecycleStatus: 'Launched' });

    component.setCatalogData();

    expect(component.catalogToUpdate?.description).toBe('New desc');
    expect(component.catalogToUpdate?.lifecycleStatus).toBe('Launched');
    expect(component.catalogToUpdate?.name).toBe('Updated Catalog');
  });

  it('goBack should emit seller catalog event', () => {
    spyOn(router, 'navigate');

    component.goBack();

    expect(router.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.catalogues.list()]);
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
