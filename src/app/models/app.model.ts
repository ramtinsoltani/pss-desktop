import { DirectoryInfoResponse, FileInfoResponse } from '@app/model/api';
import { Subject } from 'rxjs';

export interface QueueItem {

  remote: string;
  filename: string;
  size: number;
  subject: Subject<number>;

}

export interface FileSelection {

  [filename: string]: boolean;

}

export interface QueueInfo {

  path: string;
  progress: number;
  done: boolean;

}

export type Queue = Array<QueueItem>;
export type DirectoryInfo = DirectoryInfoResponse;
export type FileInfo = FileInfoResponse;
