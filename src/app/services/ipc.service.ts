import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { IPCStateListeners, IPCResponse, IPCOptions } from '@app/model/ipc';

@Injectable({
  providedIn: 'root'
})
export class IpcService {

  private defaultOptions: IPCOptions = {
    keepOpen: false,
    forceId: null
  };

  constructor(
    private electron: ElectronService
  ) { }

  private generateEventId(): string {

    let id: string = '';

    for ( let i = 0; i < 10; i++ )
      id += Math.floor(Math.random() * 10);

    return id;

  }

  public send(channel: string, args: any[] = [], listeners: IPCStateListeners = {}, options: IPCOptions = this.defaultOptions): void {

    const id = options.forceId || this.generateEventId();
    const interceptor = (event, response: IPCResponse) => {

      if ( listeners[response.state] ) listeners[response.state](...response.data);

      if ( response.close && ! options.keepOpen ) this.electron.ipcRenderer.removeListener(`${channel}:${id}`, interceptor);

    };

    if ( Object.keys(listeners).length ) this.electron.ipcRenderer.on(`${channel}:${id}`, interceptor);
    
    this.electron.ipcRenderer.send(channel, id, ...args);

  }

}
