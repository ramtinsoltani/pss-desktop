import { Directive, HostListener, Output, EventEmitter } from '@angular/core';

export interface DropzoneFile {

  path: string;
  size: number;
  filename: string;

}

export type DropzoneEvent = Array<DropzoneFile>;

@Directive({
  selector: '[dropzone]'
})
export class DropzoneDirective {

  @Output('dropzone')
  public listener: EventEmitter<any> = new EventEmitter();

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {

    event.preventDefault();

  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {

    event.preventDefault();

    const files = [];

    if ( event.dataTransfer.items ) {

      for ( let i = 0; i < event.dataTransfer.items.length; i++ ) {

        if ( event.dataTransfer.items[i].kind === 'file' ) {

          let file = event.dataTransfer.items[i].getAsFile();

          files.push({
            path: file.path,
            size: file.size,
            filename: file.name
          });

        }

      }

    }
    else if ( event.dataTransfer.files ) {

      for ( let i = 0; i < event.dataTransfer.files.length; i++ ) {

        let file = event.dataTransfer.files[i];

        files.push({
          path: file.path,
          size: file.size,
          filename: file.name
        });

      }

    }

    if ( files.length ) this.listener.emit(files);

  }

  constructor() { }

}
