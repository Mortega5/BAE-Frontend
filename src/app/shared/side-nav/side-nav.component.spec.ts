import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import { SideNavComponent } from './side-nav.component';
import { SideNavSection } from './side-nav.model';

@Component({
  standalone: true,
  imports: [SideNavComponent],
  template: `<app-side-nav [sections]="sections" [title]="title" [showDesktopSidebar]="showDesktopSidebar"><div>Body content</div><div sideNavFooter>Help card</div></app-side-nav>`,
})
class HostComponent {
  title = 'NS._title';
  showDesktopSidebar = true;
  sections: SideNavSection[] = [
    { items: [{ label: 'NS._offers', routerLink: '/offers', count: 3 }] },
    { label: 'NS._specs', items: [{ label: 'NS._products', routerLink: '/products' }] },
  ];
}

describe('SideNavComponent', () => {
  let hostFixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, RouterTestingModule, TranslateModule.forRoot()],
    }).compileComponents();

    hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();
  });

  const desktopLinks = (): NodeListOf<HTMLAnchorElement> =>
    hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavDesktop"] a');

  it('should create', () => {
    expect(hostFixture.componentInstance).toBeTruthy();
  });

  it('should render one desktop link per item across all sections', () => {
    expect(desktopLinks().length).toBe(2);
  });

  it('should render the count badge only for items that set one', () => {
    const links = desktopLinks();
    expect(links[0].textContent).toContain('3');
    expect(links[1].textContent?.trim()).not.toMatch(/\d/);
  });

  it('should render the section label divider only for sections that set one', () => {
    const dividers: NodeListOf<HTMLElement> = hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavDesktop"] p.uppercase');
    expect(dividers.length).toBe(1);
    expect(dividers[0].textContent).toContain('NS._specs');
  });

  it('should project the footer content into the desktop sidebar', () => {
    const sidebar: HTMLElement = hostFixture.nativeElement.querySelector('[data-cy="sideNavDesktop"]');
    expect(sidebar.textContent).toContain('Help card');
  });

  it('should project the default-slot content (e.g. the router-outlet) outside the sidebar, not the footer', () => {
    const sidebar: HTMLElement = hostFixture.nativeElement.querySelector('[data-cy="sideNavDesktop"]');
    expect(sidebar.textContent).not.toContain('Body content');
    expect(hostFixture.nativeElement.textContent).toContain('Body content');
  });

  it('should also render the mobile drawer with the same items, icons/counts/active-state included', () => {
    const mobileLinks: NodeListOf<HTMLAnchorElement> = hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavMobileDrawer"] a');
    expect(mobileLinks.length).toBe(2);
    expect(mobileLinks[0].textContent).toContain('3');
  });

  it('should hide the desktop sidebar (list and footer) when showDesktopSidebar is false, but keep the mobile drawer', () => {
    hostFixture.componentInstance.showDesktopSidebar = false;
    hostFixture.detectChanges();

    expect(hostFixture.nativeElement.querySelector('[data-cy="sideNavDesktop"]')).toBeNull();
    expect(hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavMobileDrawer"] a').length).toBe(2);
  });

  const mobileMenuButton = (): HTMLButtonElement => hostFixture.nativeElement.querySelector('button[aria-label]');
  const drawer = (): HTMLElement => hostFixture.nativeElement.querySelector('[data-cy="sideNavMobileDrawer"]');
  const backdrop = (): HTMLElement => drawer().previousElementSibling as HTMLElement;

  it('should open the mobile drawer when the hamburger button is clicked', () => {
    expect(drawer().classList).toContain('-translate-x-full');

    mobileMenuButton().click();
    hostFixture.detectChanges();

    expect(drawer().classList).toContain('translate-x-0');
    expect(drawer().getAttribute('inert')).toBeNull();
  });

  it('should close the mobile drawer when the backdrop is clicked', () => {
    mobileMenuButton().click();
    hostFixture.detectChanges();

    backdrop().click();
    hostFixture.detectChanges();

    expect(drawer().classList).toContain('-translate-x-full');
  });

  it('should close the mobile drawer when a nav link inside it is clicked', () => {
    mobileMenuButton().click();
    hostFixture.detectChanges();

    hostFixture.nativeElement.querySelector('[data-cy="sideNavMobileDrawer"] a').click();
    hostFixture.detectChanges();

    expect(drawer().classList).toContain('-translate-x-full');
  });

  it('should close the mobile drawer on Escape', () => {
    mobileMenuButton().click();
    hostFixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    hostFixture.detectChanges();

    expect(drawer().classList).toContain('-translate-x-full');
  });
});
