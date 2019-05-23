import { Injectable } from '@angular/core';
import { ApiService } from '@app/service/api';
import { BehaviorSubject, Subject } from 'rxjs';
import { DirectoryInfo, Queue, QueueItem } from '@app/model/app';
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
  private _downloading: boolean = false;
  private _uploading: boolean = false;

  public onPathUpdated: BehaviorSubject<DirectoryInfo> = new BehaviorSubject(this.currentDirectoryInfo);

  constructor(
    private api: ApiService
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

    });

  }

  private downloadFile(file: QueueItem): void {

    if ( this.api.disabled ) return file.subject.error(new Error('Service is disabled due to server health check!'));

    const progressListener = (event, id: string, progress: number) => {

      if ( id !== file.filename ) return;

      file.subject.next(Math.floor((progress * 100) / file.size));

    };

    const doneListener = (event, id: string) => {

      if ( id !== file.filename ) return;

      this.api.detachListeners('file-upload:progress', progressListener);
      this.api.detachListeners('file-upload:done', doneListener);
      this.api.detachListeners('file-upload:error', errorListener);

      file.subject.complete();

    };

    const errorListener = (event, id: string, error: Error) => {

      if ( id !== file.filename ) return;

      this.api.detachListeners('file-upload:progress', progressListener);
      this.api.detachListeners('file-upload:done', doneListener);
      this.api.detachListeners('file-upload:error', errorListener);

      file.subject.error(error);

    };

    this.api.ipc
    .on('file-download:progress', progressListener)
    .on('file-download:done', doneListener)
    .on('file-download:error', errorListener)
    .send('file-download', file.remote, file.filename, this.api.token);

  }

  private uploadFile(file: QueueItem): void {

    if ( this.api.disabled ) return file.subject.error(new Error('Service is disabled due to server health check!'));

    const progressListener = (event, id: string, progress: number) => {

      if ( id !== file.filename ) return;

      file.subject.next(Math.floor((progress * 100) / file.size));

    };

    const doneListener = (event, id: string) => {

      if ( id !== file.filename ) return;

      this.api.detachListeners('file-upload:progress', progressListener);
      this.api.detachListeners('file-upload:done', doneListener);
      this.api.detachListeners('file-upload:error', errorListener);

      file.subject.complete();

    };

    const errorListener = (event, id: string, error: Error) => {

      if ( id !== file.filename ) return;

      this.api.detachListeners('file-upload:progress', progressListener);
      this.api.detachListeners('file-upload:done', doneListener);
      this.api.detachListeners('file-upload:error', errorListener);

      file.subject.error(error);

    };

    this.api.ipc
    .on('file-upload:progress', progressListener)
    .on('file-upload:done', doneListener)
    .on('file-upload:error', errorListener)
    .send('file-upload', file.filename, file.size, this.api.token, file.remote);

  }

  private executeDownloadQueue(): void {

    if ( ! this._downloadQueue.length ) {

      this._downloading = false;
      return;

    }

    this._downloading = true;

    const file = this._downloadQueue.shift();

    const sub = file.subject.subscribe(null, null, () => {

      sub.unsubscribe();
      this.executeDownloadQueue();

    });

    this.downloadFile(file);

  }

  private executeUploadQueue(): void {

    if ( ! this._uploadQueue.length ) {

      this._uploading = false;
      return;

    }

    this._uploading = true;

    const file = this._uploadQueue.shift();

    const sub = file.subject.subscribe(null, null, () => {

      sub.unsubscribe();
      this.executeUploadQueue();

    });

    this.uploadFile(file);

  }

  private joinPath(filename: string): string {

    return `/${this._currentPath}/${filename}`.replace(/\/+/, '/');

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

  public showSaveDialog(dir?: boolean): Promise<string> {

    return new Promise((resolve, reject) => {

      this.api.ipc
      .once(`save-file${dir?'s':''}:done`, (event, filename: string) => resolve)
      .once(`save-file${dir?'s':''}:error`, (event, error: Error) => reject)
      .send(`save-file${dir?'s':''}`);

    });

  }

  public showOpenDialog(): Promise<string[]> {

    return new Promise((resolve, reject) => {

      this.api.ipc
      .once('open-files:done', (event, filenames: string[]) => resolve)
      .once('open-files:error', (event, error: Error) => reject)
      .send('open-files');

    });

  }

  public download(remote: string, filename: string, size: number): Subject<number> {

    const subject = new Subject<number>();

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

    this._uploadQueue.push({
      remote: remote,
      filename: filename,
      subject: subject,
      size: size
    });

    if ( ! this._uploading ) this.executeUploadQueue();

    return subject;

  }

  public cd(dirname: string): Promise<void> {

    return new Promise((resolve, reject) => {

      this.api.server<DirectoryInfoResponse>(`/fs${this.joinPath(dirname)}`, 'get')
      .then(response => {

        this._currentPath = this.joinPath(dirname);
        this._currentDirectoryInfo = response;

        this.onPathUpdated.next(this.currentDirectoryInfo);

        resolve();

      })
      .catch(reject);

    });

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

}
