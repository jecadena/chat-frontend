import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment'; // Ajusta a tu configuración de entorno
import { AuthService } from './auth.service'; // Importa AuthService

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private socket: Socket;
  private apiUrl = environment.apiUrl; // URL API (backend)
  private socketUrl = environment.socketUrl; // URL del servidor de Socket.IO

  newMessagesCount: number = 0;

  constructor(private http: HttpClient, private authService: AuthService) {
    // Conexión con Socket.IO en el backend
    this.socket = io(this.socketUrl, {
      transports: ['websocket'], // Asegura que se use WebSocket
    });

    // Verifica cuando la conexión sea exitosa
    this.socket.on('connect', () => {
      console.log('Conectado al servidor Socket.IO');
    });

    // Error al conectar
    this.socket.on('connect_error', (err) => {
      console.log('Error al conectar con Socket.IO:', err);
    });

    // Manejo de desconexión
    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor Socket.IO');
    });
  }

  // Obtener encabezados con el token para peticiones HTTP
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('Advertencia: Token de autenticación no encontrado.');
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token || ''}`);
  }

  // Validar si el userId es un UUID
  private isValidUUID(userId: string): boolean {
    const regex = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
    return regex.test(userId);
  }

  // Unirse a una sala
  joinRoom(roomId: string): void {
    console.log(`Usuario uniéndose a la sala ${roomId}`);
    this.socket.emit('joinRoom', roomId);
  }

  // Salir de una sala
  leaveRoom(roomId: string): void {
    console.log(`Usuario saliendo de la sala ${roomId}`);
    this.socket.emit('leaveRoom', roomId);
  }

  // Enviar mensaje a la base de datos (API)
  sendMessageToApi(roomId: string, message: string, userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/api/sendMessage`, { roomId, message, userId }, { headers });
  }

  // Enviar mensaje a través de Socket.IO
  sendMessageToSocket(roomId: string, message: string, userId: string, nombres: string, apellidos: string): void {
    const payload = {
      roomId,
      message,
      userId,
      nombres, // Incluir los nombres
      apellidos, // Incluir los apellidos
      timestamp: new Date().toISOString(), // O el formato que prefieras
    };
    this.socket.emit('message', payload);
  }

  // Formatear la fecha local
  private formatLocalTimestamp(date: Date): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Recibir mensajes de la sala en tiempo real
receiveMessages(): Observable<any> {
  return new Observable((observer) => {
    this.socket.on('newMessage', (message) => {
      observer.next(message); // Emitir el mensaje recibido
      // Al recibir un nuevo mensaje, actualizar los mensajes no leídos
      this.checkUnreadMessages(message.userId);
    });

    this.socket.on('disconnect', () => {
      observer.complete();
    });

    this.socket.on('connect_error', (err) => {
      observer.error(err);
    });
  });
}

// Lógica para actualizar los mensajes no leídos
private checkUnreadMessages(userId: string): void {
  this.getUnreadMessages(userId).subscribe({
    next: (response) => {
      this.newMessagesCount = response.newMessagesCount || 0;
    },
    error: (err) => {
      console.error('Error al obtener mensajes no leídos:', err);
      this.newMessagesCount = 0; // Resetear el conteo en caso de error
    },
  });
}

  // Recibir mensajes anteriores de la sala cuando el usuario se une
  receivePreviousMessages(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('previousMessages', (messages) => {
        observer.next(messages); // Emitir los mensajes anteriores
      });

      this.socket.on('disconnect', () => {
        observer.complete();
      });

      this.socket.on('connect_error', (err) => {
        observer.error(err);
      });
    });
  }

  // Consultar mensajes no leídos
getUnreadMessages(userId: string): Observable<any> {
  // Convertir el userId a un número (si no es válido, tratarlo como inválido)
  const userIdNum = Number(userId);

  if (isNaN(userIdNum)) {
    console.error('ID de usuario no válido:', userId);
    return of({ newMessagesCount: 0 }); // Retorna 0 si el ID no es válido
  }

  const token = this.authService.getToken(); // Obtener el token desde AuthService

  if (!token) {
    console.warn('Advertencia: Token de autenticación no encontrado.');
    return of({ newMessagesCount: 0 }); // Devolver un valor predeterminado si no hay token
  }

  const headers = this.getAuthHeaders(); // Usar los encabezados de autenticación
  return this.http.get(`${this.apiUrl}/api/unreadMessages/${userIdNum}`, { headers }).pipe(
    catchError((err) => {
      console.error('Error al obtener mensajes no leídos:', err);
      return of({ newMessagesCount: 0 }); // Retornar 0 en caso de error
    })
  );
}


  // Escuchar eventos de error en tiempo real desde el servidor WebSocket
  listenForErrors(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('errorEvent', (errorData) => {
        observer.next(errorData); // Emitir el error recibido
      });

      this.socket.on('disconnect', () => {
        observer.complete();
      });

      this.socket.on('connect_error', (err) => {
        observer.error(err);
      });
    });
  }
}
