import React, { useState, useMemo } from "react";

const generateTableNumbers = (digits, count = 10) => {
  const base2 = [
    92, 68, 45, 61, 14, 49, 39, 55, 40, 51,
    60, 99, 77, 11, 42, 55, 39, 22, 52, 83,
    77, 97, 79, 70, 34, 50, 90, 52, 77, 18,
    20, 90, 31, 51, 88, 76, 18, 98, 78, 63,
    99, 54, 30, 40, 95, 36, 40, 18, 70, 47,
  ];

  if (digits === 1) return base2.slice(0, count).map((n) => n % 10);
  if (digits === 2) return base2.slice(0, count);

  if (digits === 3) {
    const combined = [];
    for (let i = 0; i < count; i++) {
      const a = base2[i * 2];
      const b = base2[i * 2 + 1];
      const num = parseInt(`${a}${Math.floor(b / 10)}`);
      combined.push(num);
    }
    return combined;
  }

  return [];
};

const generateAlgorithmicNumbers = (digits, count = 10, seed = 123456789) => {
  let x = seed >>> 0;
  const numbers = [];

  for (let i = 0; i < count; i++) {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    const m = Math.pow(10, digits);
    numbers.push(x % m);
  }

  return numbers;
};


const calculateRandomness = (numbers) => {
  const digits = numbers.join("").split("").map(Number);
  const n = digits.length;
  if (n < 3) return 0;

  const counts = Array(10).fill(0);
  digits.forEach((d) => counts[d]++);
  const avg = n / 10;
  const deviation = counts.reduce((sum, c) => sum + Math.abs(c - avg), 0);
  const uniformity = 100 - (deviation / (avg * 10)) * 100;

  let repeats = 0;
  for (let i = 1; i < n; i++) {
    if (digits[i] === digits[i - 1]) repeats++;
  }
  const repeatScore = 100 * (1 - repeats / (n - 1));

  let changes = 0;
  let prevDir = 0;
  for (let i = 1; i < n; i++) {
    const diff = digits[i] - digits[i - 1];
    const dir = diff > 0 ? 1 : diff < 0 ? -1 : 0;
    if (dir !== 0 && prevDir !== 0 && dir !== prevDir) changes++;
    if (dir !== 0) prevDir = dir;
  }
  const directionScore = Math.round((changes / (n - 2)) * 100);

  const R = 0.3 * uniformity + 0.3 * repeatScore + 0.4 * directionScore;
  return Math.round(Math.max(0, Math.min(R, 100)));
};

const App = () => {
  const [manualInput, setManualInput] = useState(Array(10).fill(""));

  const handleInput = (i, value) => {
    if (/^[0-9]?$/.test(value)) {
      const updated = [...manualInput];
      updated[i] = value;
      setManualInput(updated);
    }
  };

  const table1 = useMemo(() => generateTableNumbers(1), []);
  const table2 = useMemo(() => generateTableNumbers(2), []);
  const table3 = useMemo(() => generateTableNumbers(3), []);
  const algo1 = useMemo(() => generateAlgorithmicNumbers(1), []);
  const algo2 = useMemo(() => generateAlgorithmicNumbers(2), []);
  const algo3 = useMemo(() => generateAlgorithmicNumbers(3), []);

  const manualNumbers = manualInput.filter((x) => x !== "").map(Number);

  const percents = [
    calculateRandomness(table1),
    calculateRandomness(table2),
    calculateRandomness(table3),
    calculateRandomness(algo1),
    calculateRandomness(algo2),
    calculateRandomness(algo3),
    manualNumbers.length ? calculateRandomness(manualNumbers) : 0,
  ];

  return (
    <div className="container">
      <h1 className="title">Лабораторная работа №1</h1>

      <table>
        <thead>
          <tr className="header-main">
            <th colSpan={3}>Табличный способ</th>
            <th colSpan={3}>Алгоритмический способ</th>
            <th>Ручной ввод</th>
          </tr>
          <tr className="header-sub">
            <th>1</th><th>2</th><th>3</th>
            <th>1</th><th>2</th><th>3</th>
            <th>Цифра</th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i}>
              <td>{table1[i]}</td>
              <td>{table2[i]}</td>
              <td>{table3[i]}</td>
              <td>{algo1[i]}</td>
              <td>{algo2[i]}</td>
              <td>{algo3[i]}</td>
              <td>
                <input
                  type="text"
                  maxLength="1"
                  value={manualInput[i]}
                  onChange={(e) => handleInput(i, e.target.value)}
                />
              </td>
            </tr>
          ))}

          <tr className="result-row">
            {percents.map((p, idx) => {
              let colorClass = "black-text";
              if (p > 60) colorClass = "green-text";
              else if (p > 30) colorClass = "yellow-text";
              else colorClass = "red-text";

              return (
                <td key={idx} className={colorClass}>
                  {p !== null && p !== undefined ? `${p}%` : "—"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default App;
