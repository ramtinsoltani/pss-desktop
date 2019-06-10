import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { style, state, animate, transition, trigger } from '@angular/animations';
import { NgForm } from '@angular/forms';
import { AppService } from '@app/service/app';
import { DirectoryInfo } from '@app/model/app';
import { UserResponse } from '@app/model/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  animations: [
    trigger('vsqueeze', [
      state('void', style({
        height: '0px'
      })),
      transition('void <=> *', animate(100))
    ])
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {

  private pathSub: Subscription;

  public root: boolean = true;
  public currentPath: string;
  public showDirectoryModal: boolean = false;
  public creatingDirectory: boolean = false;
  public showAccountModal: boolean = false;
  public users: UserResponse[] = [];
  public accessCode: string = null;
  public currentAccountView: AccountView = AccountView.Self;
  public accountView = AccountView;
  public newError: string = null;

  constructor(
    private app: AppService,
    private detector: ChangeDetectorRef
  ) { }

  ngOnInit() {

    this.pathSub = this.app.onPathUpdated.subscribe(() => {

      this.currentPath = this.app.currentPath;
      this.root = this.currentPath === '/';
      this.detector.detectChanges();

    });

  }

  public logout(): void {

    this.app.logout()
    .catch(console.error);

  }

  public onCreateAccount(form: NgForm): void {

    if ( form.invalid ) return;

    this.newError = null;

    this.app.register(form.value.username, form.value.password, false)
    .then(() => this.app.getUsers())
    .then(users => this.users = users)
    .then(() => this.currentAccountView = AccountView.Others)
    .catch(error => {

      this.newError = error.message;
      console.error(error);

    })
    .finally(() => {

      form.reset();
      this.detector.detectChanges();

    });

  }

  public promoteUser(username: string): void {

    this.app.promoteUser(username)
    .then(() => this.app.getUsers())
    .then(users => this.users = users)
    .catch(console.error)
    .finally(() => this.detector.detectChanges());

  }

  public deleteUser(username: string): void {

    this.app.deleteUser(username)
    .then(() => this.app.getUsers())
    .then(users => this.users = users)
    .catch(console.error)
    .finally(() => this.detector.detectChanges());

  }

  public generateUserCode(username: string): void {

    this.app.getAccessCode(username)
    .then(code => this.accessCode = code)
    .catch(console.error)
    .finally(() => this.detector.detectChanges());

  }

  public onDeleteAccount(form: NgForm): void {

    if ( form.invalid ) return;

    this.app.deleteSelf()
    .then(() => console.log('Account deleted successfully.'))
    .catch(console.error)
    .finally(() => form.reset());

  }

  public toggleSelfView(): void {

    this.currentAccountView = this.currentAccountView === AccountView.Self ? AccountView.Others : AccountView.Self;
    this.accessCode = null;
    this.newError = null;

    if ( this.currentAccountView === AccountView.Others ) {

      this.app.getUsers()
      .then(users => this.users = users)
      .catch(console.error)
      .finally(() => this.detector.detectChanges());

    }

  }

  public toggleNewUserView(): void {

    this.currentAccountView = this.currentAccountView === AccountView.Others ? AccountView.New : AccountView.Others;
    this.accessCode = null;
    this.newError = null;

    if ( this.currentAccountView === AccountView.Others ) {

      this.app.getUsers()
      .then(users => this.users = users)
      .catch(console.error)
      .finally(() => this.detector.detectChanges());

    }

  }

  public onShowAccount(): void {

    this.currentAccountView = AccountView.Self;
    this.showAccountModal = true;
    this.accessCode = null;
    this.newError = null;

  }

  public onAccountModalClosed(): void {

    this.showAccountModal = false;

  }

  public onServerChange(): void {

    this.app.serverModalRequested.next();

  }

  public toggleDevTools(): void {

    this.app.toggleDevTools();

  }

  public isAdmin(): boolean {

    return this.app.isAdmin;

  }

  public onRefresh(): void {

    this.app.cd('.')
    .catch(error => console.error);

  }

  public onMakeDirectory(): void {

    if ( ! this.app.authenticated || ! this.app.currentDirectoryInfo ) return;

    this.showDirectoryModal = true;

  }

  public onDirectoryModalClosed(form: NgForm): void {

    form.reset();
    this.showDirectoryModal = false;

  }

  public onDirectoryModalConfirmed(form: NgForm): void {

    if ( form.invalid ) return;

    const children = this.app.currentDirectoryInfo.children;

    for ( const child of children ) {

      if ( child.hasOwnProperty('name') && (<DirectoryInfo>child).name === form.value.name.trim() ) {

        this.app.sendNotification('New Directory', 'Cannot create an identical directory!');
        return;

      }

    }

    this.creatingDirectory = true;

    this.app.mkdir(form.value.name)
    .then(() => {

      return this.app.cd('.');

    })
    .catch(error => {

      this.app.sendNotification('New Directory', 'Could not create new directory due to an error!');
      console.error(error);

    })
    .finally(() => {

      form.reset();
      this.showDirectoryModal = false;
      this.creatingDirectory = false;

    });

  }

  public cdBack(): void {

    if ( this.root ) return;

    this.app.cdBack()
    .catch(console.error);

  }

  ngOnDestroy() {

    if ( this.pathSub && ! this.pathSub.closed ) this.pathSub.unsubscribe();

  }

}

enum AccountView {

  Self,
  Others,
  New

}
