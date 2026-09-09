import { Injectable } from '@angular/core';
import moment from 'moment';
import {Category, LoginInfo} from "../models/interfaces";
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  // Set a value in local storage
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  // Get a value from local storage
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  // Set an object in local storage
  setObject(key: string, value: object): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Get an object from local storage
  getObject(key: string): object | null {
    return JSON.parse(localStorage.getItem(key) || '{}');
  }

  // Remove a value from local storage
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  // Clear all items from local storage
  clear(): void {
    localStorage.clear();
  }

  addCategoryFilter(value: Category): void {
    const filters = JSON.parse(localStorage.getItem('selected_categories') || '[]');
    const index = filters.findIndex((item:Category) => item.id === value.id);
    if(index === -1) {
      filters.push(value);
      localStorage.setItem('selected_categories', JSON.stringify(filters));
    }
  }

  removeCategoryFilter(value: Category): void {
    const filters = JSON.parse(localStorage.getItem('selected_categories') || '[]') as Category[];
    const index = filters.findIndex((item:Category) => item.id === value.id);
    if(index > -1) {
      filters.splice(index,1);
      localStorage.setItem('selected_categories', JSON.stringify(filters));
    }
  }

  addCartItem(value: ProductOffering): void {
    const products = JSON.parse(localStorage.getItem('cart_items') || '[]');
    const index = products.findIndex((item:ProductOffering) => item.id === value.id);
    if(index === -1) {
      products.push(value);
      localStorage.setItem('cart_items', JSON.stringify(products));
    }
  }

  removeCartItem(value: ProductOffering): void {
    const products = JSON.parse(localStorage.getItem('cart_items') || '[]') as Category[];
    const index = products.findIndex((item:ProductOffering) => item.id === value.id);
    if(index > -1) {
      products.splice(index,1);
      localStorage.setItem('cart_items', JSON.stringify(products));
    }
  }

  addLoginInfo(value: LoginInfo): void {
    localStorage.setItem("login_items", JSON.stringify(value));
  }

  removeLoginInfo(): void {
    localStorage.setItem("login_items", JSON.stringify({}));
  }

  // True when `login_items` holds a non-empty session whose expiry (minus a
  // 4s grace window) hasn't passed. Centralizes a check that used to be
  // hand-copied across ~40 components.
  isLoggedIn(): boolean {
    const aux = this.getObject('login_items') as LoginInfo;
    return JSON.stringify(aux) !== '{}' && ((aux.expire - moment().unix()) - 4) > 0;
  }

  // The current session, or null if not logged in / expired.
  getValidLoginInfo(): LoginInfo | null {
    return this.isLoggedIn() ? (this.getObject('login_items') as LoginInfo) : null;
  }

}