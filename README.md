# Personal Shared Storage Desktop App

This is a desktop app made with Angular 7 and Electron to act as the client for [Personal Shared Storage API Server](https://github.com/ramtinsoltani/pss-api-server).

# Installation

  1. Install Node JS and NPM (latest LTS).
  2. Install dependencies by running `sudo npm install`.
  3. Make sure NPX is installed, if not, install it globally by running `sudo npm install npx -g`.

# Commands

  - Building the web app: `sudo npm run build`
  - Running the Electron app locally: `npm run electron`

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
