// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://192.168.1.119:3000'; // Cambiar a tu URL real del backend

  constructor(private http: HttpClient) {}

  // Función para loguear al usuario
  login(username: string, password: string): Observable<any> {
    console.log("Usuario: ", username);
    console.log("Clave: ", password);
    const body = { username, password };
    return this.http.post(`${this.apiUrl}/login`, body);
  }

  // Verifica si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  // Obtiene el token JWT desde el localStorage
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Obtiene los datos del usuario desde el localStorage
  getUser(): any {
    console.log("Local Storage: ",localStorage);
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  // Cierra sesión y elimina los datos del usuario y el token
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Almacenar los datos del usuario después de un login exitoso
  setUser(userData: any): void {
    localStorage.setItem('user', JSON.stringify(userData));
  }

  // Añadir el token JWT en los encabezados para las peticiones autenticadas
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      console.warn('Advertencia: Intentando obtener encabezados sin token disponible.');
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token || ''}`);
  }  
}
