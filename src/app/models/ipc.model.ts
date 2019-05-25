export interface IPCStateListeners {

  [state: string]: Function;

}

export interface IPCResponse {

  data: any[];
  state: string;
  close: boolean;

}

export interface IPCOptions {

  keepOpen?: boolean;
  forceId?: string;

}
