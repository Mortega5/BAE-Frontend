import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import {LocalStorageService} from "../services/local-storage.service";
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  constructor(private localStorage: LocalStorageService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const requiredRoles = route.data['roles'] as Array<string>;

    if (!this.hasAnyRole(requiredRoles)) {
      this.router.navigate(['/dashboard']);  // Navigate to an access denied page or login page
      return false;
    }

    return true;
  }

  /**
   * Same check canActivate runs, exposed so views can hide links to routes
   * the current session couldn't open anyway. `requiredRoles` uses the route
   * data keys ('admin', 'seller', ...); an empty list only requires a valid session.
   */
  hasAnyRole(requiredRoles: readonly string[]): boolean {
    const userRoles = this.resolveUserRoles();
    if (!userRoles) {
      return false;
    }

    if (requiredRoles.length == 0) {
      return true;
    }

    const roleMapper:any = {
      'admin': environment.ADMIN_ROLE.toLowerCase(),
      'seller': environment.SELLER_ROLE.toLowerCase(),
      'buyer': environment.BUYER_ROLE.toLowerCase(),
      'orgAdmin': environment.ORG_ADMIN_ROLE.toLowerCase(),
      'certifier': environment.CERTIFIER_ROLE.toLowerCase(),
      'individual': 'individual'
    }

    return requiredRoles.some((role: any) => userRoles.includes(roleMapper[role]));
  }

  /** Lowercased role names of the active session, or null when there's no usable session. */
  private resolveUserRoles(): string[] | null {
    const aux = this.localStorage.getValidLoginInfo();
    if (!aux) {
      return null;
    }

    let userRoles: string[] = [];

    if(aux.logged_as == aux.id){
      userRoles.push('individual')
      aux.roles.forEach((role: any) => userRoles.push(role.name.toLowerCase()))
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      if (!loggedOrg) {
        return null;
      }
      loggedOrg.roles.forEach((role: any) => userRoles.push(role.name.toLowerCase()))

      if(aux.roles.some(role => role.name.toLowerCase() === environment.ADMIN_ROLE.toLowerCase())){
        userRoles.push(environment.ADMIN_ROLE.toLowerCase())
      }
    }

    return userRoles;
  }
}
