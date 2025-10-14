import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
import "reactflow/dist/style.css";
import "./index.css";

const TIME_DELTA = 1e-4;
const EPS_DERIV = 5e-3;
const EPS_DIFF = 5e-3;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const makeMatrix = (n, fill = 0) =>
  Array.from({ length: n }, () => Array.from({ length: n }, () => fill));
const zeros = (n) => Array.from({ length: n }, () => 0);
const format = (x) =>
  isFinite(x)
    ? Math.abs(x) < 1e-12
      ? "0"
      : x.toLocaleString(undefined, { maximumFractionDigits: 6 })
    : "—";

const solveStationary = (Q) => {
  const n = Q.length;
  const A = makeMatrix(n, 0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] = Q[j][i];
  for (let j = 0; j < n; j++) A[n - 1][j] = 1;
  const b = zeros(n);
  b[n - 1] = 1;

  const M = A.map((r) => r.slice());
  const rhs = b.slice();
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    const v = M[piv][col];
    if (Math.abs(v) < 1e-14) return null;
    if (piv !== col) {
      [M[piv], M[col]] = [M[col], M[piv]];
      [rhs[piv], rhs[col]] = [rhs[col], rhs[piv]];
    }
    const inv = 1 / M[col][col];
    for (let c = col; c < n; c++) M[col][c] *= inv;
    rhs[col] *= inv;
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col];
      if (f === 0) continue;
      for (let c = col; c < n; c++) M[r][c] -= f * M[col][c];
      rhs[r] -= f * rhs[col];
    }
  }
  const x = zeros(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = rhs[r];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = s;
  }
  const sum = x.reduce((a, b) => a + b, 0);
  return x.map((v) => v / sum);
};

const eulerStep = (P, Q, dt) => {
  const n = P.length;
  const dP = Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) dP[j] += P[i] * Q[i][j];
  const out = P.map((v, i) => v + dP[i] * dt);
  const s = out.reduce((a, b) => a + b, 0);
  return out.map((v) => v / s);
};

const simulateKolmogorov = (Q, pi, P0) => {
  const n = Q.length;
  const history = [];
  const times = Array(n).fill(null);
  let P = P0.slice();
  let prevP = P0.slice();
  let t = 0;
  const TMAX = 30;

  while (t < TMAX && times.some((x) => x === null)) {
    const newP = eulerStep(P, Q, TIME_DELTA);
    const dPdt = newP.map((v, i) => (v - prevP[i]) / TIME_DELTA);

    if (Math.floor(t / TIME_DELTA) % 100 === 0)
      history.push({ time: t, ...Object.fromEntries(newP.map((v, i) => [`S${i + 1}`, v])) });

    for (let i = 0; i < n; i++) {
      if (times[i] === null) {
        const stableDeriv = Math.abs(dPdt[i]) < EPS_DERIV;
        const closeToLimit = Math.abs(newP[i] - pi[i]) < EPS_DIFF;
        if (stableDeriv && closeToLimit) times[i] = t;
      }
    }

    prevP = P;
    P = newP;
    t += TIME_DELTA;
  }
  return { times, history };
};

