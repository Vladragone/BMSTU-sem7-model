export class Distribution {
  getValue() {
    throw new Error("Метод должен быть реализован!");
  }
}

export class UniformDistribution extends Distribution {
  constructor(lower, upper) {
    super();
    this.lower = lower;
    this.upper = upper;
  }

  getValue() {
    return Math.random() * (this.upper - this.lower) + this.lower;
  }
}
