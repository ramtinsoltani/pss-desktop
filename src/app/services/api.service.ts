import { Injectable } from '@angular/core';
import {
  HealthResponse,
  ServerResponse,
  TokenResponse,
  ErrorResponse,
  MessageResponse,
  UserResponse,
  UsersListResponse
} from '@app/model/api';
import { BehaviorSubject, Subject } from 'rxjs';
import { IpcService } from '@app/service/ipc';
import _ from 'lodash';
import { AppError } from '@app/common/error';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private _disabled: boolean = true;
  private _token: string = null;
  private _admin: boolean = false;
  private _username: string = null;

  public isReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(! this._disabled);
  public onAuthenticationChanged: Subject<boolean> = new Subject<boolean>();

  constructor(
    private ipc: IpcService
  ) {

    // Server health listeners
    this.ipc.send('server-api', ['/health'], {

      'done': (response: ServerResponse<HealthResponse>) => {

        this._disabled = ! response.body.running;
        console.log('Server health:', ! this._disabled)
        this.isReady.next(! this._disabled);

      },
      'error': (error: Error) => {

        this._disabled = true;
        console.error(error);

      }

    },
    {
      keepOpen: true,
      forceId: 'health-check'
    });

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

    if ( ! lastToken ) return;

    this._token = lastToken;

    const sub = this.isReady.subscribe(ready => {

      if ( ! ready ) return;

      sub.unsubscribe();

      this.reauthenticate()
      .catch(console.error);

    });

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

      if ( auth ) query = _.assign({ token: this._token }, query || {});

      this.ipc.send('server-api', [endpoint, method, query, body, headers], {

        'done': (response: ServerResponse<T>) => {

          if ( response.status === 200 ) resolve(response.body);
          else {

            if ( response.body && (<ErrorResponse><unknown>response.body).error ) {

              const error: ErrorResponse = <ErrorResponse><unknown>response.body;

              reject(new AppError(error.message, error.code));

            }
            else {

              reject(new AppError(`Server responded with status ${response.status}!`, 'SERVER_ERROR'));

            }

          }

        },
        'error': (error: any) => {

          reject(new AppError(error.message, error.code || 'UNKNOWN_ERROR'));

        }

      });

    });

  }

  public get disabled(): boolean { return this._disabled; }
  public get authenticated(): boolean { return this._token !== null; }
  public get isAdmin(): boolean { return this._admin; }
  public get token(): string { return this._token; }

  public checkHealth(): void {

    this.ipc.send('server-api', ['/health'], {}, {
      forceId: 'health-check'
    });

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
