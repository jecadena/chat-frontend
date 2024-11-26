import { Component, Output, EventEmitter, OnInit, OnDestroy, Input, ViewEncapsulation } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { ChatService } from '../../../services/chat.service';

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

  private unreadMessagesInterval: NodeJS.Timeout | null = null; // Aquí cambia el tipo de la variable

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private router: Router
  ) {
    this.loadUserData();
  }

  ngOnInit(): void {
    this.startCheckingUnreadMessages();  // Iniciar el ciclo de verificación de mensajes no leídos
  }

  ngOnDestroy(): void {
    if (this.unreadMessagesInterval) {
      clearInterval(this.unreadMessagesInterval); // Limpiar el intervalo al destruir el componente
    }
  }

  loadUserData(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userId = user.id;
      this.role = user.role;
      this.nombres = user.de_nombres;
      this.apellidos = user.de_apellidos;

      this.chatService.receiveMessages().subscribe({
        next: (message) => {
          if (message.roomId && message.userId === this.userId) {
            this.checkUnreadMessages();  // Verificar mensajes no leídos cuando llegue un nuevo mensaje
          }
        },
        error: (err) => console.error('Error al recibir mensajes:', err),
      });
    }
  }

  startCheckingUnreadMessages(): void {
    if (this.userId) {
      this.unreadMessagesInterval = setInterval(() => {
        this.checkUnreadMessages();
      }, 10000); // Consultar cada 10 segundos
    }
  }

  checkUnreadMessages(): void {
    if (this.userId) {
      this.chatService.getUnreadMessages(this.userId).subscribe({
        next: (response) => {
          this.newMessagesCount = response.newMessagesCount || 0;
        },
        error: (err) => {
          console.error('Error al obtener mensajes no leídos:', err);
          this.newMessagesCount = 0; // Resetear el conteo en caso de error
        },
      });
    } else {
      console.error('El userId no está definido');
    }
  }  

  logout() {
    this.authService.logout();
    this.router.navigate(['/authentication/login']);
  }
}
