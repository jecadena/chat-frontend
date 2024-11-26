import { Routes } from '@angular/router';

// Páginas
import { AppIconsComponent } from './icons/icons.component';
import { ChatComponent } from './sample-page/sample-page.component';

export const ExtraRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'icons',
        component: AppIconsComponent,
      },
      {
        path: 'sample-page/:cod_pedido',
        component: ChatComponent,
      },
    ],
  },
];
