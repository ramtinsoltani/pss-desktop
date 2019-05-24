# Personal Shared Storage Desktop App

This is a desktop app made with Angular 7 and Electron to act as the client for [Personal Shared Storage API Server](https://github.com/ramtinsoltani/pss-api-server).

# Installation

  1. Install Node JS and NPM (latest LTS).
  2. Install dependencies by running `sudo npm install`.
  3. Make sure NPX is installed, if not, install it globally by running `sudo npm install npx -g`.

# Commands

  - Building the web app: `sudo npm run build`
  - Running the Electron app locally: `npm run electron` (do not use `sudo`!)

# Electron Main IPC API

| Event Name | States | Arguments | Callback Arguments | Description |
|:-----------|:------:|:---------:|:--------:|:------------|
| open-files | `done` `error` | | `filenames` | Shows the open file dialog and returns the selected filenames or null if canceled. |
| save-file | `done` `error` | | `filename` | Shows the save file dialog and returns the selected filename or null if canceled. |
| save-files | `done` `error` | | `dirname` | Shows the select directory dialog and returns the selected directory name or null if canceled. |
| notify | | `title` `message` | | Shows a system notification. |
| server-api | `done` `error` | `endpoint` `method` `query` `body` `headers` | `endpoint` `response` | Sends a request to the server using the provided arguments and returns the response. |
| file-upload | `start` `progress` `done` `error` | `filename` `size` `token` `remoteFilename` | `filename` `response` | Uploads a file by the given filename on the server with the remote name and returns the response. |
| file-download | `start` `progress` `done` `error` | `remoteFilename` `filename` `token` | `filename` `response` | Downloads the specified remote file at the specified path and returns the response. |

# Electron Renderer IPC API

The following events are available for the renderer process to listen to:

  - `keyboard-shortcut:ctrl+a`: Fired when Ctrl+A or Command+A is pressed.

> **NOTE:** All `progress` states send the following callback arguments: `filename` `progress` (which is the total downloaded bytes.)

> **NOTE:** All `error` states send the the `error` object (and some send the `filename` as an identifier if `filename` is normally sent in the `done` state.)

# Angular Directives

The following directives are available...

## Dropzone Directive

The `dropzone` directive configures an element as a file drop zone which captures all files that are dragged and dropped and emits an event with the following argument:

```json
[
  {
    "path": "string",
    "size": "number",
    "filename": "string"
  }
]
```

**Example:**

```html
<div (dropzone)="onDrop($event)"></div>
```

```ts
import { DropzoneEvent } from '@app/directive/dropzone';

onDrop(event: DropzoneEvent) {
  for ( const file of event) {
    console.log(file.path, file.size, file.filename);
  }
}
```

# Angular Components

The following components are available...

## Modal Component

The `app-modal` component is used to show content in a modal. It defines two optional attributes for controlling the visibility state of the modal: the boolean `modal-hidden` attribute and the element ref `modal-close` attribute which takes template reference and attaches a handler to its `onclose` event for closing the modal on click.

This component also defines three sections inside its content: `modal-header`, `modal-body`, and `modal-footer`.

**Example:**

```html
<app-modal [(modal-hidden)]="modalHidden" [modal-close]="closeButton">
  <div class="modal-header">
    Modal Title
  </div>
  <div class="modal-body">
    Modal body
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-primary btn-block" #closeButton>Ok</button>
  </div>
</app-modal>
```

## Progress Bar Component

The `app-progress-bar` component is used whenever a progress bar is needed. It defines two attributes, one required attribute named `progress` which takes in the progress percentage (number only) and one optional attribute named `progress-threshold` which takes in a percentage threshold (number only) at which the progress bar turns red (defaults to `null`).

**Example:**

```html
<app-progress-bar [progress]="50" [progress-threshold]="80"></app-progress-bar>
```
