import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { faCircle } from "@fortawesome/pro-regular-svg-icons";
import { faCircleCheck } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from "rxjs";
import { takeUntil } from 'rxjs/operators';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { iconForCategory } from '../../data/categoryIcons';
import { Category } from "../../models/interfaces";
import { EventMessageService } from "../../services/event-message.service";
import { LocalStorageService } from "../../services/local-storage.service";

@Component({
  selector: 'bae-categories-filter',
  templateUrl: './categories-filter.component.html',
  styleUrl: './categories-filter.component.css'
})
export class CategoriesFilterComponent implements OnInit, OnDestroy, OnChanges {

  classListFirst = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-content-muted border border-b-0 border-line rounded-t-xl focus:ring-4 focus:ring-focus hover:bg-surface-muted gap-3';
  classListLast = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-content-muted border border-line focus:ring-4 focus:ring-focus hover:bg-surface-muted gap-3';
  classList = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-content-muted border border-b-0 border-line focus:ring-4 focus:ring-focus hover:bg-surface-muted gap-3';

  classListFirstChecked = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-content-muted border border-2 border-primary-50 rounded-t-xl focus:ring-4 focus:ring-focus dark:border-primary-50 hover:bg-surface-muted gap-3';
  classListLastChecked = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-content-muted border border-2 border-primary-50 focus:ring-4 focus:ring-focus dark:border-primary-50 hover:bg-surface-muted gap-3';
  classListChecked = 'flex items-center justify-between w-full p-5 font-medium rtl:text-right text-content-muted border border-2 border-primary-50 focus:ring-4 focus:ring-focus dark:border-primary-50 hover:bg-surface-muted gap-3';

  labelClass: string = "text-content-muted bg-surface border-2 rounded-lg cursor-pointer border-line peer-checked:border-primary-50 hover:text-content-secondary dark:peer-checked:bg-primary-50 dark:peer-checked:text-secondary-100 peer-checked:text-content-secondary hover:bg-surface-muted dark:bg-tertiary-100 dark:hover:bg-primary-50";
  categories: Category[] = [];
  checkedCategories: any[] = [];
  selected: Category[] = [];
  dismissSubject: Subject<any> = new Subject();
  catalog: any;
  cs: Category[] = [];
  @Output() selectedCategories = new EventEmitter<Category[]>();
  @Input() catalogId: any = undefined;
  @Input() showTitle: boolean = true;
  @Input() simpleMode: boolean = false;
  @Input() selectedRootId: string | null | undefined = undefined;
  @Input() selectedRootName: string | null | undefined = undefined;

  get allFilterItems(): Category[] {
    const result: Category[] = [];
    const collect = (cats: Category[]) => {
      for (const cat of cats) {
        if (cat.children && cat.children.length > 0) {
          collect(cat.children);
        } else {
          result.push(cat);
        }
      }
    };
    collect(this.categories);
    return result;
  }

