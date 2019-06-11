import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { AppService } from '@app/service/app';
import { DirectoryInfo, FileSelection, QueueInfo } from '@app/model/app';
import { Subscription } from 'rxjs';
import _ from 'lodash';
import path from 'path';

@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.scss']
})
export class ExplorerComponent implements OnInit, OnDestroy {

  private pathSub: Subscription;
  private selectionSub: Subscription;
  private downloadSub: Subscription;
  private uploadSub: Subscription;

  public currentDir: DirectoryInfo;
  public selection: FileSelection;
  public downloadInfo: { [path: string]: QueueInfo } = {};
  public uploadInfo: { [remote: string]: QueueInfo } = {};
  public showInfoModal: boolean = false;
  public infoIndex: number = null;
  public showDeleteAlert: boolean = false;
  public deleting: boolean = false;
  public deletionCount: number = 0;

  @HostListener('window:keydown', ['$event'])
  public onKeyDown(event: KeyboardEvent) {

    if ( event.key !== 'Delete' || this.deleting || ! _.keys(this.selection).length ) return;

    this.deletionCount = _.keys(this.selection).length;
    this.deleting = true;
    this.showDeleteAlert = true;

  }

  constructor(
    private app: AppService,
    private detector: ChangeDetectorRef
  ) { }

  ngOnInit() {

    this.pathSub = this.app.onPathUpdated.subscribe(dir => {

      this.currentDir = dir;
      this.detector.detectChanges();

    });

    this.selectionSub = this.app.onSelectionChanged.subscribe(selection => {

      this.selection = selection;
      this.detector.detectChanges();

    });

    this.downloadSub = this.app.onDownloadQueueUpdated.subscribe(info => {

      if ( ! info.done && (! this.downloadInfo[info.path] || this.downloadInfo[info.path].progress !== info.progress) ) {

        this.downloadInfo[info.path] = info;
        this.detector.detectChanges();

      }
      else if ( info.done ) {

        delete this.downloadInfo[info.path];
        this.detector.detectChanges();

      }

    });

    this.uploadSub = this.app.onUploadQueueUpdated.subscribe(info => {

      if ( ! info.done && (! this.uploadInfo[info.path] || this.uploadInfo[info.path].progress !== info.progress) ) {

        this.uploadInfo[info.path] = info;
        this.detector.detectChanges();

      }
      else if ( info.done ) {

        delete this.uploadInfo[info.path];
        this.detector.detectChanges();

      }

    });

  }

  public currentIncompleteRemote(): string {

    return this.app.currentUploadingRemote;

  }

  public showFileInfo(index: number, event: MouseEvent): void {

    event.preventDefault();
    event.stopPropagation();

    this.infoIndex = index;
    this.showInfoModal = true;

    this.detector.detectChanges();

  }

  public onInfoModalClosed(): void {

    this.showInfoModal = false;
    this.infoIndex = null;

  }

  public onDeleteModalClosed(): void {

    this.showDeleteAlert = false;
    this.deleting = false;

  }

  public onDeleteModalConfirmed(): void {

    this.showDeleteAlert = false;
    const promises: Promise<void>[] = [];
    const currentPathLocked = this.app.currentPath;

    for ( const filename in this.selection ) {

      promises.push(this.app.rm(path.join(this.app.currentPath, filename)));

    }

    Promise.all(promises)
    .then(() => this.app.sendNotification('File Deletion', `${this.deletionCount} file${this.deletionCount > 1 ? 's' : ''} have been successfully deleted.`))
    .catch(error => {

      this.app.sendNotification('File Deletion', 'File deletion failed due to an error!');
      console.error(error);

    })
    .finally(() => {

      this.deleting = false;
      this.refreshAfterFileDeletionIfNecessary(path.join(currentPathLocked, 'dummy.txt'));

    });

  }

  public getSizeLabel(size: number): string {

    if ( size < 1000 ) return `${size} Bytes`;

    size = +(size / 1000).toFixed(2);

    if ( size < 1000 ) return `${size} KB`;

    size = +(size / 1000).toFixed(2);

    if ( size < 1000 ) return `${size} MB`;

    size = +(size / 1000).toFixed(2);

    return `${size} GB`;

  }

