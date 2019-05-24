import { Component, OnInit, OnDestroy } from '@angular/core';
import { AppService } from '@app/service/app';
import { DirectoryInfo } from '@app/model/app';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.scss']
})
export class ExplorerComponent implements OnInit, OnDestroy {

  private pathSub: Subscription;

  public currentDir: DirectoryInfo;
  public selectedChild: number;

  constructor(
    private app: AppService
  ) { }

  ngOnInit() {

    this.pathSub = this.app.onPathUpdated.subscribe(dir => {

      this.currentDir = dir;

    });

  }

  public selectChild(index: number): void {

    if ( this.selectedChild !== index ) this.selectedChild = index;
    else this.selectedChild = null;

  }

  public openDir(index: number): void {

    if ( ! this.currentDir.children[index].hasOwnProperty('name') ) return;

    this.selectedChild = null;

    this.app.cd((<DirectoryInfo>this.currentDir.children[index]).name)
    .catch(console.error);

  }

  ngOnDestroy() {

    if ( this.pathSub && ! this.pathSub.closed ) this.pathSub.unsubscribe();

  }

}
