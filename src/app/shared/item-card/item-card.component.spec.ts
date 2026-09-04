import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemCardComponent } from './item-card.component';

describe('ItemCardComponent', () => {
  let component: ItemCardComponent;
  let fixture: ComponentFixture<ItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not set data-selected or data-clickable by default', () => {
    const el = fixture.nativeElement.querySelector('.app-item-card');
    expect(el.hasAttribute('data-selected')).toBeFalse();
    expect(el.hasAttribute('data-clickable')).toBeFalse();
  });

  it('should set data-selected when selected is true', () => {
    component.selected = true;
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.app-item-card');
    expect(el.hasAttribute('data-selected')).toBeTrue();
  });

  it('should set data-clickable when clickable is true', () => {
    component.clickable = true;
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.app-item-card');
    expect(el.hasAttribute('data-clickable')).toBeTrue();
  });
});
