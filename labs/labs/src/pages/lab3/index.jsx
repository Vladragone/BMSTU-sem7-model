import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import "./index.css";

function factorial(n) {
  if (n < 0) return NaN;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function erf(x) {
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x));
  return sign * y;
}

const DISTS = {
  "Равномерное": {
    params: [
      { key: "a", label: "a (min)", def: 0, step: 0.1, min: -1e6, max: 1e6 },
      { key: "b", label: "b (max)", def: 1, step: 0.1, min: -1e6, max: 1e6 },
    ],
    pdf: (x, { a, b }) => (x >= a && x <= b ? 1 / (b - a) : 0),
    cdf: (x, { a, b }) => (x < a ? 0 : x > b ? 1 : (x - a) / (b - a)),
    domain: ({ a, b }) => {
      const w = Math.max(1e-6, b - a);
      return [a - 0.1 * w, b + 0.1 * w];
    },
  },
  "Экспоненциальное": {
    params: [{ key: "lambda", label: "λ (rate>0)", def: 1, step: 0.1, min: 0.0001 }],
    pdf: (x, { lambda }) => (x >= 0 ? lambda * Math.exp(-lambda * x) : 0),
    cdf: (x, { lambda }) => (x >= 0 ? 1 - Math.exp(-lambda * x) : 0),
    domain: ({ lambda }) => [0, Math.max(5 / lambda, 10)],
  },
  "Нормальное": {
    params: [
      { key: "mu", label: "μ (среднее)", def: 0, step: 0.1, min: -1e6, max: 1e6 },
      { key: "sigma", label: "σ (СКО>0)", def: 1, step: 0.1, min: 0.0001 },
    ],
    pdf: (x, { mu, sigma }) =>
      (1 / (sigma * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)),
    cdf: (x, { mu, sigma }) => 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2)))),
    domain: ({ mu, sigma }) => [mu - 4 * sigma, mu + 4 * sigma],
  },
  "Эрланга": {
    params: [
      { key: "k", label: "k (целое ≥1)", def: 2, step: 1, min: 1, type: "int" },
      { key: "lambda", label: "λ (rate>0)", def: 1, step: 0.1, min: 0.0001 },
    ],
    pdf: (x, { k, lambda }) =>
      x >= 0
        ? (Math.pow(lambda, k) * Math.pow(x, k - 1) * Math.exp(-lambda * x)) /
          factorial(k - 1)
        : 0,
    cdf: (x, { k, lambda }) => {
      if (x < 0) return 0;
      let sum = 0;
      for (let n = 0; n <= k - 1; n++) sum += Math.pow(lambda * x, n) / factorial(n);
      return 1 - Math.exp(-lambda * x) * sum;
    },
    domain: ({ k, lambda }) => [0, Math.max((k + 4 * Math.sqrt(k)) / lambda, 10 / lambda)],
  },
  "Пуассоновское": {
    params: [{ key: "lambda", label: "λ (ср. число событий)", def: 4, step: 0.1, min: 0.0001 }],
    pmf: (k, { lambda }) => Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k),
    cdfDisc: (k, { lambda }) => {
      let s = 0;
      for (let i = 0; i <= k; i++) s += Math.exp(-lambda) * Math.pow(lambda, i) / factorial(i);
      return s;
    },
    support: ({ lambda }) => {
      const lo = Math.max(0, Math.floor(lambda - 4 * Math.sqrt(lambda)));
      const hi = Math.max(lo + 10, Math.ceil(lambda + 4 * Math.sqrt(lambda)));
      return [lo, hi];
    },
  },
};

function NumberField({ label, value, onChange, step = 0.1, min, max, type = "float" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(type === "int" ? parseInt(e.target.value || 0) : parseFloat(e.target.value || 0))
        }
      />
    </label>
  );
}

