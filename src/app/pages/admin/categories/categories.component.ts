import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { components } from "src/app/models/product-catalog";
import { FormField } from 'src/app/models/formFields/form-field.model';
import { fetchAllPages, PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { expandLifecycleStatusFilter, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';
import { AdminPaths } from '../admin.paths';
type Category = components["schemas"]["Category"];

/** A category row: displayName carries its ancestors' path, since the table has no nested rows. */
type CategoryRow = Category & { displayName: string };

@Component({
  selector: 'admin-categories',
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent {
  categoryFilters: FormField[] = [
    {
      name: 'status',
      label: 'OFFERINGS._filter_state',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      defaultValue: ['Active', 'Launched'],
      options: [
        { value: 'Active', label: 'OFFERINGS._active' },
        { value: 'Launched', label: 'OFFERINGS._launched' },
        { value: 'Retired', label: 'OFFERINGS._retired' },
      ],
    },
  ];

  categoryColumns: TableColumn<CategoryRow>[] = [
    {
      header: 'ADMIN._name',
      getValue: (cat) => cat.displayName,
      cellClass: (cat) => this.hasLongWord(cat.displayName, 20) ? 'break-all' : 'break-words',
      width: 'w-2/4',
    },
    {
      header: 'ADMIN._status',
      getValue: (cat) => lifecycleStatusLabel(cat.lifecycleStatus ?? ''),
      type: 'status-badge',
      width: 'w-28',
      getStatus: (cat) => lifecycleStatusBadgeVariant(cat.lifecycleStatus ?? ''),
    },
    {
      header: 'ADMIN._last_update',
      type: 'date',
      getValue: (cat) => cat.lastUpdate,
      width: 'w-40',
    },
  ];

  /** The whole tree, flattened depth-first. Loaded once: the status filter and paging only slice it. */
  private allRows?: Promise<CategoryRow[]>;

  constructor(
    private router: Router,
    private api: ApiServiceService,
  ) {}

  createCategory() {
    this.router.navigate([AdminPaths.categories.new()]);
  }

  goToUpdate(catId: string) {
    this.router.navigate([AdminPaths.categories.edit(catId)]);
  }

  /**
   * The status filter applies per row rather than per subtree, so a matching category
   * still shows (with its full path) under a parent whose own status is filtered out.
   */
  fetchCategories = async (params: PageRequest, filters: Record<string, any>): Promise<PageResult<CategoryRow>> => {
    this.allRows ??= this.loadAllRows();
    let rows: CategoryRow[];
    try {
      rows = await this.allRows;
    } catch (error) {
      this.allRows = undefined;
      throw error;
    }

    const statuses = expandLifecycleStatusFilter((filters['status'] ?? []) as string[]);
    const filtered = statuses.length > 0
      ? rows.filter(row => statuses.includes(row.lifecycleStatus ?? ''))
      : rows;

    return {
      items: filtered.slice(params.offset, params.offset + params.limit),
      total: filtered.length,
    };
  }

  private async loadAllRows(): Promise<CategoryRow[]> {
    const categories: Category[] = await fetchAllPages(params => this.api.getCategoriesPaged(params));
    const byId = new Map(categories.map(cat => [cat.id, cat]));
    const childrenOf = new Map<string, Category[]>();
    const roots: Category[] = [];

    for (const cat of categories) {
      // A child whose parent isn't in the list is shown at the top level instead of being dropped.
      if (cat.isRoot || !cat.parentId || !byId.has(cat.parentId)) {
        roots.push(cat);
      } else {
        const siblings = childrenOf.get(cat.parentId) ?? [];
        siblings.push(cat);
        childrenOf.set(cat.parentId, siblings);
      }
    }

    const byName = (a: Category, b: Category) => (a.name ?? '').localeCompare(b.name ?? '');
    const visited = new Set<string | undefined>();
    const flatten = (nodes: Category[], path: string): CategoryRow[] =>
      [...nodes].sort(byName).flatMap(cat => {
        if (visited.has(cat.id)) return [];
        visited.add(cat.id);
        const displayName = path ? `${path} / ${cat.name}` : cat.name ?? '';
        return [{ ...cat, displayName }, ...flatten(childrenOf.get(cat.id ?? '') ?? [], displayName)];
      });

    return flatten(roots, '');
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
