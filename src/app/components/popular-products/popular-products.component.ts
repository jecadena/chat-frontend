import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import Swal from 'sweetalert2';

export interface Pedido {
  id: string;
  cod_pedido: string;
  det_pedido: string;
  est_pedido: string;
  de_apellidos: string;
  de_nombres: string;
  id_room: string;
  id_user: number;
}

export interface PedidosResponse {
  pedidos: Pedido[];
  message?: string;
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
    RouterModule
  ],
})
export class AppPopularProductsComponent implements OnInit {
  displayedColumns: string[] = ['cod_pedido', 'det_pedido', 'est_pedido', 'eliminar'];
  dataSource: Pedido[] = [];
  nuevoDetallePedido: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchPedidos();
  }

  groupedPedidos: { group: string; pedidos: Pedido[] }[] = [];

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
          if (data.pedidos && data.pedidos.length > 0) {
            // Ordenar y agrupar
            const sortedPedidos = data.pedidos.sort((a, b) =>
              a.de_apellidos.localeCompare(b.de_apellidos) ||
              a.de_nombres.localeCompare(b.de_nombres)
            );

            this.groupedPedidos = sortedPedidos.reduce<{ group: string; pedidos: Pedido[] }[]>((acc, pedido) => {
              const group = `${pedido.de_apellidos} ${pedido.de_nombres}`;
              let groupObj = acc.find(g => g.group === group);
              if (!groupObj) {
                groupObj = { group, pedidos: [] };
                acc.push(groupObj);
              }
              groupObj.pedidos.push(pedido);
              return acc;
            }, []);
            
          } else {
            this.groupedPedidos = [];
            Swal.fire({ /* Configuración del Toast */ });
          }
        },
        (error) => {
          console.error('Error al cargar pedidos:', error.message || error);
          Swal.fire({ /* Configuración del mensaje de error */ });
        }
      );
  }

  onGeneratePedido(form: any) {
    if (!form.value.detPedido) return; // Asegúrate de que el nombre coincida con el del formulario

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.post('http://192.168.1.119:3000/api/pedidos', { det_pedido: form.value.detPedido }, { headers })
      .subscribe(
        (response: any) => {
          console.log('Pedido creado exitosamente', response);
          this.fetchPedidos(); // Recargar la lista de pedidos después de crear uno nuevo
          Swal.fire({
            icon: 'success',
            title: 'Pedido creado exitosamente',
            toast: true,
            position: 'top-end', // Posición en la esquina superior derecha
            showConfirmButton: false, // No muestra el botón de "Aceptar"
            timer: 3000, // Duración del toast en milisegundos (3 segundos)
            timerProgressBar: true, // Muestra una barra de progreso
            customClass: {
              popup: 'bg-info' // Personaliza los colores del fondo y el texto
            }
          });
        },
        (error) => {
          console.error('Error al crear pedido', error);
          Swal.fire({
            icon: 'error',
            title: 'Error al crear el pedido',
            text: error.error?.message || 'Hubo un problema al intentar crear el pedido.',
            confirmButtonText: 'Aceptar'
          });
        }
      );
  }

  // Función para eliminar un pedido
  onDeletePedido(id: string) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Confirmación de eliminación
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este pedido será eliminado permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Llamada al backend para eliminar el pedido
        this.http.delete(`http://192.168.1.119:3000/api/pedidos/${id}`, { headers })
          .subscribe(
            () => {
              Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'El pedido ha sido eliminado.',
                confirmButtonText: 'Aceptar'
              });
              // Recargar los pedidos después de la eliminación
              this.fetchPedidos();
            },
            (error) => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.error?.message || 'Hubo un problema al eliminar el pedido.',
                confirmButtonText: 'Aceptar'
              });
            }
          );
      }
    });
  }
}