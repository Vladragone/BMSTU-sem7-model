import React, { useState } from "react";
import "./index.css";

const DISTS = {
  "Равномерное": {
    params: [
      { key: "a", label: "a (min)", def: 0 },
      { key: "b", label: "b (max)", def: 10 },
    ],
    gen: ({ a, b }) => a + (b - a) * Math.random(),
  },
  "Нормальное": {
    params: [
      { key: "mu", label: "μ (среднее)", def: 0 },
      { key: "sigma", label: "σ (СКО>0)", def: 1 },
    ],
    gen: ({ mu, sigma }) => {
      // метод Бокса–Мюллера
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mu + sigma * z;
    },
  },
  "Экспоненциальное": {
    params: [{ key: "lambda", label: "λ (rate>0)", def: 1 }],
    gen: ({ lambda }) => -Math.log(1 - Math.random()) / lambda,
  },
  "Эрланга": {
    params: [
      { key: "k", label: "k (целое≥1)", def: 2 },
      { key: "lambda", label: "λ (rate>0)", def: 1 },
    ],
    gen: ({ k, lambda }) => {
      let prod = 1;
      for (let i = 0; i < k; i++) prod *= Math.random();
      return -Math.log(prod) / lambda;
    },
  },
};

// ---------- MODELS ----------
function eventModel(generator, processor, countTasks, repeatProbability) {
  let tasksDone = 0;
  let curQueue = 0;
  let maxQueue = 0;
  let free = true;
  let processFlag = false;
  const events = [[generator(), "g", 0]]; // [time, type, id]
  while (tasksDone < countTasks && events.length) {
    const event = events.shift();
    const t = event[0];

    if (event[1] === "g") {
      curQueue++;
      if (curQueue > maxQueue) maxQueue = curQueue;
      // следующее событие генератора
      insertEvent(events, [t + generator(), "g"]);
      if (free) processFlag = true;
    } else if (event[1] === "p") {
      tasksDone++;
      if (Math.random() * 100 < repeatProbability) curQueue++;
      processFlag = true;
    }

    if (processFlag) {
      if (curQueue > 0) {
        curQueue--;
        insertEvent(events, [t + processor(), "p"]);
        free = false;
      } else free = true;
      processFlag = false;
    }
  }
  return maxQueue;
}

function insertEvent(events, event) {
  const t = event[0];
  let i = 0;
  while (i < events.length && events[i][0] < t) i++;
  events.splice(i, 0, event);
}

function stepModel(generator, processor, countTasks, repeatProbability, step) {
  let tasksDone = 0;
  let timeCurrent = step;
  let timeGenerated = generator();
  let timeGeneratedPrev = 0;
  let timeProcessed = 0;
  let curQueue = 0;
  let maxQueue = 0;
  let free = true;

  while (tasksDone < countTasks) {
    if (timeCurrent > timeGenerated) {
      curQueue++;
      if (curQueue > maxQueue) maxQueue = curQueue;
      timeGeneratedPrev = timeGenerated;
      timeGenerated += generator();
    }

    if (timeCurrent > timeProcessed) {
      if (curQueue > 0) {
        const wasFree = free;
        if (free) free = false;
        else {
          tasksDone++;
          curQueue--;
          if (Math.random() * 100 < repeatProbability) curQueue++;
        }
        if (wasFree) timeProcessed = timeGeneratedPrev + processor();
        else timeProcessed += processor();
      } else free = true;
    }
    timeCurrent += step;
  }
  return maxQueue;
}

// ---------- UI ----------
function Field({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export default function App() {
  const [genType, setGenType] = useState("Равномерное");
  const [procType, setProcType] = useState("Нормальное");

  const [genParams, setGenParams] = useState({ a: 0, b: 10 });
  const [procParams, setProcParams] = useState({ mu: 0, sigma: 1 });

  const [countTasks, setCountTasks] = useState(100);
  const [repeatProbability, setRepeatProbability] = useState(0);
  const [step, setStep] = useState(0.01);

  const [resEvent, setResEvent] = useState("");
  const [resStep, setResStep] = useState("");

  const handleSolve = () => {
    const g = () => DISTS[genType].gen(genParams);
    const p = () => DISTS[procType].gen(procParams);
    const ev = eventModel(g, p, countTasks, repeatProbability);
    const st = stepModel(g, p, countTasks, repeatProbability, step);
    setResEvent(ev);
    setResStep(st);
  };

  return (
    <div className="container">
      <h1 className="title">Лабораторная работа №4</h1>

      <h2 className="subtitle">Генератор</h2>
      <label className="field">
        <span>Распределение</span>
        <select value={genType} onChange={(e) => setGenType(e.target.value)}>
          {Object.keys(DISTS).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>

      <div className="param-grid">
        {DISTS[genType].params.map((p) => (
          <Field
            key={p.key}
            label={p.label}
            value={genParams[p.key] ?? p.def}
            onChange={(val) =>
              setGenParams((prev) => ({ ...prev, [p.key]: val }))
            }
          />
        ))}
      </div>

      <h2 className="subtitle">Обслуживающий аппарат</h2>
      <label className="field">
        <span>Распределение</span>
        <select value={procType} onChange={(e) => setProcType(e.target.value)}>
          {Object.keys(DISTS).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>

      <div className="param-grid">
        {DISTS[procType].params.map((p) => (
          <Field
            key={p.key}
            label={p.label}
            value={procParams[p.key] ?? p.def}
            onChange={(val) =>
              setProcParams((prev) => ({ ...prev, [p.key]: val }))
            }
          />
        ))}
      </div>

      <h2 className="subtitle">Параметры</h2>
      <div className="param-grid">
        <Field label="Количество заявок" value={countTasks} onChange={setCountTasks} />
        <Field
          label="Вероятность возврата (%)"
          value={repeatProbability}
          onChange={setRepeatProbability}
        />
        <Field label="Временной шаг" value={step} onChange={setStep} />
      </div>

      <button className="btn" onClick={handleSolve}>
        Решить
      </button>

      <div className="results">
        <h2 className="subtitle">Результаты</h2>
        <table>
          <thead>
            <tr>
              <th>Пошаговый подход</th>
              <th>Событийный подход</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{resStep}</td>
              <td>{resEvent}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
