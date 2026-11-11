import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiOperation } from 'src/app/models/api-access.model';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { API_CONNECTION_FIELDS } from '../api-fields';
import { ApiOperationsEditorComponent } from '../api-operations-editor/api-operations-editor.component';

/** What an API is made of, as its offer asks for it: where it is served from, then its operations. The same form when the
 * API is made with the offer and when the offer edits it. The parent owns the data. */
@Component({
  selector: 'app-api-definition-fields',
  standalone: true,
  imports: [TranslateModule, DynamicFormComponent, ApiOperationsEditorComponent],
  templateUrl: './api-definition-fields.component.html',
})
export class ApiDefinitionFieldsComponent {
  /** The control of `apiConnectionForm`. */
  @Input() form!: FormGroup;
  @Input() operations: ApiOperation[] = [];
  @Output() operationsChange = new EventEmitter<ApiOperation[]>();

  readonly fields = API_CONNECTION_FIELDS;
}
