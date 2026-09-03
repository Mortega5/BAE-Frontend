import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentCardComponent } from './content-card.component';

@Component({
  standalone: true,
  imports: [ContentCardComponent],
  template: `<app-card>Body only</app-card>`,
})
class ContentOnlyHostComponent {}

@Component({
  standalone: true,
  imports: [ContentCardComponent],
  template: `
    <app-card>
      <h2 appCardHeader>Title</h2>
      Body content
      <div appCardFooter><button>Save</button></div>
    </app-card>
  `,
})
class FullHostComponent {}

describe('ContentCardComponent', () => {
  let fixture: ComponentFixture<ContentCardComponent>;
  let component: ContentCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentCardComponent);
    component = fixture.componentInstance;
  });

  const cardEl = (): HTMLElement => fixture.nativeElement.querySelector('.app-card');

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should default to the panel variant', () => {
    fixture.detectChanges();
    expect(cardEl().getAttribute('data-variant')).toBe('panel');
  });

  it('should reflect the variant input as an attribute', () => {
    component.variant = 'modal';
    fixture.detectChanges();
    expect(cardEl().getAttribute('data-variant')).toBe('modal');
  });

  it('should project body content when no header/footer are provided', () => {
    const hostFixture = TestBed.createComponent(ContentOnlyHostComponent);
    hostFixture.detectChanges();

    const content = hostFixture.nativeElement.querySelector('.app-card-content');
    expect(content.textContent.trim()).toBe('Body only');
  });

  it('should collapse the header and footer wrappers when nothing is projected into them', () => {
    const hostFixture = TestBed.createComponent(ContentOnlyHostComponent);
    hostFixture.detectChanges();

    const header: HTMLElement = hostFixture.nativeElement.querySelector('.app-card-header');
    const footer: HTMLElement = hostFixture.nativeElement.querySelector('.app-card-footer');
    expect(getComputedStyle(header).display).toBe('none');
    expect(getComputedStyle(footer).display).toBe('none');
  });

  it('should cap the modal variant to the viewport and let only the content scroll', () => {
    component.variant = 'modal';
    fixture.detectChanges();

    const card = cardEl();
    expect(getComputedStyle(card).maxHeight).not.toBe('none');
    const content = card.querySelector('.app-card-content') as HTMLElement;
    expect(getComputedStyle(content).overflowY).toBe('auto');
  });

  it('should NOT cap the panel variant (no viewport-height limit)', () => {
    component.variant = 'panel';
    fixture.detectChanges();

    const card = cardEl();
    expect(getComputedStyle(card).maxHeight).toBe('none');
    const content = card.querySelector('.app-card-content') as HTMLElement;
    expect(getComputedStyle(content).overflowY).not.toBe('auto');
  });

  it('should project header, body and footer all at once without dropping any of them', () => {
    const hostFixture = TestBed.createComponent(FullHostComponent);
    hostFixture.detectChanges();

    const header: HTMLElement = hostFixture.nativeElement.querySelector('.app-card-header');
    const content: HTMLElement = hostFixture.nativeElement.querySelector('.app-card-content');
    const footer: HTMLElement = hostFixture.nativeElement.querySelector('.app-card-footer');

    expect(header.textContent).toContain('Title');
    expect(content.textContent).toContain('Body content');
    expect(footer.textContent).toContain('Save');
    expect(getComputedStyle(header).display).not.toBe('none');
    expect(getComputedStyle(footer).display).not.toBe('none');
  });
});
