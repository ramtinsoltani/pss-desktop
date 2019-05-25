import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AppService } from '@app/service/app';
import { DirectoryInfo, FileSelection } from '@app/model/app';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.scss']
})
export class ExplorerComponent implements OnInit, OnDestroy {

  private pathSub: Subscription;
  private selectionSub: Subscription;

  public currentDir: DirectoryInfo;
  public selection: FileSelection;

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

  ngOnDestroy() {

    if ( this.pathSub && ! this.pathSub.closed ) this.pathSub.unsubscribe();
    if ( this.selectionSub && ! this.selectionSub.closed ) this.selectionSub.unsubscribe();

  }

}
