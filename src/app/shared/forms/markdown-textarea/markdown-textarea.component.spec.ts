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
});
