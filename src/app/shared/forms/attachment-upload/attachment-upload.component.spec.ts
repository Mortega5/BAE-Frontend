import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { AttachmentUploadComponent } from './attachment-upload.component';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';

describe('AttachmentUploadComponent', () => {
  let component: AttachmentUploadComponent;
  let fixture: ComponentFixture<AttachmentUploadComponent>;
  let attachmentService: AttachmentServiceService;

  const makeFile = (name: string, type: string, size: number): File => {
    const file = new File(['x'.repeat(size)], name, { type });
    return file;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot(), AttachmentUploadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AttachmentUploadComponent);
    component = fixture.componentInstance;
    attachmentService = TestBed.inject(AttachmentServiceService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reject a file exceeding maxFileSize without uploading', () => {
    const spy = spyOn(attachmentService, 'uploadFile');
    component.maxFileSize = 10;
    (component as any).handleFile(makeFile('big.pdf', 'application/pdf', 20));

    expect(spy).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('FORMS.ATTACHMENT._too_large');
  });

  it('should reject a file whose type is not in accept', () => {
    const spy = spyOn(attachmentService, 'uploadFile');
    component.accept = 'image/*';
    (component as any).handleFile(makeFile('doc.pdf', 'application/pdf', 5));

    expect(spy).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('FORMS.ATTACHMENT._invalid_type');
  });

  it('should accept a matching extension pattern', (done) => {
    spyOn(attachmentService, 'uploadFile').and.returnValue(of({ content: 'https://uploaded.file' }));
    component.accept = '.pdf,.doc';

    (component as any).handleFile(makeFile('doc.pdf', 'application/pdf', 5));

    setTimeout(() => {
      expect(component.attachments.length).toBe(1);
      expect(component.attachments[0].url).toBe('https://uploaded.file');
      done();
    }, 50);
  });

  it('should upload a valid file and select it as the single attachment', (done) => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    spyOn(attachmentService, 'uploadFile').and.returnValue(of({ content: 'https://uploaded.file' }));

    (component as any).handleFile(makeFile('terms.pdf', 'application/pdf', 5));

    setTimeout(() => {
      expect(component.attachments).toEqual([{ name: 'terms.pdf', url: 'https://uploaded.file', attachmentType: 'application/pdf' }]);
      expect(onChange).toHaveBeenCalledWith({ name: 'terms.pdf', url: 'https://uploaded.file', attachmentType: 'application/pdf' });
      expect(component.canAddMore).toBeFalse();
      done();
    }, 50);
  });

  it('should accumulate multiple attachments when multiple is true', (done) => {
    component.multiple = true;
    spyOn(attachmentService, 'uploadFile').and.returnValues(
      of({ content: 'https://uploaded.file/1' }),
      of({ content: 'https://uploaded.file/2' })
    );

    (component as any).handleFile(makeFile('a.pdf', 'application/pdf', 5));
    setTimeout(() => {
      (component as any).handleFile(makeFile('b.pdf', 'application/pdf', 5));
      setTimeout(() => {
        expect(component.attachments.length).toBe(2);
        expect(component.canAddMore).toBeTrue();
        done();
      }, 50);
    }, 50);
  });

  it('should surface a 413 upload error as the too-large message', (done) => {
    spyOn(attachmentService, 'uploadFile').and.returnValue(throwError(() => ({ status: 413 })));

    (component as any).handleFile(makeFile('a.pdf', 'application/pdf', 5));

    setTimeout(() => {
      expect(component.errorMessage).toBe('FORMS.ATTACHMENT._too_large');
      expect(component.uploading).toBeFalse();
      done();
    }, 50);
  });

  it('should remove an attachment', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    const att = { name: 'a.pdf', url: 'u', attachmentType: 'application/pdf' };
    component.attachments = [att];

    component.remove(att);

    expect(component.attachments).toEqual([]);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('writeValue should normalize scalar/array values', () => {
    component.writeValue(null);
    expect(component.attachments).toEqual([]);

    const att = { name: 'a.pdf', url: 'u', attachmentType: 'application/pdf' };
    component.writeValue(att);
    expect(component.attachments).toEqual([att]);

    component.multiple = true;
    component.writeValue([att]);
    expect(component.attachments).toEqual([att]);
  });

  it('should not react to dropped files when readonly', () => {
    const spy = spyOn(attachmentService, 'uploadFile');
    component.readonly = true;
    component.dropped([{ fileEntry: { isFile: false } } as any]);
    expect(spy).not.toHaveBeenCalled();
  });
});
