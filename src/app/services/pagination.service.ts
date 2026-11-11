import { Injectable } from '@angular/core';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import { Category } from '../models/interfaces';
import { PageRequest, PageResult } from '../models/pagination.model';
import { components } from "../models/product-catalog";

type ProductOffering = components["schemas"]["ProductOffering"];

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  CATALOG_LIMIT: number = environment.CATALOG_LIMIT;

  constructor(
    private api: ApiServiceService,
    private accountService: AccountServiceService,
    private orderService: ProductOrderService,
    private inventoryService: ProductInventoryServiceService
  ) { }

  async getItemsPaginated(page: number, pageSize: any, next: boolean, items: any[], nextItems: any[], options: any,
    handler: (...params: any[]) => Promise<any>): Promise<any> {

    console.log('options')
    console.log(options)

    try {
      let params: any[] = [page];
      if ("keywords" in options) {
        params.push(options.keywords)
      }

      if ("filters" in options) {
        params.push(options.filters)
      }
      if ("partyId" in options && options.partyId != null) {
        params.push(options.partyId.toString())
      }
      if ("catalogId" in options && options.catalogId != null) {
        params.push(options.catalogId.toString())
      }
      if ("sort" in options) {
        params.push(options.sort)
      }
      if ("isBundle" in options) {
        params.push(options.isBundle)
      }
      if ("selectedDate" in options) {
        params.push(options.selectedDate)
      }
      if ("orders" in options) {
        params.push(options.orders)
      }
      if ("role" in options) {
        params.push(options.role)
      }
      if ("actionFilters" in options) {
        params.push(options.actionFilters)
      }

      if (next == false) {
        items = [];
        nextItems = [];
        page = 0;
        params[0] = page;

        console.log('------ Calling handler')
        console.log(params)
        let data = await handler(...params)
        items = data;
        page = page + pageSize;

      } else {
        for (let i = 0; i < nextItems.length; i++) {
          items.push(nextItems[i])
        }
      }

      params[0] = page;
      let data = await handler(...params)
      nextItems = data;
      page = page + pageSize;

    } catch (err) {
      console.log(err)
    } finally {
      let page_check = nextItems.some(item => item != null);

      let info = {
        "page": page,
        "items": items,
        "nextItems": nextItems,
        "page_check": page_check
      }

      return info
    }
  }

  async getProducts(page: number, keywords: any, filters?: Category[], sort?: any): Promise<ProductOffering[]> {
    try {
      console.log('-------------------------- getProducts ----------------------------');
      // Get data from API
      const productOfferings: ProductOffering[] = filters && filters.length > 0
        ? await this.api.getProductsByCategory(filters, page, keywords, sort)
        : await this.api.getProducts(page, keywords, sort);
      return productOfferings

    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async getProductsByCatalog(page: number, keywords: any, filters?: Category[], id?: any): Promise<ProductOffering[]> {
    try {
      console.log('-------------------------- getProductsByCatalog ----------------------------');
      console.log(page)
      // Get data from API
      const productOfferings: ProductOffering[] = filters && filters.length > 0
        ? await this.api.getProductsByCategoryAndCatalog(filters, id, page)
        : await this.api.getProductsByCatalog(id, page);
      return productOfferings

    } catch (error) {
      console.error('Error fetching products:', error);
      return []; // Returns [] if error
    }
  }

  async getOrders(page: number, filters: Category[], partyId: any, orders: any[], role: any, actionFilters: string[] = []): Promise<any[]> {
    try {
      orders = await this.orderService.getProductOrders(partyId, page, filters, role, actionFilters);
      return await this.enrichOrders(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getOrdersPaged(params: PageRequest, status: string[], partyId: any, role: any, actionFilters: string[] = []): Promise<PageResult<any>> {
    try {
      // The table only needs the billing account (for its name), not the per-item product
      // details, so we enrich just that instead of running the full enrichOrders.
      const { items: orders, total } = await this.orderService.getProductOrdersPaged(params, undefined, status, partyId, role, actionFilters);
      const items = await this.enrichBillingAccounts(orders);
      return { items, total };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return { items: [], total: 0 };
    }
  }

  // The order passed in already went through enrichBillingAccounts as part of the list fetch,
  // so we only need to resolve its product order items here.
  async enrichOrder(order: any): Promise<any> {
    return this.enrichOrderItems(order);
  }

  private async enrichBillingAccounts(orders: any[]): Promise<any[]> {
    const billingAccounts = await Promise.all(orders.map(order => this.accountService.getBillingAccountById(order.billingAccount.id)));
    return orders.map((order, i) => ({ ...order, billingAccount: billingAccounts[i] }));
  }

  private async enrichOrderItems(order: any): Promise<any> {
    const items = await Promise.all(order.productOrderItem.map(async (productOrderItem: any) => {
      try {
        const offer = await this.api.getProductById(productOrderItem.productOffering.id);
        const spec = await this.api.getProductSpecification(offer.productSpecification.id);

        let result: any = {
          id: offer.id,
          name: offer.name,
          category: offer.category,
          description: offer.description,
          lastUpdate: offer.lastUpdate,
          attachment: spec.attachment,
          productSpecification: offer.productSpecification,
          productOfferingTerm: offer.productOfferingTerm,
          version: offer.version,
          productOrderItem
        };

        if (offer.productOfferingPrice?.[0]) {
          const prodprice = await this.api.getProductPrice(offer.productOfferingPrice[0].id);
          result['productOfferingPrice'] = prodprice
          if (prodprice.priceType) result['priceType'] = prodprice.priceType;
        }
        return result;
      } catch (error) {
        console.error(`Error fetching product details for ${productOrderItem.id}:`, error);
        return null; // Manejo de errores sin detener toda la ejecución
      }
    }));

    return {
      ...order,
      productOrderItems: items.filter(Boolean) // Filtra productos nulos en caso de error
    };
  }

  private async enrichOrders(orders: any[]): Promise<any[]> {
    const withBillingAccounts = await this.enrichBillingAccounts(orders);
    return Promise.all(withBillingAccounts.map(order => this.enrichOrderItems(order)));
  }

  async getOffers(inventory: any[]): Promise<any[]> {
    try {
      // Process inventory items concurrently
      const processedInventory = await Promise.all(
        inventory.map(async (item) => {
          const offering = await this.api.getProductById(item.productOffering.id);
          const productSpec = await this.api.getProductSpecification(offering.productSpecification.id);

          // Attachments
          const attachments = productSpec?.attachment ?? [];

          // Construct product object
          item['product'] = {
            id: item.id,
            name: offering.name,
            category: offering.category,
            description: offering.description,
            lastUpdate: offering.lastUpdate,
            attachment: attachments,
            productSpecification: offering.productSpecification,
            productOfferingTerm: offering.productOfferingTerm,
            version: offering.version
          };
          return item;
        })
      );

      return processedInventory;
    } catch (error) {
      console.error("Error fetching offers:", error);
      throw error;
    }
  }

  async getInventory(page: number, keywords: any, filters: Category[], partyId: any): Promise<any[]> {
    try {
      console.log('Fetching inventory...');

      // Obtener inventario desde el servicio
      const data = await this.inventoryService.getInventory(page, partyId, filters, keywords);
      console.log('Inventory received:', data);

      // Obtener ofertas del inventario
      return await this.getOffers(data);

    } catch (error) {
      console.error('Error fetching inventory:', error);
      return []; // Retornar un array vacío en caso de error
    }
  }

  async getInventoryPaged(params: PageRequest, keywords: any, filters: string[], partyId: any): Promise<PageResult<any>> {
    const data = await this.inventoryService.getInventoryPaged(params, partyId, filters, keywords);
    return { items: await this.getOffers(data.items), total: data.total };
  }

}
