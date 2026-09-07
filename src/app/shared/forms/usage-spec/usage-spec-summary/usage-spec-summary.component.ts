import {TranslateModule} from "@ngx-translate/core";
import { Component, Input, OnInit, forwardRef } from '@angular/core';
import { NgClass, NgIf } from "@angular/common";
import { PickerComponent } from "@ctrl/ngx-emoji-mart";
import {SharedModule} from "../../../shared.module";
import { MarkdownComponent } from "ngx-markdown";
import {
  ControlValueAccessor, FormArray,
  FormBuilder,
  ReactiveFormsModule,
  FormGroup,
  NG_VALUE_ACCESSOR,
  Validators
} from '@angular/forms';
import { TableColumn } from 'src/app/models/table-column.model';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';

@Component({
  selector: 'usage-spec-summary',
  standalone: true,
  imports: [
    TranslateModule,
    NgIf,
    MarkdownComponent,
    NgClass,
    PickerComponent,
    SharedModule,
    TableInputComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UsageSpecSummaryComponent),
      multi: true
    }
  ],
  templateUrl: './usage-spec-summary.component.html',
  styleUrl: './usage-spec-summary.component.css'
})
export class UsageSpecSummaryComponent implements OnInit {
  @Input() usageSpecForm!: FormGroup;

  metricColumns: TableColumn[] = [
    {
      header: 'USAGE_SPECS._name',
      getValue: (metric: any) => metric.name,
      cellClass: (metric: any) => this.hasLongWord(metric.name, 20) ? 'break-all' : 'break-words',
    },
    {
      header: 'USAGE_SPECS._description',
      hideOnMobile: true,
      getValue: (metric: any) => metric.description,
      cellClass: (metric: any) => this.hasLongWord(metric.description, 20) ? 'break-all' : 'break-words',
    },
  ];

  async ngOnInit() {
    console.log('--- INFO SUMMARY')
    console.log(this.usageSpecForm)
    console.log(this.usageSpecForm.get('generalInfo')?.get('name')?.value)
    console.log(this.usageSpecForm.get('metrics')?.value)
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

}
