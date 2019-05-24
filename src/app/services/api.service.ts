import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { HealthResponse, IPCResponse, TokenResponse, ErrorResponse, MessageResponse, UserResponse, UsersListResponse } from '@app/model/api';
import { BehaviorSubject } from 'rxjs';
import _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private _disabled: boolean = true;
  private _token: string = null;
  private _admin: boolean = false;
  private _username: string = null;

  public ipc: Electron.IpcRenderer;
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

  private updateUser(): Promise<void> {

    return new Promise((resolve, reject) => {

      this.server<UserResponse>('/auth/user', 'get')
      .then(user => {

        this._admin = user.admin;
        this._username = user.username;

        resolve();

      })
      .catch(error => {

        this._admin = false;

        console.error(error);
        reject(error);

      });

    });

  }

  public server<T>(endpoint: string, method: string, query?: any, body?: any, headers?: any, auth: boolean = true): Promise<T> {

    return new Promise<T>((resolve, reject) => {

      if ( this._disabled ) return reject(new Error('Service is disabled due to server health check!'));

      const doneListener = (event, id: string, response: IPCResponse<T>) => {

        if ( endpoint !== id ) return;

        this.detachListeners('server-api:done', doneListener);
        this.detachListeners('server-api:error', errorListener);

        if ( response.status === 200 ) resolve(response.body);
        else reject(new Error(response.body && (<ErrorResponse><unknown>response.body).error ? `[SERVER ERROR: ${(<ErrorResponse><unknown>response.body).code}] ${(<ErrorResponse><unknown>response.body).message}` : `Server responded with status ${response.status}!`));


      };

      const errorListener = (event, id: string, error: Error) => {

        if ( endpoint !== id ) return;

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
  public get isAdmin(): boolean { return this._admin; }
  public get token(): string { return this._token; }

  public detachListeners(channel: string, ...listeners: Function[]): void {

    for ( const listener of listeners ) {

      this.ipc.removeListener(channel, listener);

    }

  }

  public checkHealth(): void {

    this.ipc.send('server-api', '/health');

  }

  public login(username: string, password: string): Promise<void> {

    return new Promise((resolve, reject) => {

      if ( this._disabled ) return reject('Service is disabled due to server health check!');

      const basic: string = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

      this.server<TokenResponse>('/auth/login', 'post', undefined, undefined, {
        'Authorization': basic
      }, false)
      .then(response => {

        this._token = response.token;

        return this.updateUser();

      })
      .then(() => {

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

      if ( this._disabled ) return reject('Service is disabled due to server health check!');

      this.server<TokenResponse>('/auth/renew', 'post')
      .then(response => {

        this._token = response.token;

        return this.updateUser();

      })
      .then(() => {

        this.onAuthenticationChanged.next(true);

        resolve();

      })
      .catch(error => {

        this._token = null;
        this._username = null;
        this._admin = false;
        this.onAuthenticationChanged.next(false);

        reject(error);

      });

    });

  }

  public logout(): Promise<void> {

    return new Promise((resolve, reject) => {

      if ( this._disabled ) return reject('Service is disabled due to server health check!');

      this.server<MessageResponse>('/auth/logout', 'post')
      .then(response => {

        this._token = null;
        this._username = null;
        this._admin = false;
        this.onAuthenticationChanged.next(false);

        console.log(response.message);

        resolve();

      })
      .catch(reject);

    });

  }

  public deleteUser(username: string): Promise<void> {

    return new Promise((resolve, reject) => {

      if ( this._disabled ) return reject(new Error('Service is disabled due to server health check!'));
      if ( ! this._admin ) return reject(new Error('This operation requires user to be an admin!'));

      this.server<MessageResponse>('/auth/user', 'delete', null, { username: username })
      .then(response => {

        console.log(response.message);

        if ( username === this._username ) {

          this._token = null;
          this._username = null;
          this._admin = false;

          this.onAuthenticationChanged.next(false);

        }

        resolve();

      })
      .catch(reject);

    });

  }

  public deleteSelf(): Promise<void> {

    return this.deleteUser(this._username);

  }

  public getUsers(): Promise<UsersListResponse> {

    return new Promise((resolve, reject) => {

      if ( this._disabled ) return reject(new Error('Service is disabled due to server health check!'));
      if ( ! this._admin ) return reject(new Error('This operation requires user to be an admin!'));

      this.server<UsersListResponse>('/auth/users', 'get')
      .then(resolve)
      .catch(reject);

    });

  }

  public register(username: string, password: string, admin: boolean): Promise<void> {

    return new Promise((resolve, reject) => {

      if ( this._disabled ) return reject(new Error('Service is disabled due to server health check!'));
      if ( ! this._admin ) return reject(new Error('This operation requires user to be an admin!'));

      this.server<MessageResponse>('/auth/register', 'post', null, {
        username: username,
        password: Buffer.from(password).toString('base64'),
        admin: admin
      })
      .then(response => {

        console.log(response.message);
        resolve();

      })
      .catch(reject);

    });

  }

  public updatePassword(username: string, newPassword: string): Promise<void> {

    return new Promise((resolve, reject) => {

      if ( this._disabled ) return reject(new Error('Service is disabled due to server health check!'));
      if ( ! this._admin ) return reject(new Error('This operation requires user to be an admin!'));

      this.server<MessageResponse>('/auth/user', 'put', null, {
        username: username,
        password: Buffer.from(newPassword).toString('base64')
      })
      .then(response => {

        console.log(response.message);
        resolve();

      })
      .catch(reject);

    });

  }

}
