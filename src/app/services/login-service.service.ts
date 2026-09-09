import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { finalize, lastValueFrom, Observable, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';
import { components } from "../models/product-catalog";
import { LocalStorageService } from "./local-storage.service";
type ProductOffering = components["schemas"]["ProductOffering"];

@Injectable({
  providedIn: 'root'
})
export class LoginServiceService {
  public static BASE_URL: String = environment.BASE_URL;

  private loginRequest$: Observable<any> | null = null;

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  getLogin(token: any) {
    // Share the in-flight request instead of firing a duplicate one if a
    // call is already pending; the cache is cleared once it settles.
    if (!this.loginRequest$) {
      let url = `${LoginServiceService.BASE_URL}/logintoken`;

      let header = {}

      // Adding the local token options for reading the profile
      // from session when the portal is served from proxy nodejs
      if (token != 'local') {
        header = {
          headers: new HttpHeaders()
            .set('Authorization', `Bearer ` + token)
        }
      }

      this.loginRequest$ = this.http.get<any>(url, header).pipe(
        shareReplay(1),
        finalize(() => { this.loginRequest$ = null; })
      );
    }

    return lastValueFrom(this.loginRequest$);
  }

  doLogin() {
    let url = `${LoginServiceService.BASE_URL}/login`;
    console.log('-- login --')
    this.http
      .get<any>(url, { observe: "response" })
      .subscribe({
        next: (v) => console.log(v),
        error: (e) => console.error(e),
        complete: () => console.info('complete')
      })

  }

  logout() {
    let url = `${LoginServiceService.BASE_URL}/logout`;
    console.log('-- logout --')
    return lastValueFrom(this.http.get<any>(url));
  }
}
