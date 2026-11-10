import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { Dataset } from 'src/app/services/dataset.service';
import { NotificationService } from 'src/app/services/notification.service';
import { DatasetUploadTracker } from './dataset-upload-tracker';

describe('DatasetUploadTracker', () => {
  let notifications: jasmine.SpyObj<NotificationService>;
  let tracker: DatasetUploadTracker;
  let events: Subject<any>;
  let onDone: jasmine.Spy;

  beforeEach(() => {
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['showError']);
    tracker = new DatasetUploadTracker(notifications);
    events = new Subject();
    onDone = jasmine.createSpy('onDone');
  });

  it('follows the progress and hands over the dataset when done', () => {
    tracker.start(events, onDone);
    expect(tracker.uploading).toBeTrue();

    events.next({ type: HttpEventType.UploadProgress, loaded: 25, total: 100 });
    expect(tracker.progress).toBe(25);

    events.next(new HttpResponse({ body: { id: 'd1' } as Dataset }));
    expect(tracker.uploading).toBeFalse();
    expect(onDone).toHaveBeenCalledWith({ id: 'd1' } as Dataset);
  });

  it('shows the mapped error and stops', () => {
    tracker.start(events, onDone);
    events.error(new HttpErrorResponse({ status: 422, error: { error: 'bad csv' } }));

    expect(tracker.uploading).toBeFalse();
    expect(notifications.showError).toHaveBeenCalledWith('DATASETS._error_invalid_content', { details: 'bad csv' });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('drops the upload in flight when cancelled or restarted', () => {
    tracker.start(events, onDone);
    tracker.cancel();
    events.next(new HttpResponse({ body: { id: 'late' } as Dataset }));

    expect(tracker.uploading).toBeFalse();
    expect(onDone).not.toHaveBeenCalled();
  });
});
