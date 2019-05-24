import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { AppService } from '@app/service/app';
import { FileInfo, DirectoryInfo, FileSelection } from '@app/model/app';
import { Subscription } from 'rxjs';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.scss']
})
export class ExplorerComponent implements OnInit, OnDestroy {

  private pathSub: Subscription;
  private selectionSub: Subscription;
  private isWindowFocused: boolean = true;

  @HostListener('body:click')
  public onBodyClick() {

    this.app.deselectAll();

  }

  @HostListener('window:focus')
  public onWindowFocus() {

    this.isWindowFocused = true;

  }

  @HostListener('window:blur')
  public onWindowBlur() {

    this.isWindowFocused = false;

  }

  public currentDir: DirectoryInfo;
  public selection: FileSelection;

  constructor(
    private app: AppService,
    private electron: ElectronService,
    private detector: ChangeDetectorRef
  ) { }

  ngOnInit() {

    this.pathSub = this.app.onPathUpdated.subscribe(dir => {

      this.currentDir = dir;

    });

    this.selectionSub = this.app.onSelectionChanged.subscribe(selection => {

      this.selection = selection;
      this.detector.detectChanges();

    });

    this.electron.ipcRenderer.on('keyboard-shortcut:ctrl+a', () => {

      if ( ! this.currentDir || ! this.isWindowFocused ) return;

      const filenames: string[] = [];

      for ( const child of this.currentDir.children ) {

        if ( child.hasOwnProperty('filename') ) filenames.push((<FileInfo>child).filename);

      }

      this.app.selectFiles(filenames, true);

    });

  }

  public selectChild(event: MouseEvent, filename: string): void {

    event.preventDefault();
    event.stopPropagation();

    if ( ! filename ) return;

    if ( event.ctrlKey ) this.app.negateSelection([filename]);
    else this.app.selectFiles([filename], true);

  }

  public openDir(event: MouseEvent, name: string): void {

    event.preventDefault();
    event.stopPropagation();

    if ( ! name ) return;

    this.app.cd(name)
    .catch(console.error);

  }

  ngOnDestroy() {

    if ( this.pathSub && ! this.pathSub.closed ) this.pathSub.unsubscribe();
    if ( this.selectionSub && ! this.selectionSub.closed ) this.selectionSub.unsubscribe();

  }

}
