import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';
import { AuthGuard } from '../guards/auth.guard'; // Importa el AuthGuard

export const PagesRoutes: Routes = [
  {
    path: '',
    component: StarterComponent,
    canActivate: [AuthGuard],  // Protege la ruta con el AuthGuard
    data: {
      title: 'Solicitudes',
      urls: [
        { title: 'Dashboard', url: '/dashboard' },
        { title: 'Solicitudes' },
      ],
    },
  },
];
