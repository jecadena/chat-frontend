import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject, fromEvent } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { environment } from '../environments/environment'; // Ajusta a tu configuración de entorno
import { AuthService } from './auth.service'; // Importa AuthService
import { tap } from 'rxjs/operators';

interface ConnectedUser {
  userId: string;
  nombres: string;
  apellidos: string;
  socketId: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private socket: Socket;
  private apiUrl = environment.apiUrl; // URL API (backend)
  private socketUrl = environment.socketUrl; // URL del servidor de Socket.IO
  private destroy$ = new Subject<void>(); // Para manejar el ciclo de vida de observables
  newMessagesCount: number = 0;

  constructor(private http: HttpClient, private authService: AuthService) {
    // Inicializar la conexión con Socket.IO
    this.socket = io(this.socketUrl, {
      transports: ['websocket'], // Usar exclusivamente WebSocket
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Conectado al servidor Socket.IO');
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor Socket.IO');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Error al conectar con Socket.IO:', err);
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('Advertencia: Token de autenticación no encontrado.');
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token || ''}`);
  }

  private isValidUUID(userId: string): boolean {
    const regex = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
    return regex.test(userId);
  }


  joinRoom(data: { roomId: string; userId: string; nombres: string; apellidos: string; role: string }): void {
    if (!data.roomId) {
      console.warn('El ID de la sala es obligatorio.');
      return;
    }
    console.log('Uniéndose a la sala con datos:', data);
    this.socket.emit('joinRoom', data);
  }  


  leaveRoom(roomId: string, userId: string): void {
    if (!roomId || !userId) {
      console.warn('Room ID y User ID son obligatorios para salir de la sala.');
      return;
    }
    console.log(`Saliendo de la sala: ${roomId}, Usuario: ${userId}`);
    this.socket.emit('leaveRoom', { roomId, userId });
  }
  

  sendMessageToApi(roomId: string, message: string, userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/api/sendMessage`, { roomId, message, userId }, { headers }).pipe(
      catchError((err) => {
        console.error('Error al enviar mensaje a la API:', err);
        return of(null);
      })
    );
  }

  sendMessageToSocket(
    role: string,
    roomId: string,
    message: string,
    userId: string,
    nombres: string,
    apellidos: string
  ): void {
    const payload = {
      role,
      roomId,
      message,
      userId,
      nombres,
      apellidos,
      timestamp: new Date().toISOString(),
    };
    console.log('Enviando mensaje al socket:', payload); 
    this.socket.emit('send_message', payload);
  }
  
  private formatLocalTimestamp(date: Date): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  receiveMessages(): Observable<any> {
    return fromEvent<any>(this.socket, 'receive_message').pipe(
      tap((message) => console.log('Mensaje recibido desde el socket:', message)),
      catchError((err) => {
        console.error('Error al recibir mensajes desde el socket:', err);
        return of(null);
      })
    );
  }  

  private updateUnreadMessages(userId: string): void {
    if (!userId) {
      console.warn('El ID del usuario es obligatorio para actualizar mensajes no leídos.');
      return;
    }

    this.getUnreadMessages(userId).subscribe({
      next: (response) => {
        this.newMessagesCount = response.newMessagesCount || 0;
      },
      error: (err) => {
        console.error('Error al actualizar mensajes no leídos:', err);
        this.newMessagesCount = 0;
      },
    });
  }

  receivePreviousMessages(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('previousMessages', (messages) => observer.next(messages));
      this.socket.on('disconnect', () => observer.complete());
      this.socket.on('connect_error', (err) => observer.error(err));
    });
  }

getUnreadMessages(userId: string): Observable<{ newMessagesCount: number }> {
  console.log("Usuario: ",userId);
  const headers = this.getAuthHeaders();
  if (!userId) {
    console.error('El ID del usuario es obligatorio para consultar mensajes no leídos.');
    return of({ newMessagesCount: 0 }); // Evita hacer la petición si falta el userId
  }
  return this.http.get<{ newMessagesCount: number }>(`${this.apiUrl}/api/unreadMessages/${userId}`, { headers }).pipe(
    catchError((err) => {
      console.error('Error al consultar mensajes no leídos:', err);
      return of({ newMessagesCount: 0 });
    })
  );
}

  listenForErrors(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('errorEvent', (errorData) => observer.next(errorData));
      this.socket.on('disconnect', () => observer.complete());
      this.socket.on('connect_error', (err) => observer.error(err));
    });
  }

  receiveConnectedUsers(): Observable<ConnectedUser[]> {
    return fromEvent<ConnectedUser[]>(this.socket, 'updateUsers').pipe(
      tap((users) => console.log('Usuarios conectados recibidos:', users)),
      catchError((err) => {
        console.error('Error al recibir usuarios conectados:', err);
        return of([]); // Retorna un arreglo vacío en caso de error
      })
    );
  }

  getNotifications(userId: string, role: string): Observable<{ newMessagesCount: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ newMessagesCount: number }>(
        `${this.apiUrl}/api/notifications/${userId}?role=${role}`, 
        { headers }
    ).pipe(
        catchError((err) => {
            console.error('Error al obtener notificaciones:', err);
            return of({ newMessagesCount: 0 });
        })
    );
  }

  getRoomData(roomId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/api/rooms/${roomId}`, { headers }).pipe(
      catchError((err) => {
        console.error('Error al obtener datos de la sala:', err);
        return of(null); // Devuelve null o una estructura adecuada según tu caso
      })
    );
  }
  

  updateNotification(roomId: string, userType: string): Observable<any> {
    const url = `${this.apiUrl}/api/notifications/update`;
    const body = { roomId, userType };

    return this.http.post(url, body, { headers: this.getAuthHeaders() }).pipe(
      tap(() => console.log('Notificación actualizada en el backend')),
      catchError((err) => {
        console.error('Error al actualizar la notificación:', err);
        return of(null);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.socket.disconnect();
  }
}