import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalComponent } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <div style="transform: translateX(0)">
      <app-modal [visible]="visible" [closeOnEscape]="closeOnEscape" (closed)="closes = closes + 1">
        <div appCardHeader class="my-header">HEADER</div>
        <p class="my-body">BODY</p>
        <div appCardFooter class="my-footer">FOOTER</div>
      </app-modal>
    </div>
  `,
})
class HostComponent {
  visible = false;
  closeOnEscape = true;
  closes = 0;
}

describe('ModalComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const root = () => document.querySelector('.cdk-overlay-container') as HTMLElement;
  const card = () => document.querySelector('.cdk-overlay-container app-card');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function setVisible(visible: boolean) {
    host.visible = visible;
    fixture.detectChanges();
  }

  it('should render nothing when not visible', () => {
    expect(card()).toBeNull();
  });

  it('should render the card in the overlay container, outside the declaring element, when visible', () => {
    setVisible(true);

    expect(card()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-card')).toBeNull();
  });

  it('should centre the card horizontally in the viewport', () => {
    setVisible(true);

    const rect = (card() as HTMLElement).getBoundingClientRect();
    expect(Math.abs(rect.left - (window.innerWidth - rect.right))).toBeLessThan(2);
  });

  it('should remove the card when hidden or destroyed', () => {
    setVisible(true);
    setVisible(false);
    expect(card()).toBeNull();

    setVisible(true);
    fixture.destroy();
    expect(card()).toBeNull();
  });

  it('should emit closed when the backdrop is clicked', () => {
    setVisible(true);

    (root().querySelector('.cdk-overlay-backdrop') as HTMLElement).click();

    expect(host.closes).toBe(1);
  });

  it('Escape key should emit closed while visible', () => {
    setVisible(true);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(host.closes).toBe(1);
  });

  it('Escape key should be ignored when closeOnEscape is false', () => {
    host.closeOnEscape = false;
    setVisible(true);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(host.closes).toBe(0);
  });

  it('should project appCardHeader/appCardFooter content into their own app-card slots, not into the default content slot', () => {
    setVisible(true);

    const header = root().querySelector('.app-card-header');
    const content = root().querySelector('.app-card-content');
    const footer = root().querySelector('.app-card-footer');

    expect(header?.querySelector('.my-header')).withContext('header content should be inside .app-card-header').toBeTruthy();
    expect(content?.querySelector('.my-body')).withContext('plain content should be inside .app-card-content').toBeTruthy();
    expect(content?.querySelector('.my-footer')).withContext('footer content must NOT leak into .app-card-content').toBeFalsy();
    expect(footer?.querySelector('.my-footer')).withContext('footer content should be inside .app-card-footer').toBeTruthy();
  });
});
