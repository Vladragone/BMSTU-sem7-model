export class RequestGenerator {
  constructor(dist) {
    this.dist = dist;
  }

  nextArrival(now) {
    return now + this.dist.getValue();
  }
}
