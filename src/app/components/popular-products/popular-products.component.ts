import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MatExpansionModule } from '@angular/material/expansion';

import Swal from 'sweetalert2';

interface Pedido {
  id: string;
  cod_pedido: string;
  det_pedido: string;
  id_user: string;
  est_pedido: string;
  id_room: string;
}

interface Usuario {
  nombre: string;
  pedidos: Pedido[];
}

interface Empresa {
  logo: string;
  usuarios: Record<string, Pedido[]>;
}

interface PedidosResponse {
  empresas: Record<string, Empresa>;
}


@Component({
  selector: 'app-popular-products',
  templateUrl: './popular-products.component.html', 
  styleUrls: ['./popular-products.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    FormsModule,
    RouterModule,
    MatExpansionModule,
  ],
})
export class AppPopularProductsComponent implements OnInit {
  displayedColumns: string[] = ['cod_pedido', 'det_pedido', 'est_pedido', 'eliminar'];
  dataSource: Pedido[] = [];
  nuevoDetallePedido: string = '';
  unreadChats: string[] = [];

  userId: string | null = '';
  role: string | null = '';
  nombres: string | null = '';
  apellidos: string | null = '';

  groupedEmpresas: {
    nombre: string;
    logo: string;
    usuarios: {
      nombre: string;
      pedidos: Pedido[];
    }[];
  }[] = [];

  groupedPedidos: { group: string; pedidos: Pedido[] }[] = [];

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.fetchPedidos();
    this.loadUserData();
  }

  fetchPedidos() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No se encontró un token de autenticación');
      return;
    }
  
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<PedidosResponse>('http://192.168.1.119:3000/api/pedidos/user', { headers })
      .subscribe(
        (data) => {
          if (data.empresas) {
            // Asegurarse de que 'pedidos' se interprete correctamente como un arreglo de 'Pedido'
            this.groupedEmpresas = Object.entries(data.empresas).map(([empresaNombre, empresaData]) => ({
              nombre: empresaNombre,
              logo: empresaData.logo,
              usuarios: Object.entries(empresaData.usuarios).map(([usuarioNombre, usuarioPedidos]) => ({
                nombre: usuarioNombre,
                pedidos: usuarioPedidos as Pedido[], // Asegurarse de que 'usuarioPedidos' es del tipo 'Pedido[]'
              })),
            }));
          } else {
            this.groupedEmpresas = [];
            Swal.fire({
              icon: 'info',
              title: 'Sin datos',
              text: 'No se encontraron empresas con pedidos.',
              toast: true,
              position: 'top-end',
              showConfirmButton: true,
              timer: 3000,
            });
          }
        },
        (error) => {
          console.error('Error al cargar pedidos:', error.message || error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al intentar cargar los pedidos.',
          });
        }
      );
  }   

  onGeneratePedido(form: any) {
    if (!form.value.detPedido) return; 

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.post('http://192.168.1.119:3000/api/pedidos', { det_pedido: form.value.detPedido }, { headers })
      .subscribe(
        (response: any) => {
          console.log('Pedido creado exitosamente', response);
          this.fetchPedidos();
          Swal.fire({
            icon: 'success',
            title: 'Pedido creado exitosamente',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        },
        (error) => {
          console.error('Error al crear pedido', error);
          Swal.fire({
            icon: 'error',
            title: 'Error al crear el pedido',
            text: error.error?.message || 'Hubo un problema al intentar crear el pedido.',
          });
        }
      );
  }

  // Función para eliminar un pedido
  onDeletePedido(id: string) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este pedido será eliminado permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`http://192.168.1.119:3000/api/pedidos/${id}`, { headers })
          .subscribe(
            () => {
              Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'El pedido ha sido eliminado.',
              });
              this.fetchPedidos();
            },
            (error) => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.error?.message || 'Hubo un problema al eliminar el pedido.',
              });
            }
          );
      }
    });
  }

  getChatStyle(chatId: string): string {
    return this.unreadChats.includes(chatId) ? 'primary' : 'gray';
  }

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
}