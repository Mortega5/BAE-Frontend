import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownPanelComponent } from './dropdown-panel.component';

@Component({
  standalone: true,
  imports: [DropdownPanelComponent],
  template: `<app-dropdown-panel>Item one</app-dropdown-panel>`,
})
class HostComponent {}

describe('DropdownPanelComponent', () => {
  let fixture: ComponentFixture<DropdownPanelComponent>;
  let component: DropdownPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DropdownPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should project content', () => {
    const hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();

    const panel: HTMLElement = hostFixture.nativeElement.querySelector('.app-dropdown-panel');
    expect(panel.textContent).toContain('Item one');
  });
});
