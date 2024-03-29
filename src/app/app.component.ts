import { Component, ChangeDetectorRef, OnInit, HostListener } from '@angular/core';
import { style, state, animate, transition, trigger } from '@angular/animations';
import { NgForm } from '@angular/forms';
import { AppService } from '@app/service/app';
import { FileInfo } from '@app/model/app';
import { DropzoneEvent, DropzoneFile } from '@app/directive/dropzone';
import path from 'path';
import _ from 'lodash';

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

  private files: DropzoneFile[] = [];

  public currentAuthView: AuthView = AuthView.Login;
  public authView = AuthView;
  public showServerModal: boolean = false;
  public showAuthModal: boolean = false;
  public showOverwriteAlert: boolean = false;
  public loginError: string = null;
  public resetError: string = null;
  public infoMsg: string = null;
  public authenticated: boolean = false;
  public overwrites: FileInfo[] = [];

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
    if ( ! this.app.isWindowFocused || ! this.app.currentDirectoryInfo || ! this.app.isExplorerFocused ) return;

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

      this.authenticated = authenticated;

      this.showAuthModal = ! authenticated;
      this.currentAuthView = AuthView.Login;
      this.detector.detectChanges();

    });

    this.app.serverModalRequested.subscribe(() => {

      this.showServerModal = true;

    });

    this.app.isReady.subscribe(ready => {

      this.showServerModal = ! ready;
      this.detector.detectChanges();

    });

  }

  private uploadFiles(): void {

    const oldCurrentPath = this.app.currentPath;

    for ( const file of this.files ) {

      const sub = this.app.upload(file.path, file.size, path.join(oldCurrentPath, file.filename)).subscribe(
        null,
        error => {
          console.error(error);
          sub.unsubscribe();
          this.refreshAfterFileUploadIfNecessary(path.join(oldCurrentPath, file.filename));
        },
        () => {
          sub.unsubscribe();
          this.refreshAfterFileUploadIfNecessary(path.join(oldCurrentPath, file.filename));
        }
      );

    }

  }

  public onExplorerFocused(): void {

    this.app.isExplorerFocused = true;

  }

  public onExplorerBlurred(): void {

    this.app.isExplorerFocused = false;

  }

  public onOverwriteModalClosed(): void {

    this.showOverwriteAlert = false;
    this.overwrites = [];
    this.files = [];

  }

  public onOverwriteModalConfirmed(): void {

    this.showOverwriteAlert = false;

    const promises: Promise<void>[] = [];

    for ( const overwrite of this.overwrites ) {

      promises.push(this.app.rm(overwrite.path));

    }

    Promise.all(promises)
    .then(() => {

      this.uploadFiles();

    })
    .catch(error => {

      this.app.sendNotification('File Upload', `File upload has failed due to an error with deleting the overwriting files!`);
      console.error(error);

    })
    .finally(() => {

      this.overwrites = [];

    });

  }

  public showResetPassword(): void {

    this.resetError = null;
    this.loginError = null;
    this.infoMsg = null;
    this.currentAuthView = AuthView.Reset;

  }

  public showLogin(): void {

    this.resetError = null;
    this.loginError = null;
    this.infoMsg = null;
    this.currentAuthView = AuthView.Login;

  }

  public login(form: NgForm): void {

    if ( form.invalid ) return;

    this.loginError = null;
    this.infoMsg = null;

    this.app.login(form.value.username, form.value.password)
    .catch(error => {

      this.loginError = error.message;
      console.error(error);

    })
    .finally(() => {

      form.reset();

    });

  }

  public resetPassword(form: NgForm): void {

    if ( form.invalid ) return;

    this.resetError = null;

    this.app.updatePassword(form.value.username, form.value.password, form.value.code)
    .then(() => {

      this.infoMsg = 'Your password was updated.';
      form.reset();
      this.currentAuthView = AuthView.Login;

    })
    .catch(error => {

      this.resetError = error.message;
      console.error(error);
      form.reset();

    })
    .finally(() => this.detector.detectChanges());

  }

  public refreshAfterFileUploadIfNecessary(remote: string): void {

    if ( path.dirname(remote).replace(/\/*$/, '') !== this.app.currentPath.replace(/\/*$/, '') ) return;

    this.app.cd('.')
    .catch(console.error);

  }

  public onFileDrop(files: DropzoneEvent): void {

    if ( ! this.app.authenticated || ! this.app.currentDirectoryInfo ) return;

    const currentChildren = this.app.currentDirectoryInfo.children;

    this.overwrites = [];

    for ( const file of files ) {

      const found = _.find(currentChildren, child => {

        return child.hasOwnProperty('filename') && (<FileInfo>child).filename === file.filename;

      });

      if ( found ) this.overwrites.push(<FileInfo>found);

    }

    this.files = files;

    if ( this.overwrites.length ) this.showOverwriteAlert = true;
    else this.uploadFiles();

  }

  public onServerModalClosed(form: NgForm): void {

    this.showServerModal = false;
    form.reset();

  }

  public onServerModalConfirmed(form: NgForm): void {

    if ( form.invalid ) return;

    const url: string = form.value.url;
    let port: number = form.value.port;

    if ( typeof form.value.port !== 'number' ) {

      port = (new URL(url)).protocol === 'https:' ? 443 : 80;

    }

    this.app.setServerAddress(url, port);
    this.onServerModalClosed(form);


  }

}

enum AuthView {

  Login,
  Reset

}