  public isDirectory(index: number): boolean {

    return this.currentDir.children[index].hasOwnProperty('name');

  }

  public deletePath(_path: string): void {

    this.onInfoModalClosed();

    this.app.rm(_path)
    .then(() => {

      this.refreshAfterFileDeletionIfNecessary(_path);
      this.app.sendNotification('Path Deletion', `Path "${_path}" was successfully deleted.`);

    })
    .catch(error => {

      this.app.sendNotification('Path Deletion', `Path "${_path}" could not be deleted due to an error!`);
      console.error(error);

    });

  }

  public getUploads(): string[] {

    return _.keys(this.uploadInfo);

  }

  public getFilename(remote: string): string {

    return path.basename(remote);

  }

  public belongsToCurrentDir(remote: string): boolean {

    return path.dirname(remote).replace(/\/*$/, '') === this.app.currentPath.replace(/\/*$/, '');

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

  public getTypeIcon(filename: string): string {

    let extension: any = filename.match(/\.[^\.]+$/);

    if ( ! extension ) return 'file';

    extension = extension[0].toLowerCase();

    switch ( extension ) {

      case '.txt':
      case '.md':
      case '.markdown':
      case '.rtf':
      case '.tex':
      case '.odt':
        return 'file-alt';
      case '.doc':
      case '.docx':
      case '.docm':
        return 'file-word';
      case '.xls':
      case '.xlsx':
      case '.xlsm':
        return 'file-excel';
      case '.ppt':
      case '.pps':
      case '.pptx':
      case '.ppsx':
      case '.pptm':
      case '.ppsm':
        return 'file-powerpoint';
      case '.pdf':
        return 'file-pdf';
      case '.csv':
        return 'file-csv';
      case '.pem':
      case '.key':
      case '.p7b':
      case '.p7c':
      case '.cer':
        return 'file-contract';
      case '.zip':
      case '.rar':
      case '.iso':
      case '.tar':
      case '.gz':
      case '.xz':
      case '.7z':
      case '.apk':
      case '.cab':
      case '.dmg':
      case '.jar':
        return 'file-archive';
      case '.mp4':
      case '.mkv':
      case '.mpeg':
      case '.wmv':
      case '.webm':
      case '.flv':
      case '.vob':
      case '.ogv':
      case '.avi':
      case '.mov':
      case '.m4v':
      case '.mpg':
      case '.3gp':
        return 'file-video';
      case '.aac':
      case '.aiff':
      case '.amr':
      case '.flac':
      case '.m4a':
      case '.mp3':
      case '.ogg':
      case '.wav':
      case '.wma':
        return 'file-audio';
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.png':
      case '.svg':
      case '.bmp':
      case '.ico':
      case '.tiff':
      case '.icns':
        return 'file-image';
      case '.html':
      case '.htm':
      case '.js':
      case '.ts':
      case '.css':
      case '.scss':
      case '.sass':
      case '.less':
      case '.json':
      case '.py':
      case '.cpp':
      case '.h':
      case '.cs':
      case '.vbs':
      case '.go':
      case '.rb':
      case '.php':
      case '.java':
      case '.swift':
      case '.c':
      case '.vb':
      case '.sh':
      case '.xhtml':
      case '.jsp':
      case '.asp':
        return 'file-code';
      default:
        return 'file';

    }

  }

  private refreshAfterFileDeletionIfNecessary(remote: string): void {

    if ( path.dirname(remote).replace(/\/*$/, '') !== this.app.currentPath.replace(/\/*$/, '') ) return;

    this.app.cd('.')
    .catch(console.error);

  }

  ngOnDestroy() {

    if ( this.pathSub && ! this.pathSub.closed ) this.pathSub.unsubscribe();
    if ( this.selectionSub && ! this.selectionSub.closed ) this.selectionSub.unsubscribe();
    if ( this.downloadSub && ! this.downloadSub.closed ) this.downloadSub.unsubscribe();
    if ( this.uploadSub && ! this.uploadSub.closed ) this.uploadSub.unsubscribe();

  }

}
