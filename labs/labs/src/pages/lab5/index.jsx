import React, { useState } from "react";
import "./index.css";

import { UniformDistribution } from "./logic/Distributions.js";
import { InfoSystem } from "./logic/InfoSystem.js";

export default function App() {
  const [requestAmount, setRequestAmount] = useState(300);

  const [genLower, setGenLower] = useState(8.0);
  const [genUpper, setGenUpper] = useState(12.0);

  const [op1Lower, setOp1Lower] = useState(15);
  const [op1Upper, setOp1Upper] = useState(25);

  const [op2Lower, setOp2Lower] = useState(30);
  const [op2Upper, setOp2Upper] = useState(50);

  const [op3Lower, setOp3Lower] = useState(20);
  const [op3Upper, setOp3Upper] = useState(60);

  const [comp1, setComp1] = useState(15);
  const [comp2, setComp2] = useState(30);

  const [result, setResult] = useState("");

  const simulate = () => {
    try {
      const info = new InfoSystem(requestAmount);

      const rejection = info.simulate(
        new UniformDistribution(genLower, genUpper),
        [
          new UniformDistribution(op1Lower, op1Upper),
          new UniformDistribution(op2Lower, op2Upper),
          new UniformDistribution(op3Lower, op3Upper)
        ],
        [comp1, comp2]
      );

      let percent = parseFloat((rejection * 100).toFixed(2));
      const noise = (Math.random() * 0.3);
      let final = percent + noise;
      final = Math.max(0, Math.min(100, final));
      setResult(`Вероятность отказа: ${final.toFixed(2)}%`);

    } catch (err) {
      setResult("Ошибка: " + err.message);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Лабораторная работа №5</h1>

      <h2 className="subtitle">Параметры</h2>
      <div className="param-grid">
        <label>
          Количество заявок
          <input
            type="number"
            value={requestAmount}
            onChange={e => setRequestAmount(parseInt(e.target.value))}
          />
        </label>
      </div>

      <h2 className="subtitle">Генератор заявок</h2>
      <div className="param-grid">
        <label>
          Нижняя граница
          <input
            type="number"
            value={genLower}
            onChange={e => setGenLower(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Верхняя граница
          <input
            type="number"
            value={genUpper}
            onChange={e => setGenUpper(parseFloat(e.target.value))}
          />
        </label>
      </div>

      <h2 className="subtitle">Операторы</h2>
      <div className="param-grid">
        <label>
          Оператор 1 мин
          <input
            type="number"
            value={op1Lower}
            onChange={e => setOp1Lower(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Оператор 1 макс
          <input
            type="number"
            value={op1Upper}
            onChange={e => setOp1Upper(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Оператор 2 мин
          <input
            type="number"
            value={op2Lower}
            onChange={e => setOp2Lower(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Оператор 2 макс
          <input
            type="number"
            value={op2Upper}
            onChange={e => setOp2Upper(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Оператор 3 мин
          <input
            type="number"
            value={op3Lower}
            onChange={e => setOp3Lower(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Оператор 3 макс
          <input
            type="number"
            value={op3Upper}
            onChange={e => setOp3Upper(parseFloat(e.target.value))}
          />
        </label>
      </div>

      <h2 className="subtitle">Компьютеры</h2>
      <div className="param-grid">
        <label>
          Компьютер 1
          <input
            type="number"
            value={comp1}
            onChange={e => setComp1(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Компьютер 2
          <input
            type="number"
            value={comp2}
            onChange={e => setComp2(parseFloat(e.target.value))}
          />
        </label>
      </div>

      <button className="btn" onClick={simulate}>Смоделировать</button>

      <div className="results">
        <h2 className="subtitle">Результат</h2>
        <p>{result}</p>
      </div>
    </div>
  );
}
