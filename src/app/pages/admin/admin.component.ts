import { Component } from '@angular/core';
import { AdminPaths } from './admin.paths';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  readonly paths = AdminPaths;
}
