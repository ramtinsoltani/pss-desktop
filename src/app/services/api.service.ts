import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { HealthResponse, IPCResponse, TokenResponse, ErrorResponse, MessageResponse } from '@app/model/api';
import { BehaviorSubject, Observable, Observer } from 'rxjs';
import _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private _disabled: boolean = true;
  private _token: string = null;
  private ipc: Electron.IpcRenderer;

  public isReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(! this._disabled);
  public onAuthenticationChanged: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(!! this._token);

  constructor(
    private electron: ElectronService
  ) {

    this.ipc = this.electron.ipcRenderer;

    // Server health listeners
    this.ipc.on('server-api:done', (event, endpoint, response: IPCResponse<HealthResponse>) => {

      if ( endpoint !== '/health' ) return;

      this._disabled = ! response.body.running;
      console.log('Server health:', ! this._disabled)
      this.isReady.next(! this._disabled);

    });

    this.ipc.on('server-api:error', (event, endpoint, error) => {

      if ( endpoint !== '/health' ) return;

      this._disabled = true;
      console.error(error);

    });

    this.checkHealth();

    // Authentication auto renewal
    setInterval(() => {

      if ( ! this._token ) return;

      this.reauthenticate()
      .catch(console.error);

    }, 72000000);

    // Auth state management
    this.onAuthenticationChanged.subscribe(authenticated => {

      if ( authenticated ) localStorage.setItem('lastToken', this._token);
      else localStorage.removeItem('lastToken');

    });

    // Reauthenticate for 24 hours if there's a last token as soon as the service is ready
    const lastToken = localStorage.getItem('lastToken');

    if ( lastToken ) {

      this._token = lastToken;

      const sub = this.isReady.subscribe(ready => {

        if ( ! ready ) return;

        sub.unsubscribe();

        this.reauthenticate()
        .catch(console.error);

      });

    }

  }

  private detachListeners(channel: string, ...listeners: Function[]): void {

    for ( const listener of listeners ) {

      this.ipc.removeListener(channel, listener);

    }

  }

  private server<T>(endpoint: string, method: string, query?: any, body?: any, headers?: any, auth: boolean = true): Promise<T> {

    return new Promise<T>((resolve, reject) => {

      if ( this._disabled ) return reject(new Error('Service is disabled due to server health check!'));

      const doneListener = (event, endpoint: string, response: IPCResponse<T>) => {

        if ( endpoint !== endpoint ) return;

        this.detachListeners('server-api:done', doneListener);
        this.detachListeners('server-api:error', errorListener);

        if ( response.status === 200 ) resolve(response.body);
        else reject(new Error(response.body && (<ErrorResponse><unknown>response.body).error ? `[SERVER ERROR: ${(<ErrorResponse><unknown>response.body).code}] ${(<ErrorResponse><unknown>response.body).message}` : `Server responded with status ${response.status}!`));


      };

      const errorListener = (event, endpoint: string, error: Error) => {

        if ( endpoint !== endpoint ) return;

        this.detachListeners('server-api:done', doneListener);
        this.detachListeners('server-api:error', errorListener);
        reject(error);

      };

      if ( auth ) query = _.assign({ token: this._token }, query || {});

      this.ipc
      .on('server-api:done', doneListener)
      .on('server-api:error', errorListener)
      .send('server-api', endpoint, method, query, body, headers);

    });

  }

  public get disabled(): boolean { return this._disabled; }
  public get authenticated(): boolean { return this._token !== null; }

  public checkHealth(): void {

    this.ipc.send('server-api', '/health');

  }

  public login(username: string, password: string): Promise<void> {

    return new Promise((resolve, reject) => {

      const basic: string = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

      this.server<TokenResponse>('/auth/login', 'post', undefined, undefined, {
        'Authorization': basic
      }, false)
      .then(response => {

        this._token = response.token;
        this.onAuthenticationChanged.next(true);

        resolve();

      })
      .catch(error => {

        this.onAuthenticationChanged.next(false);

        reject(error);

      });

    });

  }

  public reauthenticate(): Promise<void> {

    return new Promise((resolve, reject) => {

      this.server<TokenResponse>('/auth/renew', 'post')
      .then(response => {

        this._token = response.token;
        this.onAuthenticationChanged.next(true);

        resolve();

      })
      .catch(error => {

        this._token = null;
        this.onAuthenticationChanged.next(false);

        reject(error);

      });

    });

  }

  public logout(): Promise<void> {

    return new Promise((resolve, reject) => {

      this.server<MessageResponse>('/auth/logout', 'post')
      .then(response => {

        this._token = null;
        this.onAuthenticationChanged.next(false);

        console.log(response.message);

        resolve();

      })
      .catch(reject);

    });

  }

  public uploadFile(filename: string, size: number, remoteFilename: string): Observable<number> {

    return Observable.create((observer: Observer<number>) => {

      if ( this._disabled ) return observer.error(new Error('Service is disabled due to server health check!'));

      const progressListener = (event, id: string, progress: number) => {

        if ( id !== filename ) return;

        observer.next(progress);

      };

      const doneListener = (event, id: string, response: IPCResponse<any>) => {

        if ( id !== filename ) return;

        this.detachListeners('file-upload:progress', progressListener);
        this.detachListeners('file-upload:done', doneListener);
        this.detachListeners('file-upload:error', errorListener);

        observer.complete();

      };

      const errorListener = (event, id: string, error: Error) => {

        if ( id !== filename ) return;

        this.detachListeners('file-upload:progress', progressListener);
        this.detachListeners('file-upload:done', doneListener);
        this.detachListeners('file-upload:error', errorListener);

        observer.error(error);

      };

      this.ipc
      .on('file-upload:progress', progressListener)
      .on('file-upload:done', doneListener)
      .on('file-upload:error', errorListener)
      .send('file-upload', filename, size, this._token, remoteFilename);

    });

  }

}
