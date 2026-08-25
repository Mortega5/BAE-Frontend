import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [HeaderComponent]
    });
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the usage specs link in the navigation for a logged-in seller', () => {
    component.is_logged = true;
    component.roles = [component.sellerRole];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#usageSpecs')).not.toBeNull();
  });

  it('toggleCartDrawer should flip the cart visibility', () => {
    expect(component.showCart).toBeFalse();

    component.toggleCartDrawer();
    expect(component.showCart).toBeTrue();

    component.toggleCartDrawer();
    expect(component.showCart).toBeFalse();
  });

  it('onScroll should track whether the page has been scrolled', () => {
    const scrollYSpy = spyOnProperty(window, 'scrollY', 'get').and.returnValue(50);
    component.onScroll();
    expect(component.scrolled).toBeTrue();

    scrollYSpy.and.returnValue(0);
    component.onScroll();
    expect(component.scrolled).toBeFalse();
  });

  it('switchLanguage should update the translation service and persist the choice', () => {
    const translate = (component as any).translate;
    const localStorage = (component as any).localStorage;
    spyOn(translate, 'use');
    spyOn(localStorage, 'setItem');

    component.switchLanguage('es');

    expect(translate.use).toHaveBeenCalledWith('es');
    expect(localStorage.setItem).toHaveBeenCalledWith('current_language', 'es');
    expect(component.defaultLang).toBe('es');
  });

  it('goTo should navigate to the requested path', () => {
    const navigateSpy = spyOn(router, 'navigate');

    component.goTo('/browse');

    expect(navigateSpy).toHaveBeenCalledWith(['/browse']);
  });
});
