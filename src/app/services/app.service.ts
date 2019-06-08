import { Injectable } from '@angular/core';
import { ApiService } from '@app/service/api';
import { IpcService } from '@app/service/ipc';
import { BehaviorSubject, Subject } from 'rxjs';
import { FileInfo, DirectoryInfo, Queue, QueueItem, FileSelection, QueueInfo } from '@app/model/app';
import { AppError } from '@app/common/error';
import { DirectoryInfoResponse, UsersListResponse, MessageResponse, DiskInfoResponse, SearchResultResponse } from '@app/model/api';
import _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  private _currentPath: string = null;
  private _currentDirectoryInfo: DirectoryInfo = null;
  private _downloadQueue: Queue = [];
  private _uploadQueue: Queue = [];
  private _downloading: string = null;
  private _uploading: string = null;
  private _fileSelection: FileSelection = {};

  public onPathUpdated: BehaviorSubject<DirectoryInfo> = new BehaviorSubject(this.currentDirectoryInfo);
  public onAuthChanged: BehaviorSubject<boolean> = new BehaviorSubject(this.authenticated);
  public onSelectionChanged: BehaviorSubject<FileSelection> = new BehaviorSubject(this.fileSelection);
  public onDiskSpaceRecalcNeeded: Subject<void> = new Subject();
  public isWindowFocused: boolean = true;
  public isExplorerFocused: boolean = false;
  public onDownloadQueueUpdated: Subject<QueueInfo> = new Subject();
  public onUploadQueueUpdated: Subject<QueueInfo> = new Subject();
  public serverModalRequested: Subject<void> = new Subject();

  constructor(
    private api: ApiService,
    private ipc: IpcService
  ) {

    this.api.onAuthenticationChanged.subscribe(authenticated => {

      // Navigate to root and get root info
      if ( authenticated ) {

        this.cd('/')
        .catch(console.error);

      }
      else {

        this._currentPath = null;
        this._currentDirectoryInfo = null;

        this.onPathUpdated.next(this.currentDirectoryInfo);

      }

      this.onAuthChanged.next(authenticated);

    });

    this.onPathUpdated.subscribe(() => this.deselectAll());

  }

  private downloadFile(file: QueueItem): void {

    if ( this.api.disabled ) return file.subject.error(new Error('Service is disabled due to server health check!'));

    this.ipc.send('file-download', [file.remote, file.filename, this.api.token], {

      'start': () => {

        console.log(`Downloading file "${file.remote}" to "${file.filename}"`);
        this.onDownloadQueueUpdated.next({
          path: file.remote,
          progress: 0,
          done: false
        });

      },
      'progress': (progress: number) => {

        file.subject.next(Math.floor((progress * 100) / file.size));
        this.onDownloadQueueUpdated.next({
          path: file.remote,
          progress: Math.floor((progress * 100) / file.size),
          done: false
        });

      },
      'done': () => {

        file.subject.complete();
        this.onDownloadQueueUpdated.next({
          path: file.remote,
          progress: 100,
          done: true
        });

      },
      'error': (error: any) => {

        if ( error.code === 'ECONNREFUSED' ) this.api.checkHealth();

        if ( error.status === 401 ) {

          this.api.invalidateAuth();

        }

        file.subject.error(error);
        this.onDownloadQueueUpdated.next({
          path: file.remote,
          progress: 100,
          done: true
        });

      }

    });

  }

  private uploadFile(file: QueueItem): void {

    if ( this.api.disabled ) return file.subject.error(new Error('Service is disabled due to server health check!'));

    this.ipc.send('file-upload', [file.filename, file.size, this.api.token, file.remote], {

      'start': () => {

        console.log(`Uploading file "${file.filename}" to "${file.remote}"`);
        this.onUploadQueueUpdated.next({
          path: file.remote,
          progress: 0,
          done: false
        });

      },
      'progress': (progress: number) => {

        file.subject.next(Math.floor((progress * 100) / file.size));
        this.onUploadQueueUpdated.next({
          path: file.remote,
          progress: ((progress * 100) / file.size),
          done: false
        });

      },
      'done': () => {

        this.onDiskSpaceRecalcNeeded.next();

        file.subject.complete();

        this.onUploadQueueUpdated.next({
          path: file.remote,
          progress: 100,
          done: true
        });

      },
      'error': (error: any) => {

        if ( error.code === 'ECONNREFUSED' ) this.api.checkHealth();

        if ( error.status === 401 ) {

          this.api.invalidateAuth();

        }
        else {

          this.onDiskSpaceRecalcNeeded.next();

        }

        file.subject.error(error);

        this.onUploadQueueUpdated.next({
          path: file.remote,
          progress: 100,
          done: true
        });

      }

    });

  }

  private executeDownloadQueue(): void {

    if ( ! this._downloadQueue.length ) {

      this._downloading = null;
      return;

    }

    const file = this._downloadQueue.shift();

    this._downloading = file.remote;

    const sub = file.subject.subscribe(
      null,
      () => {

        sub.unsubscribe();
        this._downloadQueue = [];
        this._downloading = null;

      }, () => {

        sub.unsubscribe();
        this.executeDownloadQueue();

      }
    );

    this.downloadFile(file);

  }

  private executeUploadQueue(): void {

    if ( ! this._uploadQueue.length ) {

      this._uploading = null;
      return;

    }

    const file = this._uploadQueue.shift();

    this._uploading = file.remote;

    const sub = file.subject.subscribe(
      null,
      () => {

        sub.unsubscribe();
        this._uploadQueue = [];
        this._uploading = null;

      }, () => {

        sub.unsubscribe();
        this.executeUploadQueue();

      }
    );

    this.uploadFile(file);

  }

  private joinPath(filename: string): string {

    return `/${this._currentPath || ''}/${filename}`.replace(/\/+/g, '/');

  }

  public login(username: string, password: string): Promise<void> {

    return this.api.login(username, password);

  }

  public logout(): Promise<void> {

    return this.api.logout();

  }

  public register(username: string, password: string, admin: true): Promise<void> {

    return this.api.register(username, password, admin);

  }

  public deleteUser(username: string): Promise<void> {

    return this.api.deleteUser(username);

  }

  public deleteSelf(): Promise<void> {

    return this.api.deleteSelf();

  }

  public getUsers(): Promise<UsersListResponse> {

    return this.api.getUsers();

  }

  public updatePassword(username: string, newPassword: string): Promise<void> {

    return this.api.updatePassword(username, newPassword);

  }

  public get disabled(): boolean { return this.api.disabled; }
  public get authenticated(): boolean { return this.api.authenticated; }
  public get isAdmin(): boolean { return this.api.isAdmin; }
  public get currentPath(): string { return this._currentPath; }
  public get currentDirectoryInfo(): DirectoryInfo { return _.cloneDeep(this._currentDirectoryInfo); }
  public get fileSelection(): FileSelection { return _.cloneDeep(this._fileSelection); }
  public get isReady(): BehaviorSubject<boolean> { return this.api.isReady; }
  public get currentUploadingRemote(): string { return this._uploading; }

  public deselectAll(): void {

    if ( ! _.keys(this._fileSelection).length ) return;

    this._fileSelection = {};

    this.onSelectionChanged.next(this.fileSelection);

  }

  public selectFiles(filenames: string[], deselectFirst: boolean = false): void {

    if ( deselectFirst ) this._fileSelection = {};

    for ( const filename of filenames ) {

      this._fileSelection[filename] = true;

    }

    this.onSelectionChanged.next(this.fileSelection);

  }

  public deselectFiles(filenames: string[]): void {

    for ( const filename of filenames ) {

      delete this._fileSelection[filename];

    }

    this.onSelectionChanged.next(this.fileSelection);

  }

  public negateSelection(filenames: string[]): void {

    for ( const filename of filenames ) {

      if ( this._fileSelection[filename] ) delete this._fileSelection[filename];
      else this._fileSelection[filename] = true;

    }

    this.onSelectionChanged.next(this.fileSelection);

  }

  public newDirectoryChild(dir: boolean, name: string, size?: number): FileInfo|DirectoryInfo {

    if ( dir ) return {
      name: name,
      path: this.joinPath(name),
      children: []
    };

    return {
      filename: name,
      path: this.joinPath(name),
      size: size,
      created: Date.now(),
      modified: Date.now()
    }

  }

  public addDirectoryChild(child: FileInfo|DirectoryInfo): void {

    this._currentDirectoryInfo.children.push(child);

  }

  public removeDirectoryChild(index: number): void {

    this._currentDirectoryInfo.children.splice(index, 1);

  }

  public showSaveDialog(dir?: boolean): Promise<string> {

    return new Promise((resolve, reject) => {

      this.ipc.send(`save-file${dir?'s':''}`, [], {

        'done': (filename: string) => resolve(filename),
        'error': (error: Error) => reject(error)

      });

    });

  }

  public showOpenDialog(): Promise<string[]> {

    return new Promise((resolve, reject) => {

      this.ipc.send(`open-files`, [], {

        'done': (filenames: string[]) => resolve(filenames),
        'error': (error: Error) => reject(error)

      });

    });

  }

  public download(remote: string, filename: string, size: number): Subject<number> {

    const subject = new Subject<number>();

    if ( _.find(this._downloadQueue, file => file.remote === remote) || this._downloading === remote ) {

      setTimeout(() => {

        subject.error(new AppError('File already in queue!', 'IDENTICAL_FILE'));

      }, 100);

      return subject;

    }

    this._downloadQueue.push({
      remote: remote,
      filename: filename,
      subject: subject,
      size: size
    });

    if ( ! this._downloading ) this.executeDownloadQueue();

    return subject;

  }

  public upload(filename: string, size: number, remote: string): Subject<number> {

    const subject = new Subject<number>();

    if ( _.find(this._uploadQueue, file => file.remote === remote) || this._uploading === remote ) {

      setTimeout(() => {

        subject.error(new AppError('File already in queue!', 'IDENTICAL_FILE'));

      }, 100);

      return subject;

    }

    this._uploadQueue.push({
      remote: remote,
      filename: filename,
      subject: subject,
      size: size
    });

    if ( ! this._uploading ) this.executeUploadQueue();

    return subject;

  }

  public cdAbsolute(path: string): Promise<void> {

    return new Promise((resolve, reject) => {

    path = `/${path}`.replace(/\.\/+/g, '').replace(/\/+/g, '/').replace(/\.$/, '');


      this.api.server<DirectoryInfoResponse>(`/fs${path}`, 'get')
      .then(response => {

        this._currentPath = path;
        this._currentDirectoryInfo = response;

        this.onPathUpdated.next(this.currentDirectoryInfo);

        resolve();

      })
      .catch(reject);

    });

  }

  public cd(dirname: string): Promise<void> {

    return this.cdAbsolute(this.joinPath(dirname));

  }

  public cdBack(): Promise<void> {

    if ( this._currentPath === '/' ) return Promise.reject(new Error('Cannot cd back from root!'));

    return this.cdAbsolute(this._currentPath.replace(/\/+$/, '').replace(/[^\/]+$/, ''));

  }

  public mkdir(dirname: string): Promise<void> {

    return new Promise((resolve, reject) => {

      this.api.server<MessageResponse>(`/fs${this.joinPath(dirname)}`, 'post', { dir: true })
      .then(response => {

        console.log(response.message);
        resolve();

      })
      .catch(reject);

    });

  }

  public rm(path: string): Promise<void> {

    return new Promise((resolve, reject) => {

      this.api.server<MessageResponse>(`/fs${path}`, 'delete')
      .then(response => {

        this.onDiskSpaceRecalcNeeded.next();

        console.log(response.message);
        resolve();

      })
      .catch(reject);

    });

  }

  public disk(): Promise<DiskInfoResponse> {

    return this.api.server<DiskInfoResponse>('/space', 'get');

  }

  public find(query: string): Promise<SearchResultResponse> {

    return this.api.server<SearchResultResponse>('/search', 'get', { query: query });

  }

  public sendNotification(title: string, message: string): void {

    this.ipc.send('notify', [title, message]);

  }

  public toggleDevTools(): void {

    if ( ! this.isAdmin ) return;

    this.ipc.send('toggle-devtools');

  }

  public setServerAddres(url: string, port: number): void {

    this.api.setServerAddress(url, port);

  }

}
