import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AppService } from '@app/service/app';
import { DirectoryInfo } from '@app/model/app';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  private pathSub: Subscription;

  public root: boolean = true;
  public currentPath: string;
  public showDirectoryModal: boolean = false;
  public creatingDirectory: boolean = false;

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
