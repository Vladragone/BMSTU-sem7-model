export class RequestQueue {
  constructor() {
    this.size = 0;
  }

  add() { this.size++; }
  remove() { if (this.size > 0) this.size--; }

  isEmpty() { return this.size === 0; }
}
