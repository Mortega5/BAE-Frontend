import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { EventMessageService } from "src/app/services/event-message.service";
import { Category } from "../../models/interfaces";
import { AdminPaths } from '../../pages/admin/admin.paths';

@Component({
  selector: 'categories-recursion-list',
  templateUrl: './categories-recursion-list.component.html',
  styleUrl: './categories-recursion-list.component.css'
})
export class CategoriesRecursionListComponent {
  @Input() child: Category;
  @Input() parent: Category;
  @Input() path: string;

  constructor(
    private router: Router,
    private eventMessage: EventMessageService,
  ) {

  }

  addCategory(cat: any) {
    this.eventMessage.emitCategoryAdded(cat);
  }

  goToUpdate(catId: any) {
    this.router.navigate([AdminPaths.categories.edit(catId)]);
  }

}
