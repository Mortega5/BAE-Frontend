import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { issueMessage } from './schema-issue-i18n';
import { SchemaValidationError } from './schema-registry.service';

/**
 * The message of a schema validation error in the language currently selected. Impure on purpose:
 * the language can change while the error is on screen.
 */
@Pipe({ name: 'schemaIssue', standalone: true, pure: false })
export class SchemaIssuePipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(error: SchemaValidationError): string {
    return issueMessage(error, this.translate.currentLang || this.translate.defaultLang, (key, params) => this.translate.instant(key, params));
  }
}
