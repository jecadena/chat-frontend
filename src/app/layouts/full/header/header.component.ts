import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { ChatService } from '../../../services/chat.service';
import { Subject, interval, Subscription, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';

export interface NotificationResponse {
  newMessagesCount: number;
  solicitudes?: Array<{
    id: number;
    cod_pedido: string;
    det_pedido: string;
    id_user: string;
    est_pedido: string;
    id_room: string;
  }>;
}

export interface Pedido {
  cod_pedido: string;
  det_pedido: string;
  id_user: number;
  est_pedido: string;
  id: number;
  id_room: number;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    NgScrollbarModule,
    MaterialModule,
    MatButtonModule,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  notifications: Array<any> = [];
  isNotificationPanelVisible: boolean = false;

  newMessagesCount: number = 0;

  userId: string | null = '';
  role: string | null = '';
  nombres: string | null = '';
  apellidos: string | null = '';

  private destroy$ = new Subject<void>();
  private notificationsCheckSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.subscribeToIncomingMessages();
    this.startCheckingNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCheckingNotifications();
  }

  private loadUserData(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userId = user.id;
      this.role = user.role;
      this.nombres = user.de_nombres;
      this.apellidos = user.de_apellidos;

      if (this.role === 'USER' && this.userId) {
        this.checkNotifications();
      }
    } else {
      console.error('No se encontró información del usuario autenticado.');
    }
  }

  navigateToPedido(pedido: Pedido) {
    const urlTree = this.router.createUrlTree(['/extra/sample-page', pedido.cod_pedido], {
      queryParams: {
        cod_pedido: pedido.cod_pedido,
        det_pedido: pedido.det_pedido,
        userId: pedido.id_user,
        est_pedido: pedido.est_pedido,
        pedidoId: pedido.id,
        roomId: pedido.id_room,
      },
    });
    const url = this.router.serializeUrl(urlTree);
    window.location.href = url;
  }

  private checkNotifications(): void {
    if (this.userId && this.role) {
      this.chatService.getNotifications(this.userId, this.role).subscribe({
        next: (response: NotificationResponse) => {
          this.newMessagesCount = response.newMessagesCount;
          this.notifications = response.solicitudes || []; // Almacena las notificaciones

          // Maneja el evento de clic en las notificaciones
          this.notifications.forEach((pedido) => {
            // Asumiendo que cada `pedido` es un objeto del tipo `Pedido`
            pedido.onClick = () => this.navigateToPedido(pedido);
          });

          if (this.newMessagesCount === 0) {
            this.hideBadge();
          }
        },
        error: (err) => {
          console.error('Error al obtener las notificaciones:', err);
          this.newMessagesCount = 0;
        },
      });
    } else {
      console.warn('User ID o role son null. No se pueden verificar las notificaciones.');
      this.newMessagesCount = 0;
    }
  }

  toggleNotificationPanel(): void {
    this.isNotificationPanelVisible = !this.isNotificationPanelVisible;
  }

  private startCheckingNotifications(): void {
    if (!this.userId || !this.role) {
      console.warn(
        'El ID de usuario o el role no están definidos. No se iniciará la verificación de notificaciones.'
      );
      return;
    }

    this.notificationsCheckSubscription = interval(3000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          return this.chatService.getNotifications(
            this.userId as string,
            this.role as string
          );
        }),
        catchError((err) => {
          console.error('Error al verificar notificaciones:', err);
          return of({ newMessagesCount: 0, solicitudes: [] }); // Proveer estructura válida
        })
      )
      .subscribe({
        next: (response: NotificationResponse) => {
          this.newMessagesCount = response.newMessagesCount;
          this.notifications = response.solicitudes || [];

          if (this.newMessagesCount === 0) {
            this.hideBadge();
          }
        },
        error: (err) => console.error('Error al actualizar conteo de mensajes no leídos:', err),
      });
  }

  private stopCheckingNotifications(): void {
    if (this.notificationsCheckSubscription) {
      this.notificationsCheckSubscription.unsubscribe();
      this.notificationsCheckSubscription = null;
    }
  }

  private hideBadge(): void {
    this.newMessagesCount = 0;
  }

  private subscribeToIncomingMessages(): void {
    if (!this.userId) {
      console.warn('El ID de usuario no está definido. No se puede suscribir a mensajes entrantes.');
      return;
    }

    this.chatService
      .receiveMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          if (message.roomId && message.userId === this.userId) {
            this.checkUnreadMessages();
          }
        },
        error: (err) => console.error('Error al recibir mensajes entrantes:', err),
      });
  }

  private checkUnreadMessages(): void {
    if (!this.userId) {
      console.error('El ID de usuario no está definido. No se puede verificar mensajes no leídos.');
      return;
    }

    this.chatService.getUnreadMessages(this.userId).subscribe({
      next: (response: NotificationResponse) => {
        this.newMessagesCount = response?.newMessagesCount || 0;
      },
      error: (err) => {
        console.error('Error al obtener mensajes no leídos:', err);
        this.newMessagesCount = 0;
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/authentication/login']);
  }
}
