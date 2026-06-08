import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncateValue', standalone: true, pure: true })
export class TruncateValuePipe implements PipeTransform {
  transform(value: any, maxChars = 80): string {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return str.length > maxChars ? str.slice(0, maxChars) + '…' : str;
  }
}
