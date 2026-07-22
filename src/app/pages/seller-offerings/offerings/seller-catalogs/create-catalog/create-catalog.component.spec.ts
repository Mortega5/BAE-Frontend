import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';

import { Router } from '@angular/router';
import { SellerOfferingsPaths } from '../../../seller-offerings.paths';
import { CreateCatalogComponent } from './create-catalog.component';

describe('CreateCatalogComponent', () => {
  let component: CreateCatalogComponent;
  let fixture: ComponentFixture<CreateCatalogComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CreateCatalogComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CreateCatalogComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onClick should hide emoji picker when open', () => {
    component.showEmoji = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showEmoji).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('setCatalogData should build catalog payload from form values', () => {
    component.partyId = 'party-1';
    component.generalForm.patchValue({
      name: 'My Catalog',
      description: 'Catalog description',
    });

    component.setCatalogData();

    expect(component.catalogToCreate?.name).toBe('My Catalog');
    expect(component.catalogToCreate?.description).toBe('Catalog description');
    expect(component.catalogToCreate?.lifecycleStatus).toBe('Active');
    expect(component.catalogToCreate?.relatedParty?.[0]?.id).toBe('party-1');
    expect(component.catalogToCreate?.relatedParty?.[0]?.role).toBe(environment.SELLER_ROLE);
  });

  it('goBack should emit seller catalog event', () => {
    spyOn(router, 'navigate');

    component.goBack();

    expect(router.navigate).toHaveBeenCalledWith(SellerOfferingsPaths.catalogues.list());
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
