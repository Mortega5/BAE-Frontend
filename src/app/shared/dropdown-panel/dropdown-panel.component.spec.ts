import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownPanelComponent } from './dropdown-panel.component';

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
    fixture.nativeElement.innerHTML = 'Item one';
    fixture.detectChanges();

    const panel: HTMLElement = fixture.nativeElement.querySelector('.app-dropdown-panel');
    expect(panel.textContent).toContain('Item one');
  });
});
