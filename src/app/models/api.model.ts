export interface MessageResponse {

  message: string;

}

export interface ErrorResponse {

  error: boolean;
  message: string;
  code: string;

}

export interface HealthResponse {

  running: boolean;

}

export interface TokenResponse {

  token: string;

}

export interface DiskInfoResponse {

  total: number;
  free: number;

}

export interface DirectoryInfoResponse {

  name: string;
  path: string;
  children: Array<FileInfoResponse|DirectoryInfoResponse>;

}

export interface FileInfoResponse {

  filename: string;
  path: string;
  size: number;
  created: number;
  modified: number;

}

export type SearchResultResponse = SearchResult[];

export interface SearchResult {

  directory: boolean;
  name: string;
  path: string;

}

export type UsersListResponse = User[];

export interface User {

  username: string;
  admin: boolean;
  uid: string;

}

export interface IPCResponse<T> {

  status: number;
  body: T;

}
