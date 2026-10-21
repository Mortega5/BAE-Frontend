import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { NotificationService } from 'src/app/services/notification.service';

import { CreateCategoryComponent } from './create-category.component';

describe('CreateCategoryComponent', () => {
  let component: CreateCategoryComponent;
  let fixture: ComponentFixture<CreateCategoryComponent>;
  let api: ApiServiceService;
  let notifications: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [CreateCategoryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateCategoryComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(ApiServiceService);
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should offer a publish-or-draft choice when submitting', () => {
    component.createCategory();

    expect(component.showPublishDraftModal).toBeTrue();
  });

  it('should create the category as a draft when saving without publishing', () => {
    component.categoryToCreate = { name: 'Category', lifecycleStatus: 'Active' } as any;
    spyOn(api, 'postCategory').and.returnValue(of({}));
    spyOn(notifications, 'showSuccess');
    spyOn(component, 'goBack');

    component.saveDraft();

    expect(api.postCategory).toHaveBeenCalledWith(jasmine.objectContaining({ lifecycleStatus: 'Active' }));
  });

  it('should create the category as launched when publishing', () => {
    component.categoryToCreate = { name: 'Category', lifecycleStatus: 'Active' } as any;
    spyOn(api, 'postCategory').and.returnValue(of({}));
    spyOn(notifications, 'showSuccess');
    spyOn(component, 'goBack');

    component.publish();

    expect(api.postCategory).toHaveBeenCalledWith(jasmine.objectContaining({ lifecycleStatus: 'Launched' }));
  });
});
