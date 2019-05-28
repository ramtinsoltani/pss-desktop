import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AppService } from '@app/service/app';
import { Subscription } from 'rxjs';
import { FileSelection, FileInfo } from '@app/model/app';
import _ from 'lodash';
import path from 'path';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {

  private diskSub: Subscription;
  private readySub: Subscription;
  private selectionSub: Subscription;

  public freeSpace: number = 0;
  public totalSpace: number = 0;
  public usedSpaceRatio: number = 0;
  public selection: FileSelection = {};
  public selectionCount: number = 0;
  public downloadTitle: string = '';
  public selectionSize: number = 0;

  constructor(
    private app: AppService,
    private detector: ChangeDetectorRef
  ) { }

  private recalcDiskSpace(): void {

    this.app.disk()
    .then(info => {

      this.freeSpace = Math.floor(info.free / (1000 * 1000 * 1000));
      this.totalSpace = Math.floor(info.total / (1000 * 1000 * 1000));
      this.usedSpaceRatio = Math.floor(((info.total - info.free) * 100) / info.total);
      this.detector.detectChanges();

    })
    .catch(console.error);

  }

  ngOnInit() {

    this.diskSub = this.app.onDiskSpaceRecalcNeeded.subscribe(() => this.recalcDiskSpace());

    this.readySub = this.app.isReady.subscribe(ready => {

      if ( ! ready ) return;

      if ( this.readySub && ! this.readySub.closed ) this.readySub.unsubscribe();
      else if ( ! this.readySub ) setTimeout(() => this.readySub.unsubscribe(), 100);

      this.recalcDiskSpace();

    });

    this.selectionSub = this.app.onSelectionChanged.subscribe(selection => {

      this.selection = selection;
      this.selectionCount = _.keys(selection).length;
      this.downloadTitle = this.selectionCount > 1 ? `${this.selectionCount} files` : _.keys(this.selection)[0];
      this.selectionSize = 0;

      if ( this.app.currentDirectoryInfo ) {

        for ( const child of this.app.currentDirectoryInfo.children ) {

          if ( child.hasOwnProperty('filename') && this.selection[(<FileInfo>child).filename] )
            this.selectionSize += (<FileInfo>child).size;

        }

      }

      this.detector.detectChanges();

    });

  }

  public getSelectionSizeLabel(): string {

    let size: number = this.selectionSize;

    if ( size < 1000 ) return `${size} Bytes`;

    size = +(size / 1000).toFixed(2);

    if ( size < 1000 ) return `${size} KB`;

    size = +(size / 1000).toFixed(2);

    if ( size < 1000 ) return `${size} MB`;

    size = +(size / 1000).toFixed(2);

    return `${size} GB`;

  }

  public downloadSelection(event: MouseEvent): void {

    event.preventDefault();
    event.stopPropagation();

    this.app.showSaveDialog(this.selectionCount > 1)
    .then(dirPath => {

      if ( ! dirPath ) return;

      for ( const child of this.app.currentDirectoryInfo.children ) {

        if ( ! child.hasOwnProperty('filename') || ! _.keys(this.selection).includes((<FileInfo>child).filename) ) continue;

        const file: FileInfo = <FileInfo>child;

        const sub = this.app.download(file.path, this.selectionCount > 1 ? path.join(dirPath, file.filename) : dirPath, file.size).subscribe(
          null,
          error => {
            this.app.sendNotification('File download', `File "${file.filename}" has failed to download!`);
            console.error(error);
            sub.unsubscribe();
          },
          () => {
            this.app.sendNotification('File download', `File "${file.filename}" was successfully downloaded.`);
            sub.unsubscribe();
          }
        );

      }

    })
    .catch(console.error);

  }

  ngOnDestroy() {

    if ( this.diskSub && ! this.diskSub.closed ) this.diskSub.unsubscribe();
    if ( this.readySub && ! this.readySub.closed ) this.readySub.unsubscribe();
    if ( this.selectionSub && ! this.selectionSub.closed ) this.selectionSub.unsubscribe();

  }

}
