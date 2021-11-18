export default class ErrorHandling {
  constructor(origin) {
    this._origin = origin;
  }

  get origin() {
    return this._origin;
  }

  error(errorType, path = 'unknow') {
    const errorMessages = {
      exchange: {
        classCode: '1',
        classCommonName: 'Exchange',
        messages: {
          NOT_ENOUGH_BALANCE: {
            message: 'NOT_ENOUGH_BALANCE',
            code: '11',
            appPath: path,
            error: new Error(`Origin: ${this.origin}, Code: 11, Message: NOT_ENOUGH_BALANCE, Path: ${path}`),
          },
          TRANSFER_NOT_APPROVED: {
            message: 'TRANSFER_NOT_APPROVED',
            code: '12',
            appPath: path,
            error: new Error(`Origin: ${this.origin}, Code: '12', Message: TRANSFER_NOT_APPROVED, Path: ${path}`),
          },
          TIMESTAMP_EXPIRED: {
            message: 'TIMESTAMP_EXPIRED',
            code: '13',
            appPath: path,
            error: new Error(`Origin: ${this.origin}, Code: '13', Message: TIMESTAMP_EXPIRED, Path: ${path}`),
          },
        },
      },
    };
    return errorMessages[this.origin].messages[errorType];
  }
}
