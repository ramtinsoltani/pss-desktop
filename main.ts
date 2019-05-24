import { app, BrowserWindow, Menu, ipcMain, dialog, Notification, globalShortcut } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import request from 'request';
import config from './app.config.json';

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

      // Menu.setApplicationMenu(null);
      //
      // app.on('browser-window-created', (e, window) => {
      //
      //   // Remove the default menu and disable dev tools
      //   window.setMenu(null);
      //
      //   window.webContents.on('devtools-opened', () => {
      //
      //     window.webContents.closeDevTools();
      //
      //   });
      //
      // });

      this.defineKeyboardShortcuts();
      this.defineIPCs();
      this.createWindow();

    });

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {

      // On macOS specific close process
      if ( process.platform !== 'darwin' ) app.quit();

    });

    app.on('activate', () => {

      // macOS specific close process
      if ( this.window === null ) this.createWindow();

    });

  }

  private defineKeyboardShortcuts(): void {

    globalShortcut.register('CommandOrControl+A', () => {

      this.window.webContents.send('keyboard-shortcut:ctrl+a');

    });

  }

  private defineIPCs(): void {

    // Dialog for opening files (used for file upload)
    ipcMain.on('open-files', event => {

      this.showOpenFilesDialog()
      .then(filenames => {

        event.sender.send('open-files:done', filenames);

      })
      .catch(error => {

        event.sender.send('open-files:error', error);

      });

    });

    // Dialog for saving file (used for file download)
    ipcMain.on('save-file', event => {

      this.showSaveFileDialog()
      .then(filename => {

        event.sender.send('save-file:done', filename);

      })
      .catch(error => {

        event.sender.send('save-file:error', error);

      });

    });

    // Dialog for saving multiple files (used for files selection download)
    ipcMain.on('save-files', event => {

      this.showSaveFilesDialog()
      .then(filename => {

        event.sender.send('save-files:done', filename);

      })
      .catch(error => {

        event.sender.send('save-files:error', error);

      });

    });

    // For showing notifications
    ipcMain.on('notify', (event, title: string, message: string) => {

      this.showNotification(title, message);

    });

    // For general server API usage
    ipcMain.on('server-api', (event, endpoint: string, method: string, query: any, body: any, headers: any) => {

      this.serverAPI(endpoint, method, query, body, headers)
      .then(response => {

        event.sender.send('server-api:done', endpoint, response);

      })
      .catch(error => {

        event.sender.send('server-api:error', endpoint, error);

      });

    });

    // For file upload
    ipcMain.on('file-upload', (event, filename: string, size: number, token: string, remoteFilename: string) => {

      event.sender.send('file-upload:start', filename);

      this.uploadFile(filename, size, token, remoteFilename, event.sender)
      .then(response => {

        event.sender.send('file-upload:done', filename, response);

      })
      .catch(error => {

        event.sender.send('file-upload:error', filename, error);

      });

    });

    // For file download
    ipcMain.on('file-download', (event, remoteFilename: string, filename: string, token: string) => {

      event.sender.send('file-download:start', filename);

      this.downloadFile(remoteFilename, filename, token, event.sender)
      .then(response => {

        event.sender.send('file-download:done', filename, response);

      })
      .catch(error => {

        event.sender.send('file-download:error', filename, error);

      })

    });

  }

  private showNotification(title: string, message: string): void {

    if ( ! Notification.isSupported() ) return console.error('Notifications are not supported!');

    const notification = new Notification({
      title: title,
      body: message,
      icon: path.join(__dirname, 'dist', 'assets', 'noticon.png')
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
        uri: `${this.config.defaultServerUrl}:${this.config.defaultServerPort}${endpoint}`,
        method: method,
        qs: query,
        body: body,
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

  private downloadFile(remoteFilename: string, filename: string, token: string, listener: any): Promise<any> {

    return new Promise((resolve, reject) => {

      let progress: number = 0;
      let stream: fs.WriteStream = null;

      request.get({
        uri: `${this.config.defaultServerUrl}:${this.config.defaultServerPort}/fs/${remoteFilename}`,
        qs: { token: token }
      })
      .on('response', response => {

        if ( response.statusCode !== 200 ) {

          reject({ status: response.statusCode });

        }
        else {

          stream = fs.createWriteStream(filename);

        }

      })
      .on('data', chunk => {

        if ( ! stream ) return;

        stream.write(chunk);

        progress += chunk.length;
        listener.send('file-download:progress', filename, progress);

      })
      .on('end', () => {

        if ( ! stream ) return;

        stream.close();
        resolve({ status: 200 });

      })
      .on('error', reject);

    });

  }

  private uploadFile(filename: string, size: number, token: string, remoteFilename: string, listener: any): Promise<any> {

    return new Promise((resolve, reject) => {

      let progress: number = 0;

      fs.createReadStream(filename, { highWaterMark: 500 })
      .on('data', chunk => {

        progress += chunk.length;
        listener.send('file-upload:progress', filename, progress);

      })
      .pipe(request.post({
        uri: `${this.config.defaultServerUrl}:${this.config.defaultServerPort}/fs/${remoteFilename}`,
        qs: { token: token },
        headers: {
          'Content-Length': size,
          'Content-Type': 'application/octet-stream'
        }
      }))
      .on('response', response => {

        if ( response.statusCode !== 200 ) return reject({ status: response.statusCode });

        resolve({
          status: response.statusCode,
          body: response.body
        });

      })
      .on('error', reject);

    });

  }

}

new ElectronApp(config);
