import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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
  onActionClick = jasmine.createSpy('onActionClick');
  sections: SideNavSection[] = [
    { items: [{ label: 'NS._offers', routerLink: '/offers' }, { label: 'NS._action', onClick: () => this.onActionClick() }] },
    { label: 'NS._specs', items: [{ label: 'NS._products', routerLink: '/products' }] },
  ];
}

describe('SideNavComponent', () => {
  let hostFixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, RouterTestingModule.withRoutes([{ path: 'closed', children: [] }]), TranslateModule.forRoot()],
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

  it('should also render the mobile drawer with the same items, icons/active-state included', () => {
    const mobileLinks: NodeListOf<HTMLAnchorElement> = hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavMobileDrawer"] a');
    expect(mobileLinks.length).toBe(2);
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

  it('should render an onClick item as a plain button and invoke its callback', () => {
    const desktopButton = Array.from(hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavDesktop"] button'))
      .find((el: any) => el.textContent.includes('NS._action')) as HTMLButtonElement;

    expect(desktopButton).toBeTruthy();
    expect(desktopButton.querySelector('fa-icon')).toBeTruthy();
    desktopButton.click();

    expect(hostFixture.componentInstance.onActionClick).toHaveBeenCalledTimes(1);
  });

  it('should not render the external-link icon for a plain routerLink item', () => {
    const routerLinkItem = Array.from(hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavDesktop"] a'))
      .find((el: any) => el.textContent.includes('NS._offers')) as HTMLAnchorElement;

    expect(routerLinkItem.querySelector('fa-icon')).toBeNull();
  });

  it('should close the mobile drawer when an onClick item inside it is clicked', () => {
    mobileMenuButton().click();
    hostFixture.detectChanges();

    const mobileButton = Array.from(hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavMobileDrawer"] button'))
      .find((el: any) => el.textContent.includes('NS._action')) as HTMLButtonElement;
    mobileButton.click();
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance.onActionClick).toHaveBeenCalledTimes(1);
    expect(drawer().classList).toContain('-translate-x-full');
  });

  describe('collapsible sections', () => {
    // A collapsed section stays in the DOM (so it can animate) but is inert
    const hrefs = () => Array.from(desktopLinks()).filter(a => !a.closest('[inert]')).map(a => a.getAttribute('href'));
    const header = (text: string) => Array.from(hostFixture.nativeElement.querySelectorAll('[data-cy="sideNavDesktop"] button'))
      .find((b: any) => b.textContent.includes(text)) as HTMLButtonElement;

    beforeEach(() => {
      hostFixture.componentInstance.sections = [
        ...hostFixture.componentInstance.sections,
        { label: 'NS._open', collapsible: true, items: [{ label: 'NS._open_item', routerLink: '/open' }] },
        { label: 'NS._closed', collapsible: true, defaultCollapsed: true, items: [{ label: 'NS._closed_item', routerLink: '/closed' }] },
      ];
      hostFixture.detectChanges();
    });

    it('starts expanded unless defaultCollapsed is set', () => {
      expect(hrefs()).toContain('/open');
      expect(hrefs()).not.toContain('/closed');
    });

    it('opens a section that starts collapsed while the current page is one of its items', async () => {
      await TestBed.inject(Router).navigateByUrl('/closed');
      hostFixture.detectChanges();
      expect(hrefs()).toContain('/closed');
    });

    it('toggles the items when the label is clicked', () => {
      header('NS._closed').click();
      hostFixture.detectChanges();
      expect(hrefs()).toContain('/closed');
      expect(header('NS._closed').getAttribute('aria-expanded')).toBe('true');

      header('NS._open').click();
      hostFixture.detectChanges();
      expect(hrefs()).not.toContain('/open');
    });

    it('keeps a plain labelled section as a non-interactive label that always shows its items', () => {
      expect(header('NS._specs')).toBeUndefined();
      expect(hrefs()).toContain('/products');
    });
  });
});
