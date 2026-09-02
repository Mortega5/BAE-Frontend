import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonComponent } from './button.component';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `<app-button prefixIcon="xmark">Label text</app-button>`,
})
class HostComponent {}

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `<app-button prefixIcon="plus" suffixIcon="xmark">Spread label</app-button>`,
})
class SpreadHostComponent {}

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `<app-button [disabled]="disabled" (click)="onClick()">Click me</app-button>`,
})
class ClickHostComponent {
  disabled = false;
  clicks = 0;
  onClick() { this.clicks++; }
}

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
  });

  const buttonEl = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should default to the primary variant, medium size, default shape and no outline', () => {
    fixture.detectChanges();
    const button = buttonEl();
    expect(button.getAttribute('data-variant')).toBe('primary');
    expect(button.getAttribute('data-size')).toBe('md');
    expect(button.getAttribute('data-shape')).toBe('default');
    expect(button.hasAttribute('data-outline')).toBeFalse();
  });

  it('should reflect the variant, size, shape and outline inputs as attributes', () => {
    component.variant = 'secondary';
    component.size = 'sm';
    component.shape = 'pill';
    component.outline = true;
    fixture.detectChanges();

    const button = buttonEl();
    expect(button.getAttribute('data-variant')).toBe('secondary');
    expect(button.getAttribute('data-size')).toBe('sm');
    expect(button.getAttribute('data-shape')).toBe('pill');
    expect(button.hasAttribute('data-outline')).toBeTrue();
  });

  it('should apply the type, disabled and data-cy attributes to the native button', () => {
    component.type = 'submit';
    component.disabled = true;
    component.dataCy = 'submitBtn';
    fixture.detectChanges();

    const button = buttonEl();
    expect(button.type).toBe('submit');
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('data-cy')).toBe('submitBtn');
  });

  it('should render a prefix icon before the content', () => {
    component.prefixIcon = 'xmark';
    fixture.detectChanges();

    const button = buttonEl();
    const group = button.querySelector('.app-button-group');
    expect(group?.firstElementChild?.tagName.toLowerCase()).toBe('fa-icon');
  });

  it('should still project the content text alongside a prefix icon', async () => {
    const hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();

    const button: HTMLButtonElement = hostFixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toContain('Label text');
    expect(button.querySelector('fa-icon')).toBeTruthy();
  });

  it('should render a suffix icon after the content', () => {
    component.suffixIcon = 'xmark';
    fixture.detectChanges();

    const button = buttonEl();
    expect(button.lastElementChild?.tagName.toLowerCase()).toBe('fa-icon');
  });

  it('should render no icon when none is provided', () => {
    fixture.detectChanges();
    expect(buttonEl().querySelector('fa-icon')).toBeNull();
  });

  it('should render both a prefix and a suffix icon and mark the button as spread', () => {
    component.prefixIcon = 'plus';
    component.suffixIcon = 'xmark';
    fixture.detectChanges();

    const button = buttonEl();
    const icons = button.querySelectorAll('fa-icon');
    expect(icons.length).toBe(2);
    expect(button.hasAttribute('data-spread')).toBeTrue();
  });

  it('should still project the content text when both a prefix and a suffix icon are set', () => {
    const hostFixture = TestBed.createComponent(SpreadHostComponent);
    hostFixture.detectChanges();

    const button: HTMLButtonElement = hostFixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toContain('Spread label');
    expect(button.querySelectorAll('fa-icon').length).toBe(2);
  });

  it('should not mark the button as spread when only one icon is set', () => {
    component.prefixIcon = 'xmark';
    fixture.detectChanges();

    expect(buttonEl().hasAttribute('data-spread')).toBeFalse();
  });

  it('should fire a native (click) bound on the host when enabled', () => {
    const hostFixture = TestBed.createComponent(ClickHostComponent);
    hostFixture.detectChanges();
    const host = hostFixture.componentInstance;

    hostFixture.nativeElement.querySelector('button').click();

    expect(host.clicks).toBe(1);
  });

  it('should NOT fire a native (click) bound on the host when disabled', () => {
    const hostFixture = TestBed.createComponent(ClickHostComponent);
    hostFixture.componentInstance.disabled = true;
    hostFixture.detectChanges();
    const host = hostFixture.componentInstance;

    hostFixture.nativeElement.querySelector('button').click();

    expect(host.clicks).toBe(0);
  });

  it('should show the not-allowed cursor on the real button when disabled', () => {
    // Deliberately no pointer-events:none anywhere in button.component.scss — that would
    // exclude the button from hit-testing, hiding this cursor and making a real mouse click's
    // hit-test fall through to the <app-button> host (which has its own independent native
    // (click) listener with no idea the button is disabled). Blocking relies purely on the
    // native <button disabled> semantics instead (verified by the two tests above), which
    // keeps hit-testing normal — hence this cursor is safe to assert directly here.
    component.disabled = true;
    fixture.detectChanges();

    expect(getComputedStyle(buttonEl()).cursor).toBe('not-allowed');
  });
});
