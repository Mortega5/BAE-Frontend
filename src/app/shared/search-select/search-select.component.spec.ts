import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { SearchSelectComponent } from './search-select.component';

describe('SearchSelectComponent', () => {
  let component: SearchSelectComponent;
  let fixture: ComponentFixture<SearchSelectComponent>;

  const options = [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
    { value: 'c', label: 'Cherry' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot(), SearchSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchSelectComponent);
    component = fixture.componentInstance;
    component.options = options;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter options by label as the query changes', () => {
    component.query = 'an';
    expect(component.filteredOptions).toEqual([{ value: 'b', label: 'Banana' }]);
  });

  it('should return every option when the query is empty', () => {
    component.query = '';
    expect(component.filteredOptions).toEqual(options);
  });

  describe('single-select mode', () => {
    it('should select one option, close the dropdown, and emit the raw value', () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);

      component.selectOption(options[1]);

      expect(component.selectedValues).toEqual(['b']);
      expect(component.isOpen).toBeFalse();
      expect(onChange).toHaveBeenCalledWith('b');
    });

    it('should replace the previous selection when a new option is picked', () => {
      component.selectOption(options[0]);
      component.selectOption(options[2]);

      expect(component.selectedValues).toEqual(['c']);
    });

    it('should clear the selection', () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);
      component.selectOption(options[0]);

      component.clearSelection(new MouseEvent('click'));

      expect(component.selectedValues).toEqual([]);
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('writeValue should wrap a scalar value into the internal selection', () => {
      component.writeValue('a');
      expect(component.selectedValues).toEqual(['a']);
    });
  });

  describe('multi-select mode', () => {
    beforeEach(() => {
      component.multiple = true;
    });

    it('should toggle options in and out of the selection and emit an array', () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);

      component.selectOption(options[0]);
      component.selectOption(options[1]);
      expect(component.selectedValues).toEqual(['a', 'b']);
      expect(onChange).toHaveBeenCalledWith(['a', 'b']);

      component.selectOption(options[0]);
      expect(component.selectedValues).toEqual(['b']);
    });

    it('should keep the dropdown open after selecting an option', () => {
      component.isOpen = true;
      component.selectOption(options[0]);
      expect(component.isOpen).toBeTrue();
    });

    it('should remove a selected item via removeItem', () => {
      component.selectedValues = ['a', 'b'];
      component.removeItem(options[0], new MouseEvent('click'));
      expect(component.selectedValues).toEqual(['b']);
    });

    it('writeValue should keep an array as-is and default to empty for non-arrays', () => {
      component.writeValue(['a', 'c']);
      expect(component.selectedValues).toEqual(['a', 'c']);

      component.writeValue(null);
      expect(component.selectedValues).toEqual([]);
    });
  });

  it('should not react to selection when readonly', () => {
    component.readonly = true;
    component.selectOption(options[0]);
    expect(component.selectedValues).toEqual([]);
  });

  describe('create option', () => {
    beforeEach(() => {
      component.allowCreate = true;
    });

    it('should only offer to create when the query matches no existing option', () => {
      component.query = 'Banana';
      expect(component.showCreateOption).toBeFalse();

      component.query = 'Durian';
      expect(component.showCreateOption).toBeTrue();

      component.query = '';
      expect(component.showCreateOption).toBeFalse();
    });

    it('should not offer to create when allowCreate is false', () => {
      component.allowCreate = false;
      component.query = 'Durian';
      expect(component.showCreateOption).toBeFalse();
    });

    it('should emit createRequested even without a createHandler', async () => {
      const spy = jasmine.createSpy('createRequested');
      component.createRequested.subscribe(spy);
      component.query = 'Durian';

      await component.requestCreate();

      expect(spy).toHaveBeenCalledWith('Durian');
    });

    it('should add and select the created option on success', async () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);
      const created = { value: 'd', label: 'Durian' };
      component.createHandler = () => Promise.resolve(created);
      component.query = 'Durian';

      await component.requestCreate();

      expect(component.options).toContain(created);
      expect(component.selectedValues).toEqual(['d']);
      expect(onChange).toHaveBeenCalledWith('d');
      expect(component.isCreating).toBeFalse();
    });

    it('should re-open and emit createFailed when the handler rejects', async () => {
      const spy = jasmine.createSpy('createFailed');
      component.createFailed.subscribe(spy);
      const error = new Error('boom');
      component.createHandler = () => Promise.reject(error);
      component.query = 'Durian';
      component.isOpen = false;

      await component.requestCreate();

      expect(component.isOpen).toBeTrue();
      expect(component.selectedValues).toEqual([]);
      expect(spy).toHaveBeenCalledWith({ query: 'Durian', error });
      expect(component.isCreating).toBeFalse();
    });

    it('should do nothing when the query is empty or the component is readonly', async () => {
      const spy = jasmine.createSpy('createRequested');
      component.createRequested.subscribe(spy);

      component.query = '   ';
      await component.requestCreate();
      expect(spy).not.toHaveBeenCalled();

      component.readonly = true;
      component.query = 'Durian';
      await component.requestCreate();
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
