import { Component, ChangeDetectorRef, OnInit, HostListener } from '@angular/core';
import { style, state, animate, transition, trigger } from '@angular/animations';
import { NgForm } from '@angular/forms';
import { AppService } from '@app/service/app';
import { FileInfo } from '@app/model/app';
import { DropzoneEvent } from '@app/directive/dropzone';
import path from 'path';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('vsqueeze', [
      state('void', style({
        height: '0px'
      })),
      transition('void <=> *', animate(100))
    ])
  ]
})
export class AppComponent implements OnInit {

  public showLogin: boolean = false;
  public loginError: string = null;

  @HostListener('body:click')
  public onBodyClick() {

    this.app.deselectAll();

  }

  @HostListener('window:focus')
  public onWindowFocus() {

    this.app.isWindowFocused = true;

  }

  @HostListener('window:blur')
  public onWindowBlur() {

    this.app.isWindowFocused = false;

  }

  @HostListener('window:keydown', ['$event'])
  public onKeyDown(event: KeyboardEvent) {

    if ( event.key !== 'a' || ! event.ctrlKey ) return;
    if ( ! this.app.isWindowFocused || ! this.app.currentDirectoryInfo ) return;

    const filenames = [];

    for ( const child of this.app.currentDirectoryInfo.children ) {

      if ( child.hasOwnProperty('filename') ) filenames.push((<FileInfo>child).filename);

    }

    this.app.selectFiles(filenames, true);

  }

  constructor(
    private app: AppService,
    private detector: ChangeDetectorRef
  ) { }

  ngOnInit() {

    this.app.onAuthChanged.subscribe(authenticated => {

      this.showLogin = ! authenticated;
      this.detector.detectChanges();

    });

    this.showLogin = ! this.app.authenticated;

  }

  public login(form: NgForm): void {

    if ( form.invalid ) return;

    this.loginError = null;

    this.app.login(form.value.username, form.value.password)
    .catch(error => {

      this.loginError = error.message;
      console.error(error);

    });

  }

  public refreshAfterFileUploadIfNecessary(remote: string): void {

    if ( path.dirname(remote).replace(/\/*$/, '') !== this.app.currentPath.replace(/\/*$/, '') ) return;

    this.app.cd('.')
    .catch(console.error);

  }

  public onFileDrop(files: DropzoneEvent): void {

    const oldCurrentPath = this.app.currentPath;

    for ( const file of files ) {

      const sub = this.app.upload(file.path, file.size, path.join(oldCurrentPath, file.filename)).subscribe(
        null,
        error => {
          this.app.sendNotification('File upload', `File "${file.filename}" has failed to upload!`);
          console.error(error);
          sub.unsubscribe();
          this.refreshAfterFileUploadIfNecessary(path.join(oldCurrentPath, file.filename));
        },
        () => {
          this.app.sendNotification('File upload', `File "${file.filename}" was successfully uploaded.`);
          sub.unsubscribe();
          this.refreshAfterFileUploadIfNecessary(path.join(oldCurrentPath, file.filename));
        }
      );

    }

  }

}
