export class RequestOperator {
  constructor(dist) {
    this.dist = dist;
    this.busy = false;
    this.finishTime = Infinity;
  }

  isFree() {
    return !this.busy;
  }

  start(now) {
    this.busy = true;
    this.finishTime = now + this.dist.getValue();
    return this.finishTime;
  }

  finish() {
    this.busy = false;
    this.finishTime = Infinity;
  }
}
