import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalComponent } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <app-modal [visible]="true">
      <div appCardHeader class="my-header">HEADER</div>
      <p class="my-body">BODY</p>
      <div appCardFooter class="my-footer">FOOTER</div>
    </app-modal>
  `,
})
class ProjectionHostComponent { }

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing when not visible', () => {
    component.visible = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-card')).toBeNull();
  });

  it('should render the card when visible', () => {
    component.visible = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-card')).toBeTruthy();
  });

  it('should emit closed when the backdrop is clicked', () => {
    spyOn(component.closed, 'emit');
    component.visible = true;
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.fixed').dispatchEvent(new MouseEvent('click'));

    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('Escape key should emit closed only when visible', () => {
    spyOn(component.closed, 'emit');
    component.visible = false;

    component.onEscape();
    expect(component.closed.emit).not.toHaveBeenCalled();

    component.visible = true;
    component.onEscape();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('Escape key should be ignored when closeOnEscape is false', () => {
    spyOn(component.closed, 'emit');
    component.visible = true;
    component.closeOnEscape = false;

    component.onEscape();

    expect(component.closed.emit).not.toHaveBeenCalled();
  });

});

describe('ModalComponent content projection', () => {
  let hostFixture: ComponentFixture<ProjectionHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectionHostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(ProjectionHostComponent);
    hostFixture.detectChanges();
  });

  it('should project appCardHeader/appCardFooter content into their own app-card slots, not into the default content slot', () => {
    const root: HTMLElement = hostFixture.nativeElement;

    const header = root.querySelector('.app-card-header');
    const content = root.querySelector('.app-card-content');
    const footer = root.querySelector('.app-card-footer');

    expect(header?.querySelector('.my-header')).withContext('header content should be inside .app-card-header').toBeTruthy();
    expect(content?.querySelector('.my-body')).withContext('plain content should be inside .app-card-content').toBeTruthy();
    expect(content?.querySelector('.my-footer')).withContext('footer content must NOT leak into .app-card-content').toBeFalsy();
    expect(footer?.querySelector('.my-footer')).withContext('footer content should be inside .app-card-footer').toBeTruthy();
  });
});
