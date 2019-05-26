export class AppError extends Error {

  constructor(message: string, public code: string) {

    super(message);

    const actualProto = new.target.prototype;

    if ( Object.setPrototypeOf ) Object.setPrototypeOf(this, actualProto);
    else (this as any).__proto__ = actualProto;

  }

}