function useDistData(name, params, points) {
  return useMemo(() => {
    if (name === "Пуассоновское") {
      const [k0, k1] = DISTS[name].support(params);
      const disc = [];
      let cum = 0;
      for (let k = k0; k <= k1; k++) {
        const p = DISTS[name].pmf(k, params);
        cum += p;
        disc.push({ x: k, pdf: p, cdf: cum });
      }
      return { data: disc, discrete: true };
    } else {
      const [xmin, xmax] = DISTS[name].domain(params);
      const N = Math.max(10, points);
      const h = (xmax - xmin) / (N - 1);
      const arr = [];
      for (let i = 0; i < N; i++) {
        const x = xmin + i * h;
        const pdf = DISTS[name].pdf(x, params);
        const cdf = DISTS[name].cdf(x, params);
        arr.push({ x, pdf, cdf });
      }
      return { data: arr, discrete: false };
    }
  }, [name, JSON.stringify(params), points]);
}

function App() {
  const navigate = useNavigate();
  const [dist, setDist] = useState("Равномерное");
  const [points, setPoints] = useState(200);

  const [params, setParams] = useState({
    a: 0,
    b: 1,
    lambda: 1,
    mu: 0,
    sigma: 1,
    k: 2,
  });

  const def = DISTS[dist];
  const activeParams = useMemo(() => {
    const out = {};
    for (const p of def.params) out[p.key] = params[p.key] ?? p.def;

    if (dist === "Равномерное" && out.a >= out.b) out.b = out.a + 1e-6;
    if (dist === "Нормальное" && out.sigma <= 0) out.sigma = 0.0001;
    if ((dist === "Экспоненциальное" || dist === "Эрланга" || dist === "Пуассоновское") && out.lambda <= 0)
      out.lambda = 0.0001;
    if (dist === "Эрланга") out.k = Math.max(1, Math.round(out.k));
    return out;
  }, [dist, params, def]);

  const { data, discrete } = useDistData(dist, activeParams, points);

  return (
    <div className="container">
      <h1 className="title">Лабораторная работа №3</h1>

      <div className="controls">
        <label className="field">
          <span>Распределение</span>
        <select value={dist} onChange={(e) => setDist(e.target.value)}>
            {Object.keys(DISTS).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <div className="param-grid">
          {def.params.map((p) => (
            <NumberField
              key={p.key}
              label={p.label}
              value={activeParams[p.key]}
              step={p.step}
              min={p.min}
              max={p.max}
              type={p.type}
              onChange={(val) => setParams((prev) => ({ ...prev, [p.key]: val }))}
            />
          ))}

          {dist !== "Пуассоновское" && (
            <NumberField
              label="Точек для графика"
              value={points}
              step={10}
              min={50}
              max={2000}
              type="int"
              onChange={setPoints}
            />
          )}
        </div>
      </div>

      <div className="charts">
        <section className="chart-card">
          <h2>{discrete ? "PMF (P(X=k))" : "Плотность (PDF)"}</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              {discrete ? (
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="k" allowDecimals={false} />
                  <YAxis type="number" dataKey="pdf" name="P(X=k)" />
                  <Tooltip formatter={(v) => (typeof v === "number" ? v.toExponential(3) : v)} />
                  <Legend />
                  <Scatter
                    name="PMF"
                    data={data}
                    stroke="#60a5fa"
                    fill="#60a5fa"
                    line
                    />
                </ScatterChart>
              ) : (
                <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={["auto", "auto"]} />
                  <YAxis domain={[0, "auto"]} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? v.toExponential(3) : v)} />
                  <Legend />
                  <Line type="monotone" dataKey="pdf" name="pdf" dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        <section className="chart-card">
          <h2>Функция распределения (CDF)</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              {discrete ? (
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="k" allowDecimals={false} />
                  <YAxis type="number" dataKey="cdf" name="P(X≤k)" domain={[0, 1]} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(6) : v)} />
                  <Legend />
                  <Scatter name="CDF" data={data} stroke="#60a5fa" fill="#60a5fa" line/>
                </ScatterChart>
              ) : (
                <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={["auto", "auto"]} />
                  <YAxis domain={[0, 1]} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(6) : v)} />
                  <Legend />
                  <Line type="monotone" dataKey="cdf" name="cdf" dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <button className="back-button" onClick={() => navigate("/")}>
        Назад к выбору лабораторной
      </button>
    </div>
  );
}

export default App;
