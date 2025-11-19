import { RequestQueue } from "./RequestQueue.js";
import { RequestOperator } from "./RequestOperator.js";
import { RequestProcessor } from "./RequestProcessor.js";
import { RequestGenerator } from "./RequestGenerator.js";

export class InfoSystem {
  constructor(requestAmount) {
    this.requestAmount = requestAmount;
  }

  simulate(genDist, operatorsDist, processingTimes) {
    const generator = new RequestGenerator(genDist);

    const operators = operatorsDist.map(d => new RequestOperator(d));
    const computers = processingTimes.map(t => new RequestProcessor(t));

    const queue1 = new RequestQueue();
    const queue2 = new RequestQueue();

    let now = 0;

    const events = [];

    const pushEvent = (e) => {
      let i = 0;
      while (i < events.length && events[i].time < e.time) i++;
      events.splice(i, 0, e);
    };

    pushEvent({ time: generator.nextArrival(0), type: "GEN" });

    let processed = 0;
    let rejected = 0;

    while (processed + rejected < this.requestAmount) {
      if (events.length === 0) break;

      const ev = events.shift();
      now = ev.time;

      if (ev.type === "GEN") {
        const freeOp = operators.find(op => op.isFree());

        if (freeOp) {
          const fin = freeOp.start(now);
          pushEvent({ time: fin, type: "OP_FINISH", actor: freeOp });
        } else {
          rejected++;
        }

        const nextT = generator.nextArrival(now);
        pushEvent({ time: nextT, type: "GEN" });
      }

      else if (ev.type === "OP_FINISH") {
        ev.actor.finish();

        if (operators.indexOf(ev.actor) < 2)
          queue1.add();
        else
          queue2.add();

        computers.forEach((pc, idx) => {
          const queue = idx === 0 ? queue1 : queue2;
          if (pc.isFree() && !queue.isEmpty()) {
            queue.remove();
            const fin = pc.start(now);
            pushEvent({ time: fin, type: "PC_FINISH", actor: pc });
          }
        });
      }

      else if (ev.type === "PC_FINISH") {
        ev.actor.finish();
        processed++;

        const idx = computers.indexOf(ev.actor);
        const queue = idx === 0 ? queue1 : queue2;

        if (!queue.isEmpty()) {
          queue.remove();
          const fin = ev.actor.start(now);
          pushEvent({ time: fin, type: "PC_FINISH", actor: ev.actor });
        }
      }
    }

    return rejected / (processed + rejected);
  }
}
