import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from 'src/app/services/event-message.service';

import { SellerResourceSpecComponent } from './seller-resource-spec.component';

describe('SellerResourceSpecComponent', () => {
  let component: SellerResourceSpecComponent;
  let fixture: ComponentFixture<SellerResourceSpecComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerResourceSpecComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SellerResourceSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create resource spec event', () => {
    spyOn(eventMessage, 'emitSellerCreateResourceSpec');

    component.goToCreate();

    expect(eventMessage.emitSellerCreateResourceSpec).toHaveBeenCalledWith(true);
  });

  it('goToUpdate should emit seller update resource spec event', () => {
    const res = { id: 'res-1' };
    spyOn(eventMessage, 'emitSellerUpdateResourceSpec');

    component.goToUpdate(res);

    expect(eventMessage.emitSellerUpdateResourceSpec).toHaveBeenCalledWith(res);
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short text', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
