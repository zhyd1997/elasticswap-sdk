export default class Subscribable {
  constructor() {
    this._subscribers = [];
  }

  subscribe(callback) {
    callback(this, {
      reason: `Initial call issued upon event subscriber registration.`,
    });

    const subscriber = (obj, eventPayload) => {
      callback(obj, eventPayload);
    };

    this._subscribers.push(subscriber);

    return () => {
      this._subscribers = this._subscribers.filter((sub) => sub !== subscriber);
    };
  }

  touch(eventPayload = {}) {
    this._subscribers.forEach((subscriber) => subscriber(this, eventPayload));
  }
}
