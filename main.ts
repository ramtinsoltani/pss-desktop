import { app, BrowserWindow, Menu, ipcMain, dialog, Notification, WebContents } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import request from 'request';
import config from './app.config.json';
import { Subject } from 'rxjs';

interface IPCResponse {

  data: any[];
  state: string;
  close: boolean;

}

interface IPCEvent {

  sender: WebContents;

}

interface WebContentsEx extends WebContents {

  send: (channel: string, response: IPCResponse) => void;

}

interface FileCancel {

  type: string; // 'upload', 'download', 'any'
  remote: string;

}

class AppError extends Error {

  constructor(message: string, public code: string) {

    super(message);

    const actualProto = new.target.prototype;

    if ( Object.setPrototypeOf ) Object.setPrototypeOf(this, actualProto);
    else (this as any).__proto__ = actualProto;

  }

}

class ElectronApp {

  private window: BrowserWindow;
  private onCancel: Subject<FileCancel> = new Subject();
  private disableDevtools: boolean = true;
  private userServerUrl: string = null;
  private userPort: number = null;

  constructor(private config: any) {

    this.init();

  }

  private createWindow(): void {

    this.window = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 500,
      minHeight: 350,
      backgroundColor: '#FFFFFF',
      icon: path.join(__dirname, 'favicon.ico'),
      webPreferences: {
        nodeIntegration: true
      }
    });

    this.window.loadURL(`file://${path.join(__dirname, 'index.html')}`);
    this.window.on('closed', () => { this.window = null; });

  }

  private init(): void {

    app.setAppUserModelId(process.execPath);

    // Create window on electron init
    app.on('ready', () => {

      Menu.setApplicationMenu(null);

      app.on('browser-window-created', (e, window) => {

        // Remove the default menu and disable dev tools
        window.setMenu(null);

        window.webContents.on('devtools-opened', () => {

          if ( this.disableDevtools ) window.webContents.closeDevTools();

        });

      });

      this.defineIPCs();
      this.createWindow();

    });

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {

      this.onCancel.next({
        type: 'any',
        remote: null
      });

      // On macOS specific close process
      if ( process.platform !== 'darwin' ) app.quit();

    });

    app.on('activate', () => {

      // macOS specific close process
      if ( this.window === null ) this.createWindow();

    });

  }

  private defineIPCs(): void {

    // Dialog for opening files (used for file upload)
    ipcMain.on('open-files', (event: IPCEvent, id: string) => {

      this.showOpenFilesDialog()
      .then(filenames => {

        event.sender.send(`open-files:${id}`, {
          data: [filenames],
          state: 'done',
          close: true
        });

      })
      .catch(error => {

        event.sender.send(`open-files:${id}`, {
          data: [error],
          state: 'error',
          close: true
        });

      });

    });

    // Dialog for saving file (used for file download)
    ipcMain.on('save-file', (event: IPCEvent, id: string) => {

      this.showSaveFileDialog()
      .then(filename => {

        event.sender.send(`save-file:${id}`, {
          data: [filename],
          state: 'done',
          close: true
        });

      })
      .catch(error => {

        event.sender.send(`save-file:${id}`, {
          data: [error],
          state: 'error',
          close: true
        });

      });

    });

    // Dialog for saving multiple files (used for files selection download)
    ipcMain.on('save-files', (event: IPCEvent, id: string) => {

      this.showSaveFilesDialog()
      .then(filename => {

        event.sender.send(`save-files:${id}`, {
          data: [filename],
          state: 'done',
          close: true
        });

      })
      .catch(error => {

        event.sender.send(`save-files:${id}`, {
          data: [error],
          state: 'error',
          close: true
        });

      });

    });

    // For showing notifications
    ipcMain.on('notify', (event: IPCEvent, id: string, title: string, message: string) => {

      this.showNotification(title, message);

    });

    // For general server API usage
    ipcMain.on('server-api', (event: IPCEvent, id: string, endpoint: string, method: string, query: any, body: any, headers: any) => {

      this.serverAPI(endpoint, method, query, body, headers)
      .then(response => {

        event.sender.send(`server-api:${id}`, {
          data: [response],
          state: 'done',
          close: true
        });

      })
      .catch(error => {

        event.sender.send(`server-api:${id}`, {
          data: [error],
          state: 'error',
          close: true
        });

      });

    });

    // For file upload
    ipcMain.on('file-upload', (event: IPCEvent, id: string, filename: string, size: number, token: string, remoteFilename: string) => {

      event.sender.send(`file-upload:${id}`, {
        data: [],
        state: 'start',
        close: false
      });

      this.uploadFile(filename, size, token, remoteFilename, event.sender, id)
      .then(response => {

        if ( ! event.sender.isDestroyed() ) event.sender.send(`file-upload:${id}`, {
          data: [response],
          state: 'done',
          close: true
        });

      })
      .catch(error => {

        if ( ! event.sender.isDestroyed() ) event.sender.send(`file-upload:${id}`, {
          data: [error],
          state: 'error',
          close: true
        });

      });

    });

    // For file download
    ipcMain.on('file-download', (event: IPCEvent, id: string, remoteFilename: string, filename: string, token: string) => {

      event.sender.send(`file-download:${id}`, {
        data: [],
        state: 'start',
        close: false
      });

      this.downloadFile(remoteFilename, filename, token, event.sender, id)
      .then(response => {

        if ( ! event.sender.isDestroyed() ) event.sender.send(`file-download:${id}`, {
          data: [response],
          state: 'done',
          close: true
        });

      })
      .catch(error => {

        if ( ! event.sender.isDestroyed() ) event.sender.send(`file-download:${id}`, {
          data: [error],
          state: 'error',
          close: true
        });

      })

    });

    // For toggling dev tools
    ipcMain.on('toggle-devtools', () => {

      this.disableDevtools = false;
      this.window.webContents.toggleDevTools();

    });

    // For setting user-defined server address
    ipcMain.on('change-server', (event: IPCEvent, id: string, url: string, port: number) => {

      this.userServerUrl = url;
      this.userPort = port;

    });

    // For cancelling download/upload operations
    ipcMain.on('file-cancel', (event: IPCEvent, id: string, type: string, remote: string) => {

      this.onCancel.next({
        type: type,
        remote: remote
      });

    });

  }

  private showNotification(title: string, message: string): void {

    if ( ! Notification.isSupported() ) return console.error('Notifications are not supported!');

    const notification = new Notification({
      title: title,
      body: message
    });

    notification.show();

  }

  private showSaveFilesDialog(): Promise<string> {

    return new Promise((resolve, reject) => {

      dialog.showOpenDialog(this.window, { buttonLabel: 'Save', properties: ['openDirectory'] }, filenames => {

        if ( ! filenames ) return resolve(null);

        fs.stat(filenames[0])
        .then(stats => {

          if ( ! stats.isDirectory() ) reject(new AppError('Path must be a valid directory!', 'PATH_TYPE_ERROR'));
          else resolve(filenames[0]);

        })
        .catch(reject);

      });

    });

  }

  private showSaveFileDialog(): Promise<string> {

    return new Promise((resolve, reject) => {

      dialog.showSaveDialog(this.window, {}, filename => {

        resolve(filename);

      })

    });

  }

  private showOpenFilesDialog(): Promise<string[]> {

    return new Promise((resolve, reject) => {

      dialog.showOpenDialog(this.window, { properties: ['multiSelections', 'openFile'] }, filenames => {

        if ( ! filenames ) return resolve(null);

        const promises: Promise<fs.Stats>[] = [];

        for ( const filename of filenames ) {

          promises.push(fs.stat(filename));

        }

        Promise.all(promises)
        .then(stats => {

          for ( const stat of stats ) {

            if ( ! stat.isFile() ) return reject(new AppError('At least one of the selected paths is not a valid file!', 'PATH_TYPE_ERROR'));

          }

          resolve(filenames);

        })
        .catch(reject);

      })

    });

  }

  private serverAPI(endpoint: string, method: string, query: any, body: any, headers: any): Promise<any> {

    return new Promise((resolve, reject) => {

      request({
        uri: `${this.userServerUrl || this.config.defaultServerUrl}:${this.userPort || this.config.defaultServerPort}${endpoint}`,
        method: method,
        qs: query,
        body: JSON.stringify(body),
        headers: headers
      }, (error, response) => {

        if ( error ) return reject(error);

        resolve({
          status: response.statusCode,
          body: JSON.parse(response.body)
        });

      });

    });

  }

  private downloadFile(remoteFilename: string, filename: string, token: string, listener: WebContentsEx, id: string): Promise<any> {

    return new Promise((resolve, reject) => {

      let progress: number = 0;
      let stream: fs.WriteStream = null;
      let cancelled: boolean = false;

      const r = request.get({
        uri: `${this.userServerUrl || this.config.defaultServerUrl}:${this.userPort || this.config.defaultServerPort}/fs${remoteFilename}`,
        qs: { token: token }
      })
      .on('response', response => {

        if ( response.statusCode !== 200 ) {

          reject({ status: response.statusCode, message: response.body ? response.body.message : undefined });

        }
        else {

          stream = fs.createWriteStream(filename);

        }

      })
      .on('data', chunk => {

        if ( ! stream ) return;

        stream.write(chunk);

        progress += chunk.length;
        listener.send(`file-download:${id}`, {
          data: [progress],
          state: 'progress',
          close: false
        });

      })
      .on('end', () => {

        if ( ! stream ) return;

        stream.close();
        if ( ! cancelled ) resolve({ status: 200 });
        if ( sub && ! sub.closed ) sub.unsubscribe();

      })
      .on('error', error => {

        reject(error);
        if ( sub && ! sub.closed ) sub.unsubscribe();

      })
      .on('abort', () => {

        fs.unlink(filename)
        .catch(console.log)
        .finally(() => resolve({ abort: true }));

      });

      const sub = this.onCancel.subscribe(cancel => {

        if ( cancel.type === 'upload' ) return;
        if ( cancel.type !== 'any' && cancel.remote !== remoteFilename ) return;

        cancelled = true;

        sub.unsubscribe();
        r.abort();

      });

    });

  }

  private uploadFile(filename: string, size: number, token: string, remoteFilename: string, listener: WebContentsEx, id: string): Promise<any> {

    return new Promise((resolve, reject) => {

      let progress: number = 0;
      let cancelled: boolean = false;
      const r = request.post({
        uri: `${this.userServerUrl || this.config.defaultServerUrl}:${this.userPort || this.config.defaultServerPort}/fs${remoteFilename}`,
        qs: { token: token },
        headers: {
          'Content-Length': size,
          'Content-Type': 'application/octet-stream'
        }
      });

      fs.createReadStream(filename)
      .on('data', chunk => {

        progress += chunk.length;
        listener.send(`file-upload:${id}`, {
          data: [progress],
          state: 'progress',
          close: false
        });

      })
      .pipe(r)
      .on('response', response => {

        if ( response.statusCode !== 200 ) return reject({ status: response.statusCode });

        if ( ! cancelled ) resolve({
          status: response.statusCode,
          body: response.body
        });

        if ( sub && ! sub.closed ) sub.unsubscribe();

      })
      .on('error', error => {

        if ( sub && ! sub.closed ) sub.unsubscribe();
        reject(error);

      })
      .on('abort', () => {

        this.serverAPI(`/fs${remoteFilename}`, 'delete', { token: token }, undefined, undefined)
        .catch(console.log)
        .finally(() => resolve({ abort: true }));

      });

      const sub = this.onCancel.subscribe(cancel => {

        if ( cancel.type === 'download' ) return;
        if ( cancel.type !== 'any' && cancel.remote !== remoteFilename ) return;

        cancelled = true;

        sub.unsubscribe();
        r.abort();

      });

    });

  }

}

new ElectronApp(config);
