import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  title = 'pss-desktop';

  onDrop(event: DragEvent) {

    event.preventDefault();

    if ( event.dataTransfer.items ) {

      for ( let i = 0; i < event.dataTransfer.items.length; i++ ) {

        if ( event.dataTransfer.items[i].kind === 'file' ) {

          let file = event.dataTransfer.items[i].getAsFile();

          console.log({ path: file.path, size: file.size });

        }

      }

    }
    else if ( event.dataTransfer.files ) {

      for ( let i = 0; i < event.dataTransfer.files.length; i++ ) {

        let file = event.dataTransfer.files[i];

        console.log({ path: file.path, size: file.size });

      }

    }

  }

  onDragOver(event) {

    event.preventDefault();

  }

  constructor(
    private electron: ElectronService
  ) { }

  ngOnInit() {

    this.electron.ipcRenderer.on('save-files:done', (event, filename) => {

      this.electron.ipcRenderer.send('notify', 'PSS', 'Got directory: ' + filename);

    });

    this.electron.ipcRenderer.send('save-files');

  }

}
