import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../../services/chat.service';
import { MaterialModule } from '../../../material.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { Subject, interval, Subscription } from 'rxjs';

import Swal from 'sweetalert2';

interface Document {
  id: number;
  nombre: string;
  id_pedido: string;
  est_pedido: string;
  id_room: string;
}

interface ConnectedUser {
  userId: string;
  nombres: string;
  apellidos: string;
  socketId: string;
}

@Component({
  selector: 'app-sample-page',
  standalone: true,
  imports: [MaterialModule, CommonModule, FormsModule],
  templateUrl: './sample-page.component.html',
  styleUrls: ['./sample-page.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  //@ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('chatMessages', { static: true }) chatMessages!: ElementRef;
  private userScrolled: boolean = false;
  registroID!: string;
  message: string = '';
  messages: {
    message: string;
    userId: string;
    nombres: string;
    apellidos: string;
    timestamp: string;
    senderId: string;
    estado: string;
    showDeleteMenu?: boolean;
  }[] = [];
  userId: string = '1';
  eluserId: string = '1';
  detPedido: string = '';
  estPedido: string = '';
  usuarioSolicitud: string = '';
  roomSolicitud: string = '';
  nu_solicitud: string = '';
  pedidoId: string = '';
  roomId: string = '';
  userData: { id: number; role: string; username: string; de_nombres: string; de_apellidos: string } | null = null;
  role: string | null = '';
  losnombres: string | null = '';
  losapellidos: string | null = '';

  showEmojiPicker: boolean = false;
  emojis: string[] = ['😀', '😂', '😍', '😎', '😢', '😡', '👍', '👎'];


  private notificationCheckSubscription: Subscription | null = null;
  newMessagesCount: number = 0;
  private destroy$ = new Subject<void>();
  private notificationsCheckSubscription: Subscription | null = null;

  connectedUsers: { userId: string; nombres: string; apellidos: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.loadUserData();
    this.loadURL();
  }

  ngOnInit(): void {
    this.userData = this.authService.getUser();
    console.log("Datos: ",this.userData);
    if (!this.userData) {
      console.error('Usuario no autenticado.');
      return;
    }
  
    this.userId = this.userData.id.toString();
    this.roomId = this.route.snapshot.queryParamMap.get('roomId')!;
    if (!this.roomId) {
      console.error('Room ID es obligatorio');
      return;
    }
  
    // Cargar mensajes iniciales
    this.loadMessages();
  
    // Unirse a la sala
    this.chatService.joinRoom({
      roomId: this.roomId,
      userId: this.userId,
      nombres: this.userData?.de_nombres || 'Anónimo',
      apellidos: this.userData?.de_apellidos || '',
      role: this.userData?.role || 'Usuario',
    });
    
    this.chatService.joinRoom({
      roomId: this.roomId,
      userId: this.userId,
      nombres: this.userData?.de_nombres || 'Anónimo',
      apellidos: this.userData?.de_apellidos || '',
      role: this.userData?.role || 'Usuario',
    });
  
    // Escuchar mensajes en tiempo real
    this.chatService.receiveMessages().subscribe((message) => {
      if (message) {
        const formattedTimestamp = this.formatTimestamp(new Date());
        this.messages.push({
          ...message,
          timestamp: formattedTimestamp,
          showDeleteMenu: false,
        });
        this.sortMessages();
        this.scrollToBottom();
        this.cdr.detectChanges();
      }
    });   
  
    // Escuchar usuarios conectados
    this.chatService.receiveConnectedUsers().subscribe((users) => {
      this.connectedUsers = users;
      console.log('Usuarios conectados:', this.connectedUsers);
    });

    this.userData = this.authService.getUser();
    this.startNotificationCheck();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /*scrollToBottom(): void {
    const chatContainer = this.chatMessages?.nativeElement;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }*/

    scrollToBottom(): void {
      const chatContainer = this.chatMessages.nativeElement;
      if (chatContainer && !this.userScrolled) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  
    onScroll(): void {
      const chatContainer = this.chatMessages.nativeElement;
      // Verifica si el usuario ha desplazado el contenedor manualmente
      this.userScrolled = chatContainer.scrollTop < chatContainer.scrollHeight - chatContainer.clientHeight;
    }

  addEmoji(emoji: string) {
    this.message += emoji;
    this.showEmojiPicker = false;
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  loadURL(): void {
    // Recuperar parámetros de la URL
    this.registroID = this.route.snapshot.paramMap.get('cod_pedido')!;
    this.detPedido = this.route.snapshot.queryParamMap.get('det_pedido')!;
    this.estPedido = this.route.snapshot.queryParamMap.get('est_pedido')!;
    this.pedidoId = this.route.snapshot.queryParamMap.get('pedidoId')!;
    this.usuarioSolicitud = this.route.snapshot.queryParamMap.get('userId')!;
    this.roomSolicitud = this.route.snapshot.queryParamMap.get('roomId')!;
    this.nu_solicitud = this.roomSolicitud.substring(10);
    console.log("Room Solicitud: ", this.roomSolicitud);
  }  

  loadUserData(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userId = user.id.toString();
      this.role = user.role;
      this.losnombres = user.de_nombres || 'Anónimo';
      this.losapellidos = user.de_apellidos || '';
      console.log("Nombres", user.de_nombres);  // Para depuración
    }
  }

  sendMessage(): void {
    if (this.message.trim()) {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token no encontrado');
        return;
      }
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      const localTimestamp = this.formatLocalTimestamp(new Date());
      const nombres = this.losnombres || 'Anónimo';
      const apellidos = this.losapellidos || '';
      const role = this.role || '';
  
      this.http
        .post(
          'http://192.168.1.119:3000/api/sendMessage',
          {
            role,
            roomId: this.roomId,
            message: this.message,
            userId: this.userId,
            nombres,
            apellidos,
            estado: 'A',
            timestamp: localTimestamp,
          },
          { headers }
        )
        .subscribe(
          () => {
            this.message = '';
          },
          (error) => {
            console.error('Error al enviar mensaje:', error);
          }
        );
      this.chatService.sendMessageToSocket(role, this.roomId, this.message, this.userId, nombres, apellidos);
    }
    this.scrollToBottom();
  }  

  loadMessages(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token no encontrado');
      return;
    }
  
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
    this.http
      .get<{ messages: { messageId: string, message: string; userId: string; nombres: string; apellidos: string; timestamp: string; estado?: string }[] }>(
        `http://192.168.1.119:3000/api/messages/${this.roomId}`,
        { headers }
      )
      .subscribe(
        (response) => {
          console.log('Mensajes cargados desde la API:', response);
  
          this.messages = response.messages.map((msg) => ({
            ...msg,
            messageId: msg.messageId,
            nombres: msg.nombres || 'Anónimo',
            apellidos: msg.apellidos || '',
            senderId: msg.userId,
            timestamp: this.formatTimestamp(new Date(msg.timestamp)),
            estado: msg.estado || 'A', // Agrega estado predeterminado si no existe en la respuesta
            showDeleteMenu: false, // Inicializa la propiedad opcional
          }));
          this.sortMessages();
        },
        (error) => {
          console.error('Error al cargar mensajes:', error);
        }
      );
  }
  
  sortMessages(): void {
    this.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  formatLocalTimestamp(date: Date): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  formatTimestamp(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}:${pad(date.getSeconds())}`;
  }

  toggleDeleteMenu(msg: any, show: boolean): void {
    msg.showDeleteMenu = show;
  }  

  deleteMessage(msg: any): void {
    // Actualizar el estado del mensaje a 'E' (eliminado)
    msg.estado = 'E';
    console.log("Datos: ",msg.messageId);
    // Actualizar el mensaje en el servidor
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token no encontrado');
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http
      .put(
        `http://192.168.1.119:3000/api/updateMessageStatus/${msg.messageId}`,
        { estado: 'E' },
        { headers }
      )
      .subscribe(
        (response) => {
          // Mostrar "El mensaje fue eliminado"
          msg.message = ''; // Borrar el contenido del mensaje
          console.log('Mensaje eliminado correctamente');
        },
        (error) => {
          console.error('Error al eliminar el mensaje:', error);
        }
      );
  }

  goBack(): void {
    // Emitir evento de salida al backend
    this.chatService.leaveRoom(this.roomId, this.userId);
  
    // Navegar al dashboard
    this.router.navigate(['/dashboard']);
  }
  

  ngOnDestroy(): void {
    this.chatService.leaveRoom(this.registroID, this.userId);
    if (this.notificationCheckSubscription) {
      this.notificationCheckSubscription.unsubscribe();
    }
  }

  private startNotificationCheck(): void {
    this.notificationCheckSubscription = interval(2000).subscribe(() => {
      this.checkAndUpdateNotifications();
    });
  }

  /**
   * Obtiene el roomId desde las rutas o parámetros.
   */
  private getRoomIdFromRoute(): string | null {
    // Lógica para obtener el roomId de las rutas
    return 'room5'; // Reemplaza con la lógica real de tu aplicación
  }

  // Este método se ejecuta cuando se selecciona un archivo
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('id_pedido', this.pedidoId);
  
      const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('token')}`);
  
      this.http.post('http://192.168.1.119:3000/api/uploadDocument', formData, { headers }).subscribe(
        (response: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Documento adjuntado',
            text: `${file.name} se ha cargado correctamente.`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
  
          // Actualiza la lista de documentos adjuntos
          this.loadAttachedDocuments();
        },
        (error) => {
          console.error('Error al cargar archivo:', error);
        }
      );
    }
  }

  checkAndUpdateNotifications(): void {
    console.log("Room ID Notificaciones: ",this.roomId);
    console.log("Rol Notificaciones: ",this.role);
    if (!this.connectedUsers || !this.roomId || !this.userData) return;
    const isUserConnected = this.connectedUsers.some(
      (user) => this.role === 'USER' && this.roomId === this.roomId
    );
    const isAdminConnected = this.connectedUsers.some(
      (user) => this.role === 'ADMIN' && this.roomId === this.roomId
    );
    const userType = this.userData.role;
    if (userType === 'USER' && !isAdminConnected) {
      this.chatService.updateNotification(this.roomId, 'USER').subscribe(() => {
        console.log('Notificación actualizada para USER.');
      });
    } else if (userType === 'ADMIN' && !isUserConnected) {
      this.chatService.updateNotification(this.roomId, 'ADMIN').subscribe(() => {
        console.log('Notificación actualizada para ADMIN.');
      });
    }
  }
 
  updateNotification(userType: string): void {
    this.http
      .post('/api/updateNotification', {
        roomId: this.roomId,
        userType,
      })
      .subscribe(
        () => console.log('Notificación actualizada.'),
        (error) => console.error('Error al actualizar la notificación:', error)
      );
  }  
  
  loadAttachedDocuments(): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('token')}`);
    const pedidoId = this.pedidoId;
  
    this.http
      .get<{ id: number; nombre: string; id_pedido: string }[]>(`http://192.168.1.119:3000/api/documents/${pedidoId}`, {
        headers,
      })
      .subscribe(
        (documents) => {
          const documentosDiv = document.getElementById('documentos');
          if (documents.length > 0 && documentosDiv) {
            documentosDiv.style.display = 'block';
          }
        },
        (error) => {
          console.error('Error al cargar documentos:', error);
        }
      );
  }   
  
  viewDocuments(): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('token')}`);
    const pedidoId = this.pedidoId; // Asegúrate de usar el ID correcto
  
    this.http
      .get<{ id: number; nombre: string; id_pedido: string }[]>(`http://192.168.1.119:3000/api/documents/${pedidoId}`, {
        headers,
      })
      .subscribe(
        (documents) => {
          // Crear las filas de la tabla
          const tableRows = documents.map(doc => {
            // Aquí se construye el enlace del documento
            const documentUrl = `http://192.168.1.119:3000/uploads/${doc.nombre}`; // Cambia esta URL según donde estén almacenados tus documentos
            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${doc.nombre}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  <a href="${documentUrl}" target="_blank" style="color: #007bff; text-decoration: none;">Ver Documento</a>
                </td>
              </tr>
            `;
          }).join('');
  
          // Mostrar la tabla en la ventana de SweetAlert
          Swal.fire({
            title: 'Adjuntos',
            html: `
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="padding: 8px; background-color: #f2f2f2; border: 1px solid #ddd;">Nombre del Documento</th>
                    <th style="padding: 8px; background-color: #f2f2f2; border: 1px solid #ddd;">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            `,
            confirmButtonText: 'Cerrar',
            customClass: {
              // Aquí puedes personalizar solo clases CSS predeterminadas
              popup: 'swal-popup',  // Por ejemplo, puedes agregar una clase para el contenedor
              title: 'swal-title',  // Clase para el título
              htmlContainer: 'swal-content'  // Clase para el contenido
            }
          });
        },
        (error) => {
          console.error('Error al cargar documentos:', error);
        }
      );
  }  

}
