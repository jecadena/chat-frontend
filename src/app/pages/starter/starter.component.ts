import { Component, ViewEncapsulation } from '@angular/core';
import { MaterialModule } from '../../material.module';
import { AppPopularProductsComponent } from 'src/app/components/popular-products/popular-products.component';
import { RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-starter',
  standalone: true,
  imports: [
    MaterialModule,
    AppPopularProductsComponent,
    RouterModule
  ],
  templateUrl: './starter.component.html',
  styleUrls: ['./starter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class StarterComponent {}
