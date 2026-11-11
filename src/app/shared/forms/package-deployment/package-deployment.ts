import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DEPLOYMENT_DEFINITION_OVERLAY } from '../../json-schema/overlays/deployment-definition.ui';
import { SchemaFormComponent } from '../../json-schema/schema-form.component';
import { SchemaFormGroup } from '../../json-schema/schema-form-group';
import { SchemaRegistryService } from '../../json-schema/schema-registry.service';
import { chooseSchema, documentValidates, SchemaChoice } from '../../json-schema/schema-version';
import { environment } from 'src/environments/environment';

/**
 * The provider's deploymentDefinition editor, generated from the published `deployment-definition`
 * schema. A new deployment type or field in a new schema version needs no change here; presentation
 * hints live in {@link DEPLOYMENT_DEFINITION_OVERLAY}.
 *
 * An existing package is edited in the current version when its value is valid there, and in the
 * version it was written with otherwise (see {@link chooseSchema}). Read the version to stamp from
 * `form.schemaUrl`.
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
export class PackageDeploymentComponent implements OnInit, OnDestroy {

  /** Existing deploymentDefinition value to edit (`{type, version, properties}`). */
  @Input() initialValue: any;

  /** The `@schemaLocation` the existing value was stored with. */
  @Input() schemaLocation?: string;

  /** Emits the form once the schema is loaded. Read the document with `form.schemaValue()` and the
   * schema it follows with `form.schemaUrl`. */
  @Output() formReady = new EventEmitter<SchemaFormGroup>();

  /** Emits when the stored definition cannot be edited here and has to be kept as it is. */
  @Output() readOnly = new EventEmitter<SchemaChoice>();

  readonly overlay = DEPLOYMENT_DEFINITION_OVERLAY;
  /** Set once the version to edit in is known. */
  schemaUrl?: string;
  choice?: SchemaChoice;
  form?: SchemaFormGroup;
  private subscription?: Subscription;

  constructor(private registry: SchemaRegistryService) {}

  ngOnInit(): void {
    const currentUrl = environment.DEPLOYMENT_SCHEMA_LOCATION;
    this.subscription = chooseSchema(this.registry, currentUrl, this.schemaLocation, loaded => documentValidates(loaded, this.initialValue))
      .subscribe({
        next: choice => {
          this.choice = choice;
          if (choice.readOnlyReason) {
            this.readOnly.emit(choice);
          } else {
            this.schemaUrl = choice.url;
          }
        },
        // The current schema could not be fetched: let the form show the error and its retry.
        error: () => (this.schemaUrl = currentUrl),
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** Editing in a version older than the current one. */
  get olderVersion(): boolean {
    return !!this.choice && !this.choice.readOnlyReason && this.choice.url !== environment.DEPLOYMENT_SCHEMA_LOCATION;
  }

  onFormReady(form: SchemaFormGroup): void {
    this.form = form;
    this.formReady.emit(form);
  }

  /** Keys written in both Helm value channels: a default that is also enforced never takes effect. */
  get shadowedKeys(): string[] {
    return this.form?.get('properties')?.errors?.['shadowedKeys'] ?? [];
  }
}
