export class RequestProcessor {
  constructor(processTime) {
    this.processTime = processTime;
    this.busy = false;
    this.finishTime = Infinity;
  }

  isFree() {
    return !this.busy;
  }

  start(now) {
    this.busy = true;
    this.finishTime = now + this.processTime;
    return this.finishTime;
  }

  finish() {
    this.busy = false;
    this.finishTime = Infinity;
  }
}
