import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxElectronModule } from 'ngx-electron';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { installIcons } from './fontawesome-icons';

import { AppComponent } from './app.component';
import { DropzoneDirective } from '@app/directive/dropzone';
import { DirectoryNameValidatorDirective } from '@app/directive/directory-name';
import { UrlValidatorDirective } from '@app/directive/url';
import { PortValidatorDirective } from '@app/directive/port';
import {
  HeaderComponent,
  FooterComponent,
  ExplorerComponent,
  ModalComponent,
  ProgressBarComponent
} from '@app/component';

installIcons();

@NgModule({
  declarations: [
    AppComponent,
    DropzoneDirective,
    HeaderComponent,
    FooterComponent,
    ExplorerComponent,
    ModalComponent,
    ProgressBarComponent,
    DirectoryNameValidatorDirective,
    UrlValidatorDirective,
    PortValidatorDirective
  ],
  imports: [
    BrowserModule,
    NgxElectronModule,
    FontAwesomeModule,
    BrowserAnimationsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
