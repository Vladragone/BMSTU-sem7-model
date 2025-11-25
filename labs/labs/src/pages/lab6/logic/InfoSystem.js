// logic/InfoSystem.js
import { RequestQueue } from "./RequestQueue.js";
import { RequestOperator } from "./RequestOperator.js";
import { RequestGenerator } from "./RequestGenerator.js";

export class InfoSystem {
  constructor(requestAmount) {
    this.requestAmount = requestAmount;
  }

  /**
   * genDist  - распределение межприходящих интервалов
   * dists = {
   *   fastReg:   Distribution, // быстрая регистрация (бизнес)
   *   commonReg: Distribution, // общая регистрация (эконом + груз)
   *   ecoScreen: Distribution, // обычный досмотр (эконом)
   *   busScreen: Distribution, // приоритетный досмотр (бизнес)
   *   boarding:  Distribution  // общая посадка (эконом + бизнес)
   * }
   */
  simulate(genDist, dists) {
    const generator = new RequestGenerator(genDist);

    // ОА (везде случайное время)
    const fastReg = new RequestOperator(dists.fastReg);       // быстрая рег. (бизнес)
    const commonReg = new RequestOperator(dists.commonReg);   // общая рег. (эконом+груз)
    const ecoScreen = new RequestOperator(dists.ecoScreen);   // обычный досмотр (эконом)
    const busScreen = new RequestOperator(dists.busScreen);   // приоритетный досмотр (бизнес)
    const boarding = new RequestOperator(dists.boarding);     // общая посадка

    // Очереди
    const qEcoScreen = new RequestQueue();     // на обычный досмотр
    const qBusScreen = new RequestQueue();     // на приоритетный досмотр
    const qBoarding = new RequestQueue();      // на посадку

    // Вероятности типов (можешь поменять при желании)
    const pBusiness = 0.3;
    const pEconomy = 0.5;
    // pCargo = 0.2 (остаток)

    let now = 0;
    const events = [];

    const pushEvent = (e) => {
      let i = 0;
      while (i < events.length && events[i].time < e.time) i++;
      events.splice(i, 0, e);
    };

    // первое событие прихода
    pushEvent({ time: generator.nextArrival(0), type: "GEN" });

    let processed = 0;
    let rejected = 0;

    while (processed + rejected < this.requestAmount) {
      if (events.length === 0) break;

      const ev = events.shift();
      now = ev.time;

      switch (ev.type) {
        // ---------------------------------------------------
        // Приход нового посетителя в аэропорт
        // ---------------------------------------------------
        case "GEN": {
          const r = Math.random();
          let passengerType;

          if (r < pBusiness) passengerType = "business";
          else if (r < pBusiness + pEconomy) passengerType = "economy";
          else passengerType = "cargo";

          // БИЗНЕС → быстрая регистрация
          if (passengerType === "business") {
            if (fastReg.isFree()) {
              const fin = fastReg.start(now);
              pushEvent({
                time: fin,
                type: "FAST_REG_FINISH",
                passengerType
              });
            } else {
              rejected++;
            }
          } else {
            // ЭКОНОМ или ГРУЗОВОЙ → общая регистрация
            if (commonReg.isFree()) {
              const fin = commonReg.start(now);
              pushEvent({
                time: fin,
                type: "COMMON_REG_FINISH",
                passengerType
              });
            } else {
              rejected++;
            }
          }

          // планируем следующее прибытие
          const nextT = generator.nextArrival(now);
          pushEvent({ time: nextT, type: "GEN" });
          break;
        }

        // ---------------------------------------------------
        // Окончание БЫСТРОЙ регистрации (только бизнес)
        // ---------------------------------------------------
        case "FAST_REG_FINISH": {
          fastReg.finish();

          // бизнес идёт на приоритетный досмотр
          if (busScreen.isFree()) {
            const fin = busScreen.start(now);
            pushEvent({
              time: fin,
              type: "BUS_SCREEN_FINISH"
            });
          } else {
            qBusScreen.add();
          }
          break;
        }

        // ---------------------------------------------------
        // Окончание ОБЩЕЙ регистрации (эконом или грузовой)
        // ---------------------------------------------------
        case "COMMON_REG_FINISH": {
          commonReg.finish();
          const type = ev.passengerType;

          if (type === "economy") {
            // эконом → на обычный досмотр
            if (ecoScreen.isFree()) {
              const fin = ecoScreen.start(now);
              pushEvent({
                time: fin,
                type: "ECO_SCREEN_FINISH"
              });
            } else {
              qEcoScreen.add();
            }
          } else if (type === "cargo") {
            // грузовой: сразу покинул систему
            processed++;
          }
          break;
        }

        // ---------------------------------------------------
        // Окончание ПРИОРИТЕТНОГО досмотра (бизнес)
        // ---------------------------------------------------
        case "BUS_SCREEN_FINISH": {
          busScreen.finish();

          // бизнес → общая посадка
          if (boarding.isFree()) {
            const fin = boarding.start(now);
            pushEvent({
              time: fin,
              type: "BOARDING_FINISH"
            });
          } else {
            qBoarding.add();
          }

          // если кто-то ждёт приоритетного досмотра — запускаем следующего
          if (!qBusScreen.isEmpty()) {
            qBusScreen.remove();
            const fin2 = busScreen.start(now);
            pushEvent({
              time: fin2,
              type: "BUS_SCREEN_FINISH"
            });
          }
          break;
        }

        // ---------------------------------------------------
        // Окончание ОБЫЧНОГО досмотра (эконом)
        // ---------------------------------------------------
        case "ECO_SCREEN_FINISH": {
          ecoScreen.finish();

          // эконом → общая посадка
          if (boarding.isFree()) {
            const fin = boarding.start(now);
            pushEvent({
              time: fin,
              type: "BOARDING_FINISH"
            });
          } else {
            qBoarding.add();
          }

          // если в очереди на обычный досмотр кто-то есть — запускаем
          if (!qEcoScreen.isEmpty()) {
            qEcoScreen.remove();
            const fin2 = ecoScreen.start(now);
            pushEvent({
              time: fin2,
              type: "ECO_SCREEN_FINISH"
            });
          }
          break;
        }

        // ---------------------------------------------------
        // Окончание ПОСАДКИ (общий блок для эконом+бизнес)
        // ---------------------------------------------------
        case "BOARDING_FINISH": {
          boarding.finish();
          // после посадки — моментальный выход (конец обслуживания)
          processed++;

          // если кто-то ещё ждёт посадки — запускаем
          if (!qBoarding.isEmpty()) {
            qBoarding.remove();
            const fin2 = boarding.start(now);
            pushEvent({
              time: fin2,
              type: "BOARDING_FINISH"
            });
          }
          break;
        }

        default:
          break;
      }
    }

    const total = processed + rejected;
    if (total === 0) return 0;
    return rejected / total;
  }
}