  protected readonly faCircleCheck = faCircleCheck;
  protected readonly faCircle = faCircle;
  protected readonly iconForCategory = iconForCategory;

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef
  ) {
    this.categories = [];
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        const cat = ev.value as Category;
        if (ev.type === 'AddedFilter' && !this.isCheckedCategory(cat)) {
          this.checkedCategories.push(cat.id);
          this.cdr.detectChanges();
        } else if (ev.type === 'RemovedFilter' && this.isCheckedCategory(cat)) {
          const index = this.checkedCategories.findIndex(item => item === cat.id);
          if (index !== -1) {
            this.checkedCategories.splice(index, 1);
            this.cdr.detectChanges();
          }
        }
      })
  }

  async ngOnInit() {
    this.selected = this.localStorage.getObject('selected_categories') as Category[] || [];
    for (let i = 0; i < this.selected.length; i++) {
      this.checkedCategories.push(this.selected[i].id)
    }

    await this.loadCatalogCategories();
    this.cdr.detectChanges();
    initFlowbite();
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  findChildren(parent: any, data: any[]) {
    let childs = data.filter((p => p.parentId === parent.id));
    parent["children"] = childs;
    if (parent.isRoot == true) {
      this.categories.push(parent)
    } else {
      this.saveChildren(this.categories, parent)
    }
    if (childs.length != 0) {
      for (let i = 0; i < childs.length; i++) {
        this.findChildren(childs[i], data)
      }
    }
  }

  saveChildren(superCategories: any[], parent: any) {
    for (let i = 0; i < superCategories.length; i++) {
      let children = superCategories[i].children;
      if (children != undefined) {
        let check = children.find((element: { id: any; }) => element.id == parent.id)
        if (check != undefined) {
          let idx = children.findIndex((element: { id: any; }) => element.id == parent.id)
          children[idx] = parent
          superCategories[i].children = children
        }
        this.saveChildren(children, parent)
      }
    }
  }

  notifyDismiss(cat: Category) {
    this.dismissSubject.next(cat);
    this.removeCategory(cat);
  }

  addCategory(cat: Category) {
    const index = this.selected.indexOf(cat, 0);
    if (index == -1) {
      this.selected.push(cat);
      this.checkedCategories.push(cat.id);
      this.selectedCategories.emit(this.selected);
      this.localStorage.setObject('selected_categories', this.selected);
      this.eventMessage.emitAddedFilter(cat);
      this.eventMessage.emitFiltersCommitted();
    }
  }

  removeCategory(cat: Category) {
    const index = this.selected.indexOf(cat, 0);
    if (index > -1) {
      this.selected.splice(index, 1);
      this.selectedCategories.emit(this.selected);
      this.localStorage.setObject('selected_categories', this.selected);
      this.eventMessage.emitRemovedFilter(cat);
      const checkId = this.checkedCategories.findIndex(item => item === cat.id);
      if (checkId !== -1) {
        this.checkedCategories.splice(checkId, 1);
      }
      this.eventMessage.emitFiltersCommitted();
    }
  }

  isRoot(cat: Category, idx: any) {
    const index = this.categories.indexOf(cat, 0);
    let children = this.categories[index].children;

    if (children != undefined && children.length > 0) {
      return children
    } else {
      return []
    }

  }

  onClick(cat: Category) {
    if (!this.isCheckedCategory(cat)) {
      this.checkedCategories.push(cat.id);
      this.localStorage.addCategoryFilter(cat);
      this.eventMessage.emitAddedFilter(cat);
    } else {
      this.localStorage.removeCategoryFilter(cat);
      this.eventMessage.emitRemovedFilter(cat);
      const index = this.checkedCategories.findIndex(item => item === cat.id);
      if (index !== -1) {
        this.checkedCategories.splice(index, 1);
      }
    }
    if (this.selectedRootId) {
      this.syncParentFilterForSimpleMode();
    }
    this.eventMessage.emitFiltersCommitted();
  }

  private syncParentFilterForSimpleMode(): void {
    const rootId = this.selectedRootId;
    if (!rootId) {
      return;
    }

    const selected = this.localStorage.getObject('selected_categories') as Category[] || [];
    const selectableChildIds = new Set(
      this.allFilterItems
        .map(item => item?.id)
        .filter((id): id is string => !!id)
    );
    const hasSelectedChildren = selected.some(item => !!item?.id && selectableChildIds.has(item.id));
    const parentInStorage = selected.find(item => item?.id === rootId);

    if (hasSelectedChildren) {
      if (parentInStorage) {
        this.localStorage.removeCategoryFilter(parentInStorage);
        this.eventMessage.emitRemovedFilter(parentInStorage);
      }
      return;
    }

    if (!parentInStorage) {
      const parentFilter: Category = {
        id: rootId,
        name: this.selectedRootName || 'Category'
      };
      this.localStorage.addCategoryFilter(parentFilter);
      this.eventMessage.emitAddedFilter(parentFilter);
    }
  }

  isCheckedCategory(cat: Category) {
    const index = this.checkedCategories.findIndex(item => item === cat.id);
    if (index !== -1) {
      return true
    } else {
      return false
    }
  }

  isChildsChecked(childs: Category[] | undefined): boolean {
    let check = false
    if (childs != undefined) {
      for (let i = 0; i < childs.length; i++) {
        if (this.isCheckedCategory(childs[i])) {
          check = true
          return check;
        } else {
          check = this.isChildsChecked(childs[i].children)
          if (check == true) {
            return check;
          }
        }
      }
    }
    return check
  }

  checkClasses(first: boolean, last: boolean, cat: Category) {
    let categoryCheck = this.isChildsChecked(cat.children);
    if (last == true) {
      if (categoryCheck) {
        return this.classListLastChecked
      } else {
        return this.classListLast
      }
    } else if (first == true) {
      if (categoryCheck) {
        return this.classListFirstChecked
      } else {
        return this.classListFirst
      }
    } else {
      if (categoryCheck) {
        return this.classListChecked
      } else {
        return this.classList
      }
    }
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  private async loadCatalogCategories(): Promise<void> {
    this.categories = [];

    if (this.selectedRootId) {
      const children = await this.api.getCategoriesByParentId(this.selectedRootId).catch(() => []);
      this.categories = Array.isArray(children) ? children : [];
      return;
    }

    const hasCatalogId = this.catalogId !== undefined && this.catalogId !== null && String(this.catalogId).trim() !== '';

    if (hasCatalogId) {
      const data = await this.api.getCatalog(this.catalogId).catch(() => null);
      const catalogCategoryRefs: any[] = Array.isArray(data?.category) ? data.category : [];
      if (catalogCategoryRefs.length > 0) {
        const rootTrees = await Promise.all(
          catalogCategoryRefs.map(async (categoryRef: any) => {
            if (!categoryRef?.id) {
              return null;
            }
            const rootCategory = await this.api.getCategoryById(categoryRef.id).catch(() => null);
            const parentId = rootCategory?.parentId ? String(rootCategory.parentId) : '';
            const isStrictRoot = !!rootCategory?.id && rootCategory.isRoot === true && !parentId;
            if (!isStrictRoot) {
              return null;
            }
            return this.loadCategorySubtree(rootCategory);
          })
        );
        this.categories = rootTrees.filter((root): root is Category => root !== null);
        return;
      }
    }

    const launched = await this.api.getLaunchedCategories();
    const launchedList = Array.isArray(launched) ? launched : [];
    for (const category of launchedList) {
      this.findChildren(category, launchedList);
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    const rootChange = changes['selectedRootId'];
    if (rootChange && !rootChange.firstChange) {
      await this.loadCatalogCategories();
      this.cdr.detectChanges();
      initFlowbite();
    }
  }

  private async loadCategorySubtree(parent: any): Promise<Category> {
    const children = await this.api.getCategoriesByParentId(parent.id).catch(() => []);
    const childList = Array.isArray(children) ? children : [];
    const resolvedChildren = await Promise.all(
      childList.map((child: any) => this.loadCategorySubtree(child))
    );

    return {
      ...parent,
      children: resolvedChildren
    };
  }

}
