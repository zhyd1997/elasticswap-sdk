import { readFileSync } from 'fs';

const errorMessages = JSON.parse(readFileSync('./errorMessages.json'));

export default class ErrorHandling {
  constructor(origin) {
    // Origin is used to define from where the error is been thrown
    // There should be defined a property inside errorMessages Object with the correspondent Origin
    this._origin = origin;
  }

  get origin() {
    return this._origin;
  }

  error(errorType, path = 'unknown') {
    const exception = JSON.parse(JSON.stringify(errorMessages))[this.origin]
      .exceptions[errorType];
    return new Error(
      `Origin: ${this.origin}, Code: ${exception.code}, Message: ${exception.message}, Path: ${path}.`,
    );
  }
}
