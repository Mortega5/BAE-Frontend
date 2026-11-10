import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { Dataset, DatasetService } from 'src/app/services/dataset.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { environment } from 'src/environments/environment';
import { ResourceSpecFormComponent } from './resource-spec-form.component';

describe('ResourceSpecFormComponent (dataset mode)', () => {
  let component: ResourceSpecFormComponent;
  let fixture: ComponentFixture<ResourceSpecFormComponent>;
  let datasetSpy: jasmine.SpyObj<DatasetService>;
  let resSpecSpy: jasmine.SpyObj<ResourceSpecServiceService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let originalFlag: boolean;
  let routeData: any;
  const csv = new File(['a,b'], 'madrid-consumption.2025.csv', { type: 'text/csv' });
  const flush = () => new Promise<void>(resolve => setTimeout(resolve));
  const done = (body: Partial<Dataset>) => new HttpResponse({ body: body as Dataset });

  async function setup(data: any, paramId?: string) {
    routeData = data;
    await TestBed.configureTestingModule({
      imports: [ResourceSpecFormComponent, TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { data: routeData, paramMap: { get: () => paramId } } } },
        { provide: DatasetService, useValue: datasetSpy },
        { provide: ResourceSpecServiceService, useValue: resSpecSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: LocalStorageService, useValue: { getValidLoginInfo: () => ({ id: 'u', logged_as: 'u', partyId: 'org-1' }) } },
        { provide: EventMessageService, useValue: { messages$: new Subject<any>().asObservable() } },
      ],
    }).overrideComponent(ResourceSpecFormComponent, { set: { template: '' } }).compileComponents();
    fixture = TestBed.createComponent(ResourceSpecFormComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  beforeEach(() => {
    originalFlag = environment.DATASETS_ENABLED;
    environment.DATASETS_ENABLED = true;
    datasetSpy = jasmine.createSpyObj<DatasetService>('DatasetService', ['create', 'get', 'replaceFile', 'remove', 'source']);
    // The seller uploads its datasets: it has no contract management of its own
    datasetSpy.source.and.returnValue(of('file'));
    resSpecSpy = jasmine.createSpyObj<ResourceSpecServiceService>('ResourceSpecServiceService', ['getResSpecById', 'updateResSpec', 'postResSpec', 'deleteResSpec']);
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', ['showSuccess', 'showError', 'showInfo']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
  });

  afterEach(() => { environment.DATASETS_ENABLED = originalFlag; });

  describe('create', () => {
    beforeEach(async () => {
      await setup({ mode: 'create' });
      component.generalForm.patchValue({ baseTemplate: 'dataset' });
    });

    it('offers the Dataset template only when the flag is on and not embedded', () => {
      const values = () => (component.generalFormFields.find(f => f.name === 'baseTemplate') as any).options.map((o: any) => o.value);
      expect(values()).toContain('dataset');
      component.generalForm.patchValue({ baseTemplate: '' });
      expect(values()).toContain('dataset');
      component.embedded = true;
      expect(values()).not.toContain('dataset');
      component.embedded = false;
      environment.DATASETS_ENABLED = false;
      expect(values()).not.toContain('dataset');
    });

    it('does not offer the Dataset template to a seller that serves its datasets from its own DSP: it is made in the service form', () => {
      const values = () => (component.generalFormFields.find(f => f.name === 'baseTemplate') as any).options.map((o: any) => o.value);
      component.generalForm.patchValue({ baseTemplate: '' });
      component.datasetSource = 'url';

      expect(values()).not.toContain('dataset');
    });

    it('keeps the usual general inputs, name still required', () => {
      expect(component.datasetMode).toBeTrue();
      const fields = component.generalFormFields;
      expect(fields.map(f => f.name)).toEqual(['name', 'baseTemplate', 'description']);
      expect(fields[0].required).toBeTrue();
      expect(component.generalFormFields).toBe(fields);
      expect(component.generalValid).toBeFalse();
      component.generalForm.patchValue({ name: 'N' });
      expect(component.generalValid).toBeTrue();
    });

    it('fills the name from the file without extension and lets it be edited', () => {
      component.datasetForm.get('file')!.setValue({ file: csv });
      expect(component.generalForm.value.name).toBe('madrid-consumption.2025');

      const name = component.generalForm.controls['name'];
      name.setValue('My name');
      name.markAsDirty();
      component.datasetForm.get('file')!.setValue({ file: new File(['x'], 'other.csv', { type: 'text/csv' }) });
      expect(name.value).toBe('My name');
    });

    it('keeps a name typed before choosing the file', () => {
      const name = component.generalForm.controls['name'];
      name.setValue('Typed');
      name.markAsDirty();
      component.datasetForm.get('file')!.setValue({ file: csv });
      expect(name.value).toBe('Typed');
    });

    it('uploads the file with its details and leaves, with no draft or resource request', async () => {
      const events = new Subject<any>();
      datasetSpy.create.and.returnValue(events);
      component.datasetForm.get('file')!.setValue({ file: csv });
      component.generalForm.patchValue({ description: 'hourly' });
      component.datasetForm.patchValue({ visibility: 'custom' });

      component.save();
      events.next({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
      expect(component.upload.progress).toBe(50);
      events.next(done({ id: 'rs-1' }));
      await flush();

      expect(datasetSpy.create).toHaveBeenCalledWith({ name: 'madrid-consumption.2025', description: 'hourly', visibility: 'custom' }, csv);
      expect(resSpecSpy.postResSpec).not.toHaveBeenCalled();
      expect(component.showPublishDraftModal).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalled();
    });

    it('shows the mapped error and stays when the upload fails', () => {
      datasetSpy.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 415 })));
      component.datasetForm.get('file')!.setValue({ file: csv });

      component.save();

      expect(notificationSpy.showError).toHaveBeenCalledWith('DATASETS._error_type_not_accepted', { details: undefined });
      expect(component.upload.uploading).toBeFalse();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('uploads as private unless another visibility is chosen, with a hint that follows the choice', () => {
      expect(component.datasetForm.value.visibility).toBe('private');
      expect(component.datasetVisibilityHintKey).toBe('DATASETS._visibility_private_hint');
      component.datasetForm.patchValue({ visibility: 'public' });
      expect(component.datasetVisibilityHintKey).toBe('DATASETS._visibility_public_hint');
    });

    it('does not submit without a file', () => {
      component.save();
      expect(datasetSpy.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const res = { id: 'rs-1', name: 'DS', description: 'd', category: 'dataset', lifecycleStatus: 'Launched', resourceSpecCharacteristic: [{ name: 'fileId' }] };

    beforeEach(async () => {
      resSpecSpy.getResSpecById.and.resolveTo(res);
      datasetSpy.get.and.returnValue(of({ id: 'rs-1', name: 'DS', checksum: 'sha256:x', size: 2048, mimeType: 'text/csv', visibility: 'custom' } as Dataset));
      await setup({ mode: 'update' }, 'rs-1');
    });

    it('detects the dataset and loads its file details', () => {
      expect(component.datasetMode).toBeTrue();
      expect(datasetSpy.get).toHaveBeenCalledWith('rs-1');
      expect(component.datasetFormatLabel).toBe('CSV');
      expect(component.datasetSizeLabel).toBe('2.0 KB');
    });

    it('shows the stored visibility, which cannot be changed', () => {
      expect(component.datasetVisibilityLabelKey).toBe('DATASETS._visibility_custom');
      expect(component.datasetVisibilityHintKey).toBe('DATASETS._visibility_custom_hint');
    });

    it('patches only the name and description', () => {
      resSpecSpy.updateResSpec.and.returnValue(of({}));
      component.generalForm.patchValue({ name: ' Renamed ' });

      component.save();

      expect(resSpecSpy.updateResSpec).toHaveBeenCalledWith({ name: 'Renamed', description: 'd' } as any, 'rs-1');
    });

    it('shows the stored file in the drop zone and treats it as no pending file', () => {
      expect(component.replaceForm.value.file).toEqual({ name: '-', url: '', attachmentType: 'text/csv' });
      expect(component.canReplace).toBeFalse();
      expect(component.hasUnsavedChanges()).toBeFalse();

      component.replaceForm.get('file')!.setValue({ file: csv });
      expect(component.canReplace).toBeTrue();
      expect(component.hasUnsavedChanges()).toBeTrue();
    });

    it('does not touch the file when updating without a new one', () => {
      resSpecSpy.updateResSpec.and.returnValue(of({}));
      component.save();
      expect(datasetSpy.replaceFile).not.toHaveBeenCalled();
      expect(resSpecSpy.updateResSpec).toHaveBeenCalled();
    });

    it('replaces a picked file on update and then patches name and description', () => {
      const events = new Subject<any>();
      datasetSpy.replaceFile.and.returnValue(events);
      resSpecSpy.updateResSpec.and.returnValue(of({}));
      component.replaceForm.get('file')!.setValue({ file: csv });

      component.save();
      expect(datasetSpy.replaceFile).toHaveBeenCalledWith('rs-1', csv);
      expect(resSpecSpy.updateResSpec).not.toHaveBeenCalled();

      events.next({ type: HttpEventType.UploadProgress, loaded: 1, total: 2 });
      expect(component.upload.progress).toBe(50);
      events.next(done({ id: 'rs-1', checksum: 'sha256:new' }));

      expect(component.dataset?.checksum).toBe('sha256:new');
      expect(resSpecSpy.updateResSpec).toHaveBeenCalledWith({ name: 'DS', description: 'd' } as any, 'rs-1');
    });

    it('saves nothing else when the new file is refused', () => {
      datasetSpy.replaceFile.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { error: 'bad csv' } })));
      component.replaceForm.get('file')!.setValue({ file: csv });

      component.save();

      expect(notificationSpy.showError).toHaveBeenCalledWith('DATASETS._error_invalid_content', { details: 'bad csv' });
      expect(resSpecSpy.updateResSpec).not.toHaveBeenCalled();
      expect(component.upload.uploading).toBeFalse();
    });

    it('deletes through the dataset endpoint and explains a 409', () => {
      datasetSpy.remove.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'sold by X' } })));
      (component as any).deleteResource();

      expect(resSpecSpy.deleteResSpec).not.toHaveBeenCalled();
      expect(notificationSpy.showError).toHaveBeenCalledWith('DATASETS._error_in_use', { details: 'sold by X' });
    });
  });
});
