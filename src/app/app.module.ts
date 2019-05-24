import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { NgxElectronModule } from 'ngx-electron';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { installIcons } from './fontawesome-icons';

import { AppComponent } from './app.component';
import { DropzoneDirective } from '@app/directive/dropzone';
import {
  HeaderComponent,
  FooterComponent,
  ExplorerComponent,
  ModalComponent
} from '@app/component';

installIcons();

@NgModule({
  declarations: [
    AppComponent,
    DropzoneDirective,
    HeaderComponent,
    FooterComponent,
    ExplorerComponent,
    ModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxElectronModule,
    FontAwesomeModule,
    BrowserAnimationsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
