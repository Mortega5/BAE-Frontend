import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { DrawerComponent } from './drawer.component';

@Component({
  standalone: true,
  imports: [DrawerComponent],
  template: `<div id="track" style="transform: translateX(0)"><app-drawer [isOpen]="open" (closed)="closes = closes + 1"><p id="content">hello</p></app-drawer></div>`,
})
class HostComponent {
  open = false;
  closes = 0;
}

describe('DrawerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const panel = () => document.querySelector('.app-drawer-panel') as HTMLElement | null;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function setOpen(open: boolean) {
    fixture.componentInstance.open = open;
    fixture.detectChanges();
  }

  it('renders nothing while closed', () => {
    expect(panel()).toBeNull();
    expect(fixture.nativeElement.querySelector('#content')).toBeNull();
  });

  it('mounts the panel in the overlay container, outside the declaring element, and slides it in', fakeAsync(() => {
    setOpen(true);
    expect(panel()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.app-drawer-panel')).toBeNull();
    expect(panel()!.closest('.cdk-overlay-container')).not.toBeNull();
    expect(panel()!.textContent).toContain('hello');

    tick(50);
    fixture.detectChanges();
    expect(panel()!.classList).toContain('translate-x-0');
    flush();
  }));

  it('slides out and removes the panel after the transition', fakeAsync(() => {
    setOpen(true);
    tick(50);
    setOpen(false);
    fixture.detectChanges();
    expect(panel()!.classList).toContain('translate-x-full');

    tick(300);
    expect(panel()).toBeNull();
  }));

  it('asks to close on backdrop click and on Escape', fakeAsync(() => {
    setOpen(true);
    tick(50);
    (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
    expect(fixture.componentInstance.closes).toBe(1);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.closes).toBe(2);
    flush();
  }));

  it('removes the overlay when destroyed while open', fakeAsync(() => {
    setOpen(true);
    fixture.destroy();
    expect(panel()).toBeNull();
    flush();
  }));
});
