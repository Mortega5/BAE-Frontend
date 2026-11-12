import { Component, HostListener, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgClass, NgIf } from "@angular/common";
import { MarkdownComponent } from "ngx-markdown";
import { PickerComponent } from "@ctrl/ngx-emoji-mart";
import {SharedModule} from "../../shared.module";

@Component({
  selector: 'app-markdown-textarea',
  templateUrl: './markdown-textarea.component.html',
  styleUrls: ['./markdown-textarea.component.css'],
  standalone: true,
  imports: [
    NgIf,
    MarkdownComponent,
    NgClass,
    PickerComponent,
    SharedModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownTextareaComponent),
      multi: true
    }
  ]
})
export class MarkdownTextareaComponent implements ControlValueAccessor {
  private static nextEditorId = 0;

  @Input() placeholder: string = 'Write your description here...';
  @Input() rows: number = 8;
  @Input() maxLength: number = 100000;
  /** Renders a plain rendered-markdown preview box with no toolbar/textarea at all,
   * instead of the usual editor dimmed via CSS — matches how org-info's profile
   * description used to look for non-admin (read-only) org members. */
  @Input() readonly = false;
  value: string = '';
  showPreview = false;
  showEmoji = false;
  editorId = `markdown-editor-${MarkdownTextareaComponent.nextEditorId++}`;

  @HostListener('document:click')
  onClick() {
    if (this.showEmoji == true) {
      this.showEmoji = false;
    }
  }

  onChange = (_: any) => {};
  onTouched = () => {};

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  updateValue(event: Event): void {
    const newValue = (event.target as HTMLTextAreaElement).value;
    this.value = newValue;
    this.onChange(newValue);
    this.onTouched();
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  //Markdown actions:
  addList(){
      this.value += '\n- First item\n- Second item'
  }

  addOrderedList(){
      this.value += '\n1. First item\n2. Second item'
  }

  addCode(){
      this.value += '\n`code`'
  }

  addCodeBlock(){
      this.value += '\n```\ncode\n```'
  }

  addBlockquote(){
      this.value += '\n> blockquote'
  }

  addTable(){
      this.value += '\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |'
  }

  addEmoji(event:any){
      this.showEmoji=false;
      this.value += event.emoji.native
      this.onChange(this.value);
  }

  addMarkdownTag(tag: string): void {
    const textarea = document.getElementById(this.editorId) as HTMLTextAreaElement;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const beforeText = this.value.substring(0, selectionStart);
    let selectedText = this.value.substring(selectionStart, selectionEnd);
    const afterText = this.value.substring(selectionEnd);
    // Where the cursor, or the selection, goes inside what is inserted; at its end unless an action says otherwise
    let cursorFrom: number | null = null;
    let cursorTo: number | null = null;

    switch (tag) {
      case 'bold':
        selectedText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        selectedText = `*${selectedText || 'italic text'}*`;
        break;
      case 'link':
        if (!selectedText) {
          selectedText = '[link text](http://)';
        } else if (this.looksLikeUrl(selectedText)) {
          // What is selected is the address: the text of the link is what is missing, and it is the part to write
          const text = 'link text';
          selectedText = `[${text}](${this.asUrl(selectedText)})`;
          cursorFrom = 1;
          cursorTo = 1 + text.length;
        } else {
          // What is selected is the text of the link: the cursor waits inside the parentheses for the address to be pasted
          selectedText = `[${selectedText}]()`;
          cursorFrom = cursorTo = selectedText.length - 1;
        }
        break;
      case 'list':
        selectedText = `- ${selectedText || 'list item'}`;
        break;
      case 'orderedList':
        selectedText = `1. ${selectedText || 'ordered item'}`;
        break;
      case 'blockquote':
        selectedText = `> ${selectedText || 'blockquote'}`;
        break;
      case 'code':
        selectedText = `\`${selectedText || 'inline code'}\``;
        break;
      case 'codeBlock':
        selectedText = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``;
        break;
      case 'table':
        selectedText = `| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| ${selectedText || 'data'} | data | data |`;
        break;
    }

    this.value = beforeText + selectedText + afterText;
    this.onChange(this.value);

    // Restaurar el cursor al final del texto insertado, o donde la acción lo necesite
    const from = selectionStart + (cursorFrom ?? selectedText.length);
    const to = selectionStart + (cursorTo ?? selectedText.length);
    setTimeout(() => {
      textarea.selectionStart = from;
      textarea.selectionEnd = to;
      textarea.focus();
    }, 0);
  }

  /** Pasting an address over a selected text makes that text a link to it; anything else is pasted as usual. */
  onPaste(event: ClipboardEvent): void {
    const textarea = event.target as HTMLTextAreaElement;
    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart === selectionEnd) return;
    const pasted = event.clipboardData?.getData('text')?.trim() ?? '';
    if (!this.looksLikeUrl(pasted)) return;

    event.preventDefault();
    const link = `[${this.value.substring(selectionStart, selectionEnd)}](${this.asUrl(pasted)})`;
    this.value = this.value.substring(0, selectionStart) + link + this.value.substring(selectionEnd);
    this.onChange(this.value);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + link.length;
      textarea.focus();
    }, 0);
  }

  /** An address with its protocol, or one that starts with `www.`, and nothing else in it. */
  private looksLikeUrl(text: string): boolean {
    return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
  }

  private asUrl(text: string): string {
    const url = text.trim();
    return /^www\./i.test(url) ? `https://${url}` : url;
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
