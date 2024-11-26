// side-login.component.ts
import { Component } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-side-login',
  standalone: true,
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    CommonModule
  ],
  templateUrl: './side-login.component.html',
})
export class AppSideLoginComponent {
  constructor(private router: Router, private authService: AuthService) {}

  form = new FormGroup({
    uname: new FormControl('', [Validators.required, Validators.minLength(6)]),
    password: new FormControl('', [Validators.required]),
  });

  get f() {
    return this.form.controls;
  }

  submit() {
    if (this.form.invalid) {
      return;
    }
  
    const uname = this.form.value.uname?.trim() || '';
    const password = this.form.value.password?.trim() || '';
  
    this.authService.login(uname, password).subscribe(
      (response) => {
        if (response.success && response.token) {
          try {
            // Almacenar el token y los datos del usuario
            localStorage.setItem('token', response.token);
            this.authService.setUser(response.user);
  
            // Mostrar mensaje de éxito
            Swal.fire({
              title: '¡Bienvenido!',
              text: 'Has iniciado sesión correctamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            }).then(() => {
              this.router.navigate(['/dashboard']); // Redirige tras el login exitoso
            });
          } catch (error) {
            console.error('Error al guardar los datos en localStorage:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo almacenar la sesión. Por favor, intente nuevamente.',
              icon: 'error',
              confirmButtonText: 'Aceptar',
            });
          }
        } else {
          // Muestra error si el login falló
          Swal.fire({
            title: 'Error',
            text: response.error || 'Nombre de usuario o contraseña incorrectos.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
        }
      },
      (error) => {
        console.error('Error al autenticar:', error);
        Swal.fire({
          title: 'Error',
          text: 'Hubo un error en el servidor. Por favor, intente más tarde.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
      }
    );
  }  
}
