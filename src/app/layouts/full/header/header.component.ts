import { Component, Output, EventEmitter, OnInit, OnDestroy, Input, ViewEncapsulation } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { ChatService } from '../../../services/chat.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule, NgScrollbarModule, MaterialModule, MatButtonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  newMessagesCount: number = 0;

  userId: string | null = '';
  role: string | null = '';
  nombres: string | null = '';
  apellidos: string | null = '';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.subscribeToIncomingMessages();
    this.startCheckingUnreadMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga la información del usuario autenticado desde el servicio de autenticación.
   */
  private loadUserData(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userId = user.id;
      this.role = user.role;
      this.nombres = user.de_nombres;
      this.apellidos = user.de_apellidos;
    } else {
      console.error('No se encontró información del usuario autenticado.');
    }
  }

  /**
   * Suscribe al componente para recibir notificaciones de nuevos mensajes entrantes.
   */
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

  /**
   * Inicia un intervalo para verificar periódicamente los mensajes no leídos.
   */
  private startCheckingUnreadMessages(): void {
    if (!this.userId) {
      console.warn('El ID de usuario no está definido. No se iniciará la verificación de mensajes no leídos.');
      return;
    }

    interval(10000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (this.userId) {
            return this.chatService.getUnreadMessages(this.userId);
          } else {
            console.error('El userId es nulo o no está definido');
            return of({ newMessagesCount: 0 }); // Retorna un observable con un valor por defecto
          }
        }),               
        catchError((err) => {
          console.error('Error al verificar mensajes no leídos:', err);
          return []; // Retorna un arreglo vacío si ocurre un error.
        })
      )
      .subscribe({
        next: (response) => {
          this.newMessagesCount = response?.newMessagesCount || 0;
        },
        error: (err) => console.error('Error al actualizar conteo de mensajes no leídos:', err),
      });
  }

  private checkUnreadMessages(): void {
    if (!this.userId) {
      console.error('El ID de usuario no está definido. No se puede verificar mensajes no leídos.');
      return;
    }

    this.chatService.getUnreadMessages(this.userId).subscribe({
      next: (response) => {
        this.newMessagesCount = response?.newMessagesCount || 0;
      },
      error: (err) => {
        console.error('Error al obtener mensajes no leídos:', err);
        this.newMessagesCount = 0;
      },
    });
  }

  /**
   * Cierra la sesión del usuario actual y redirige a la página de inicio de sesión.
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/authentication/login']);
  }
}
