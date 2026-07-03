import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() filters: FormField[] = [];
  @Input() columns: number = 3;
  @Input() debounceMs: number = 300;
  @Output() filtersChange = new EventEmitter<Record<string, any>>();

  form: FormGroup = new FormGroup({});
  private valueChangesSub?: Subscription;

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] && !changes['filters'].firstChange) {
      this.buildForm();
    }
  }

  ngOnDestroy(): void {
    this.valueChangesSub?.unsubscribe();
  }

  private buildForm(): void {
    this.valueChangesSub?.unsubscribe();

    const controls: Record<string, FormControl> = {};
    for (const field of this.filters) {
      controls[field.name] = new FormControl(field.defaultValue ?? null);
    }
    this.form = new FormGroup(controls);

    this.valueChangesSub = this.form.valueChanges
      .pipe(debounceTime(this.debounceMs))
      .subscribe(value => this.filtersChange.emit(value));

    this.filtersChange.emit(this.form.value);
  }

  get value(): Record<string, any> {
    return this.form.value;
  }
}
