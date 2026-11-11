import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DEPLOYMENT_DEFINITION_OVERLAY } from '../../json-schema/overlays/deployment-definition.ui';
import { SchemaFormComponent } from '../../json-schema/schema-form.component';
import { SchemaFormGroup } from '../../json-schema/schema-form-group';
import { environment } from 'src/environments/environment';

/**
 * The provider's deploymentDefinition editor, generated from the published `deployment-definition`
 * schema (`environment.DEPLOYMENT_SCHEMA_LOCATION`). A new deployment type or field in a new schema
 * version needs no change here; presentation hints live in {@link DEPLOYMENT_DEFINITION_OVERLAY}.
 *
 * The package describes WHAT is deployed, never WHERE or under WHICH NAME: the release identity
 * (deploymentName, namespace) is chosen per deployment and lives on the InstalledSoftware.
 */
@Component({
  selector: 'app-package-deployment',
  templateUrl: './package-deployment.html',
  standalone: true,
  imports: [CommonModule, TranslateModule, SchemaFormComponent],
})
export class PackageDeploymentComponent {

  /** Existing deploymentDefinition value to edit (`{type, version, properties}`). */
  @Input() initialValue: any;

  /** Emits the form once the schema is loaded. Read the document with `form.schemaValue()`. */
  @Output() formReady = new EventEmitter<SchemaFormGroup>();

  readonly schemaUrl = environment.DEPLOYMENT_SCHEMA_LOCATION;
  readonly overlay = DEPLOYMENT_DEFINITION_OVERLAY;
  form?: SchemaFormGroup;

  onFormReady(form: SchemaFormGroup): void {
    this.form = form;
    this.formReady.emit(form);
  }

  /** Keys written in both Helm value channels: a default that is also enforced never takes effect. */
  get shadowedKeys(): string[] {
    return this.form?.get('properties')?.errors?.['shadowedKeys'] ?? [];
  }
}
