export class RequestQueue {
  constructor() {
    this.items = [];
  }

  add(request) {
    this.items.push(request);
  }

  remove() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }
}
