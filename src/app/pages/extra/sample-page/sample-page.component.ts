import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../../services/chat.service';
import { MaterialModule } from '../../../material.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sample-page',
  standalone: true,
  imports: [MaterialModule, CommonModule, FormsModule],
  templateUrl: './sample-page.component.html',
  styleUrls: ['./sample-page.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  registroID!: string;
  message: string = '';
  messages: {
    message: string;
    userId: string;
    nombres: string;
    apellidos: string;
    timestamp: string;
    senderId: string;
  }[] = [];
  userId: string = '1';
  eluserId: string = '1';
  detPedido: string = '';
  estPedido: string = '';
  pedidoId: string = '';
  roomId: string = '';
  userData: { id: number; role: string; username: string; de_nombres: string; de_apellidos: string } | null = null;
  role: string | null = '';
  losnombres: string | null = '';
  losapellidos: string | null = '';

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    this.loadUserData();
  }

  ngOnInit(): void {
    this.userData = this.authService.getUser();
    this.userId = this.userData?.id.toString() || '1';
  
    this.registroID = this.route.snapshot.paramMap.get('id')!;
    this.detPedido = this.route.snapshot.queryParamMap.get('det_pedido')!;
    this.estPedido = this.route.snapshot.queryParamMap.get('est_pedido')!;
    this.pedidoId = this.route.snapshot.queryParamMap.get('pedidoId')!;
    this.eluserId = this.route.snapshot.queryParamMap.get('userId')!;
    this.roomId = this.route.snapshot.queryParamMap.get('roomId')!;
  
    if (!this.roomId) {
      console.error('Room ID es obligatorio');
      return;
    }
  
    this.loadMessages();
    this.chatService.joinRoom(this.registroID);
  
    // Escuchar nuevos mensajes
    this.chatService.receiveMessages().subscribe((message) => {
      console.log('Mensaje recibido desde el socket:', message);
  
      const formattedTimestamp = this.formatTimestamp(new Date());
  
      // Aquí agregamos los nombres y apellidos al mensaje
      this.messages.push({
        ...message,
        nombres: message.nombres || 'Anónimo',
        apellidos: message.apellidos || '',
        senderId: message.userId,
        timestamp: formattedTimestamp,
      });
  
      this.sortMessages();
    });
  }  

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    const chatContainer = this.chatMessages?.nativeElement;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
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

  loadMessages(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token no encontrado');
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http
      .get<{ messages: { message: string; userId: string; nombres: string; apellidos: string; timestamp: string }[] }>(
        `http://192.168.1.119:3000/api/messages/${this.roomId}`,
        { headers }
      )
      .subscribe(
        (response) => {
          console.log('Mensajes cargados desde la API:', response);

          this.messages = response.messages.map((msg) => ({
            ...msg,
            nombres: msg.nombres || 'Anónimo',
            apellidos: msg.apellidos || '',
            senderId: msg.userId,
            timestamp: this.formatTimestamp(new Date(msg.timestamp)),
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

  sendMessage(): void {
    if (this.message.trim()) {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token no encontrado');
        return;
      }
  
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      const localTimestamp = this.formatLocalTimestamp(new Date());
  
      // Asegurarte de que los datos de nombres y apellidos están correctamente asignados
      const nombres = this.losnombres || 'Anónimo';
      const apellidos = this.losapellidos || '';
  
      // Enviar el mensaje a la API
      this.http
        .post(
          'http://192.168.1.119:3000/api/sendMessage',
          {
            roomId: this.roomId,
            message: this.message,
            userId: this.userId,
            nombres: nombres,  // Incluir los nombres
            apellidos: apellidos,  // Incluir los apellidos
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
  
      // Enviar el mensaje a través del socket
      this.chatService.sendMessageToSocket(this.roomId, this.message, this.userId, nombres, apellidos);
    }
  }  

  formatTimestamp(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}:${pad(date.getSeconds())}`;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    this.chatService.leaveRoom(this.registroID);
  }
}
