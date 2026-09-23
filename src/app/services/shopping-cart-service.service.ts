import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {BehaviorSubject, lastValueFrom, map} from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class ShoppingCartServiceService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_CART: String = environment.SHOPPING_CART;

  private cartSubject = new BehaviorSubject<any[]>([]); // Contiene los productos del carrito
  cart$ = this.cartSubject.asObservable(); // Observable para que otros componentes se suscriban


  constructor(private http: HttpClient) { }

  /** Every bae-off-card on a listing page checks the cart independently on mount/on
   * every cart event, all within the same tick - dedup concurrent calls into a single
   * HTTP request. Cleared as soon as it settles, so the next call (e.g. after an add/
   * remove) always refetches fresh. */
  private pendingCartRequest: Promise<any[]> | null = null;

  async getShoppingCart(){
    if (this.pendingCartRequest) return this.pendingCartRequest;

    let url = `${ShoppingCartServiceService.BASE_URL}${ShoppingCartServiceService.API_CART}/item/`;
    this.pendingCartRequest = lastValueFrom(this.http.get<any[]>(url))
      .then(cart => {
        this.cartSubject.next(cart); // updates the Subject with the received cart
        return cart;
      })
      .finally(() => this.pendingCartRequest = null);

    return this.pendingCartRequest;
  }
  async addItemShoppingCart(item:any){
    console.log('adding to cart')
    console.log(item)
    //POST - El item va en el body de la petición
    let url = `${ShoppingCartServiceService.BASE_URL}${ShoppingCartServiceService.API_CART}/item/`;

    await lastValueFrom(this.http.post<any>(url, item));
    await this.refreshCart(); // Updates cart after operation
    // return this.http.post<any>(url, item);
  }

  async removeItemShoppingCart(id:any){
    //DELETE
    let url = `${ShoppingCartServiceService.BASE_URL}${ShoppingCartServiceService.API_CART}/item/${id}`;
    await lastValueFrom(this.http.delete<any>(url));
    await this.refreshCart(); // Actualiza el carrito tras la operación

    //return this.http.delete<any>(url);
  }

  async emptyShoppingCart(){
    console.log('removing cart')
    //POST - El item va en el body de la petición
    let url = `${ShoppingCartServiceService.BASE_URL}${ShoppingCartServiceService.API_CART}/empty/`;
    await lastValueFrom(this.http.post<any>(url, {}));
    await this.refreshCart(); // Actualiza el carrito tras la operación
    //return this.http.post<any>(url, {});
  }

  // Refreshes the shopping cart from the API
  private async refreshCart(): Promise<void> {
    const cart = await this.getShoppingCart();
    this.cartSubject.next(cart); // Emits the new cart state
  }
}
