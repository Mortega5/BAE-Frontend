import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { Dataset, DatasetService } from 'src/app/services/dataset.service';
import { NotificationService } from 'src/app/services/notification.service';

/** State of one dataset upload (create or replace): progress, completion and the mapped error notification.
 * Every dataset upload form drives its request through one of these instead of repeating the event handling. */
export class DatasetUploadTracker {
  uploading = false;
  progress = 0;

  private request?: Subscription;

  constructor(private notificationService: NotificationService) { }

  /** Runs the request; `onDone` gets the dataset the proxy answered with. A previous one still running is dropped. */
  start(request: Observable<HttpEvent<Dataset>>, onDone: (dataset: Dataset) => void): void {
    this.cancel();
    this.uploading = true;
    this.progress = 0;
    this.request = request.subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.uploading = false;
          onDone(event.body as Dataset);
        }
      },
      error: err => this.fail(err),
    });
  }

  /** Stops the upload in flight, if any. */
  cancel(): void {
    this.request?.unsubscribe();
    this.uploading = false;
  }

  /** Shows the error of a failed dataset request (also used for requests that are not uploads). */
  fail(err: unknown): void {
    this.uploading = false;
    const { key, message } = DatasetService.toError(err);
    this.notificationService.showError(key, { details: message });
  }
}
