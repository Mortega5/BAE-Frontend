import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { SellerCatalogsComponent } from './seller-catalogs.component';

describe('SellerCatalogsComponent', () => {
  let component: SellerCatalogsComponent;
  let fixture: ComponentFixture<SellerCatalogsComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerCatalogsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SellerCatalogsComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create catalog event', () => {
    spyOn(eventMessage, 'emitSellerCreateCatalog');

    component.goToCreate();

    expect(eventMessage.emitSellerCreateCatalog).toHaveBeenCalledWith(true);
  });

  it('goToUpdate should emit seller update catalog event', () => {
    const cat = { id: 'cat-1' };
    spyOn(eventMessage, 'emitSellerUpdateCatalog');

    component.goToUpdate(cat);

    expect(eventMessage.emitSellerUpdateCatalog).toHaveBeenCalledWith(cat);
  });

  it('onStateFilterChange should remove existing filter and reload catalogs', () => {
    component.status = ['Active', 'Launched'];
    const refreshSpy = jasmine.createSpy('refresh');
    component.paginatedTable = { refresh: refreshSpy } as any;

    component.onStateFilterChange('Active');

    expect(component.status).toEqual(['Launched']);
    expect(refreshSpy).toHaveBeenCalledWith(true);
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short words', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