const App = () => {
  const navigate = useNavigate();
  const [n, setN] = useState(4);
  const [lambda, setLambda] = useState(() => {
    const M = makeMatrix(4, 0);
    M[0][1] = 2;
    M[1][2] = 3;
    M[2][3] = 3;
    M[3][0] = 3;
    return M;
  });

  const Q = useMemo(() => {
    const M = makeMatrix(n, 0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) if (i !== j) s += lambda[i][j];
      for (let j = 0; j < n; j++) M[i][j] = i === j ? -s : lambda[i][j];
    }
    return M;
  }, [lambda, n]);

  const { pi, tau, history } = useMemo(() => {
    const pi = solveStationary(Q) || Array.from({ length: n }, () => 1 / n);
    const P0 = Array(n).fill(0);
    P0[0] = 1;
    const { times, history } = simulateKolmogorov(Q, pi, P0);
    return { pi, tau: times, history };
  }, [Q, n]);

  const nodes = useMemo(() => {
    const radius = 150;
    const centerX = 300;
    const centerY = 200;
    return Array.from({ length: n }, (_, i) => {
      const angle = (2 * Math.PI * i) / n;
      return {
        id: `S${i + 1}`,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        data: { label: `S${i + 1}` },
        style: {
          background: "#1e293b",
          color: "#ffffff",
          border: "2px solid #60a5fa",
          borderRadius: "50%",
          width: 50,
          height: 50,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: 600,
        },
      };
    });
  }, [n]);

  const edges = useMemo(() => {
    const arr = [];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (i !== j && lambda[i][j] > 0)
            arr.push({
            id: `e${i}-${j}`,
            source: `S${i + 1}`,
            target: `S${j + 1}`,
            labelShowBg: true,
            label: `λ${i + 1}${j + 1}=${lambda[i][j]}`,
            animated: true,
            style: {
                stroke: "#60a5fa",
                strokeWidth: Math.min(1 + lambda[i][j] / 2, 5),
            },
            labelBgPadding: [6, 3],
            labelBgBorderRadius: 4,
            labelBgStyle: {
                fill: "rgba(15, 23, 42, 0.85)",
                stroke: "#475569",
            },
            labelStyle: {
                fill: "#f8fafc",
                fontSize: 13,
                fontWeight: 500,
                textShadow: "0 0 4px rgba(0,0,0,0.8)",
            },
            labelXOffset: (i * 15) % 30,
            labelYOffset: ((i + j) * 10) % 20 - 10,
            });

    return arr;
  }, [lambda, n]);

  return (
    <div className="container">
      <h1 className="title">ЛР №2 — Моделирование и Q-схема переходов</h1>

      <div className="controls">
        <label>
          Кол-во состояний:
          <input
            type="number"
            min="1"
            max="10"
            value={n}
            onChange={(e) => setN(clamp(parseInt(e.target.value) || 1, 1, 10))}
          />
        </label>
      </div>

      <table>
        <thead>
          <tr className="header-main">
            <th></th>
            {Array.from({ length: n }, (_, j) => (
              <th key={j}>λ{j + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => (
            <tr key={i}>
              <th>λ{i + 1}</th>
              {Array.from({ length: n }, (_, j) => (
                <td key={j}>
                  {i === j ? (
                    <input className="cell diag" value="—" readOnly />
                  ) : (
                    <input
                      type="number"
                      className="cell"
                      value={lambda[i][j] || 0}
                      onChange={(e) => {
                        const M = lambda.map((r) => r.slice());
                        M[i][j] = Math.max(0, Number(e.target.value) || 0);
                        setLambda(M);
                      }}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="subtitle">Результаты</h3>
      <table>
        <thead>
          <tr>
            <th>Вероятность</th>
            <th>Время сходимости (τᵢ)</th>
          </tr>
        </thead>
        <tbody>
          {pi.map((p, i) => (
            <tr key={i}>
              <td>{format(p)}</td>
              <td>{tau[i] ? format(tau[i]) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="subtitle">Граф переходов (Q-схема)</h3>
      <div style={{ width: "100%", height: 400, background: "#0f172a", borderRadius: "8px" }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Controls />
          <Background color="#bbcadfff" gap={16} />
        </ReactFlow>
      </div>

      <h3 className="subtitle">Сходимость вероятностей</h3>
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={history} margin={{ top: 20, right: 40, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              stroke="#e5e7eb"
              tickFormatter={(v) => Number(v).toFixed(2)}
              label={{ value: "Время (сек)", position: "insideBottom", dy: 10 }}
            />
            <YAxis
              stroke="#e5e7eb"
              domain={[0, 1]}
              tickFormatter={(v) => Number(v).toFixed(2)}
              label={{ value: "Вероятность", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value, name) => [Number(value).toFixed(3), name]}
              labelFormatter={(label) => `t = ${Number(label).toFixed(3)} сек`}
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #475569",
                color: "#e5e7eb",
                borderRadius: "6px",
              }}
            />
            <Legend />
            {pi.map((p, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={`S${i + 1}`}
                stroke={["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"][i % 4]}
                dot={false}
                strokeWidth={2}
              />
            ))}
            {pi.map((p, i) => (
              <ReferenceLine
                key={`pi-${i}`}
                y={p}
                stroke={["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"][i % 4]}
                strokeDasharray="4 4"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <button className="back-button" onClick={() => navigate("/")}>
        Назад
      </button>
    </div>
  );
};

export default App;
