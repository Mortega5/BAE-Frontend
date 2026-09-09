import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import {LocalStorageService} from "../services/local-storage.service";
import { EventMessageService } from "../services/event-message.service";
import { LoginInfo } from '../models/interfaces';
import moment from 'moment';
import { environment } from 'src/environments/environment';

export function shouldAttachAuthHeaders(requestUrl: string, internalBaseUrls: string[]): boolean {
    if (!isAbsoluteHttpUrl(requestUrl)) return true;

    return internalBaseUrls
        .filter(isAbsoluteHttpUrl)
        .some(baseUrl => isRequestUnderBaseUrl(requestUrl, baseUrl));
}

@Injectable()
export class RequestInterceptor implements HttpInterceptor {

    public static BASE_URL: String = environment.BASE_URL;
    public static API_ORDERING: String = environment.PRODUCT_ORDER;
    public static ORDER_LIMIT: Number = environment.ORDER_LIMIT;

    constructor(
        private localStorage: LocalStorageService,
        private eventMessage: EventMessageService
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        let aux = this.localStorage.getObject('login_items') as LoginInfo;
        const isLoggedIn = JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0);

        if(isLoggedIn) {
            if (!this.shouldAttachAuthHeaders(request.url)) {
                return next.handle(request);
            }

            const isOrgSession = aux.logged_as != aux.id;
            const isOrderRequest = request.url.startsWith(`${RequestInterceptor.BASE_URL}${RequestInterceptor.API_ORDERING}/productOrder`);

            const headers: Record<string, string> = { 'Authorization': 'Bearer ' + aux.token };
            if (isOrgSession) headers['X-Organization'] = aux.logged_as;
            if (isOrderRequest) headers['X-Terms-Accepted'] = 'true';

            const modifiedRequest = request.clone({ setHeaders: headers });
            return next.handle(modifiedRequest).pipe(
                catchError(error => this.handleAuthError(error))
            );
        } else {
            console.log('not logged')
            return next.handle(request);
        }
    }

    // A 401 on an authenticated request means the session is no longer valid
    // server-side (revoked/expired token); reset it locally and let whoever
    // reacts to 'LoginProcess' (header, refresh loop) pick up the change,
    // instead of silently keep failing while the app still thinks it's logged in.
    private handleAuthError(error: unknown) {
        if (error instanceof HttpErrorResponse && error.status === 401) {
            this.localStorage.setObject('login_items', {});
            this.eventMessage.emitLogin({} as LoginInfo);
        }
        return throwError(() => error);
    }

    private shouldAttachAuthHeaders(requestUrl: string): boolean {
        return shouldAttachAuthHeaders(requestUrl, [
            environment.BASE_URL,
            this.quoteApiBaseUrl(),
        ]);
    }

    private quoteApiBaseUrl(): string {
        const quoteApi = environment.quoteApi;
        if (quoteApi.startsWith('http://') || quoteApi.startsWith('https://')) {
            return quoteApi;
        }
        return `${environment.BASE_URL}${quoteApi}`;
    }
}

function isAbsoluteHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function isRequestUnderBaseUrl(requestUrl: string, baseUrl: string): boolean {
    try {
        const request = new URL(requestUrl);
        const base = new URL(baseUrl);
        const basePath = base.pathname.replace(/\/$/, '');

        return request.origin === base.origin && (
            basePath === '' ||
            request.pathname === basePath ||
            request.pathname.startsWith(`${basePath}/`)
        );
    } catch {
        return false;
    }
}
