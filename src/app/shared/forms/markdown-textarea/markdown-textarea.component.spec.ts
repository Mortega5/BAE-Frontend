import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MarkdownModule } from 'ngx-markdown';

import { MarkdownTextareaComponent } from './markdown-textarea.component';

describe('MarkdownTextareaComponent', () => {
  let component: MarkdownTextareaComponent;
  let fixture: ComponentFixture<MarkdownTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [MarkdownTextareaComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot(), MarkdownModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MarkdownTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the toolbar and textarea when not readonly', () => {
    expect(fixture.nativeElement.querySelector('textarea')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.md-toolbar-surface')).toBeTruthy();
  });

  it('should render only a markdown preview, no toolbar/textarea, when readonly', () => {
    component.readonly = true;
    component.writeValue('**bold**');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    expect(fixture.nativeElement.querySelector('.md-toolbar-surface')).toBeNull();
    expect(fixture.nativeElement.querySelector('markdown')).toBeTruthy();
  });

  describe('links', () => {
    const textarea = () => fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const select = (value: string, from: number, to: number) => {
      component.writeValue(value);
      fixture.detectChanges();
      textarea().setSelectionRange(from, to);
    };
    const paste = (text: string) => {
      const event = new ClipboardEvent('paste', { clipboardData: new DataTransfer(), cancelable: true });
      event.clipboardData!.setData('text', text);
      textarea().dispatchEvent(event);
      return event;
    };
    // As in the app: the view takes the new value first, and then the cursor is put where the action wants it
    const flush = () => {
      fixture.detectChanges();
      return new Promise(resolve => setTimeout(resolve));
    };

    it('inserts the usual link when nothing is selected', () => {
      select('', 0, 0);
      component.addMarkdownTag('link');

      expect(component.value).toBe('[link text](http://)');
    });

    it('makes the selected text a link and leaves the cursor inside the parentheses, with no address put in', async () => {
      select('see the docs now', 4, 12);
      component.addMarkdownTag('link');
      await flush();

      expect(component.value).toBe('see [the docs]() now');
      expect(textarea().selectionStart).toBe(15);
      expect(textarea().selectionEnd).toBe(15);
    });

    it('uses a selected address as the target of the link and selects the text to write', async () => {
      select('https://example.com', 0, 19);
      component.addMarkdownTag('link');
      await flush();

      fixture.detectChanges();

      expect(component.value).toBe('[link text](https://example.com)');
      expect(textarea().value.substring(textarea().selectionStart, textarea().selectionEnd)).toBe('link text');
    });

    it('makes the selected text a link to the address that is pasted over it', async () => {
      select('see the docs now', 4, 12);
      const event = paste('https://example.com/docs');
      await flush();

      expect(event.defaultPrevented).toBeTrue();
      expect(component.value).toBe('see [the docs](https://example.com/docs) now');
      expect(textarea().selectionStart).toBe(textarea().selectionEnd);
    });

    it('adds the protocol to an address that starts with www', () => {
      select('docs', 0, 4);
      paste('www.example.com');

      expect(component.value).toBe('[docs](https://www.example.com)');
    });

    it('pastes as usual when nothing is selected, or what is pasted is not an address', () => {
      select('some text', 5, 5);
      expect(paste('https://example.com').defaultPrevented).toBeFalse();

      select('some text', 0, 4);
      expect(paste('not an address').defaultPrevented).toBeFalse();
      expect(paste('https://example.com and more').defaultPrevented).toBeFalse();
      expect(component.value).toBe('some text');
    });
  });
});
