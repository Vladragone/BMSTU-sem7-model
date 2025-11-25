// App.jsx
import React, { useState } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

import "./index.css";

import { UniformDistribution } from "./logic/Distributions.js";
import { InfoSystem } from "./logic/InfoSystem.js";

export default function App() {
  // ----- общие параметры -----
  const [requestAmount, setRequestAmount] = useState(300);
  const [genLower, setGenLower] = useState(8.0);
  const [genUpper, setGenUpper] = useState(12.0);
  const [result, setResult] = useState("");

  // ----- параметры блоков (везде Uniform min/max) -----
  const [params, setParams] = useState({
    fastReg: { min: 10, max: 20 },     // быстрая регистрация (бизнес)
    commonReg: { min: 15, max: 25 },   // общая регистрация (эконом+груз)
    ecoScreen: { min: 20, max: 40 },   // обычный досмотр
    busScreen: { min: 15, max: 30 },   // приоритетный досмотр
    boarding: { min: 10, max: 20 }     // общая посадка
  });

  const [selectedNode, setSelectedNode] = useState(null);

  const updateParam = (block, field, value) => {
    setParams((prev) => ({
      ...prev,
      [block]: {
        ...prev[block],
        [field]: value
      }
    }));
  };

  // ------------- НОДЫ СХЕМЫ -------------
  const nodes = [
    // Метки
    {
      id: "label_business",
      position: { x: 0, y: 10 },
      data: { label: "Бизнес" },
      style: { background: "#d9d9d9", padding: 8, borderRadius: 6 }
    },
    {
      id: "label_economy",
      position: { x: 300, y: 10 },
      data: { label: "Эконом" },
      style: { background: "#d9d9d9", padding: 8, borderRadius: 6 }
    },
    {
      id: "label_cargo",
      position: { x: 600, y: 10 },
      data: { label: "Грузовой" },
      style: { background: "#d9d9d9", padding: 8, borderRadius: 6 }
    },

    // Бизнес линия
    {
      id: "fast_reg",
      position: { x: 0, y: 70 },
      data: { label: "Быстрая регистрация", block: "fastReg" },
      style: {
        background: "#ffe0b2",
        padding: 15,
        borderRadius: 10,
        cursor: "pointer"
      }
    },
    {
      id: "pri_screen",
      position: { x: 0, y: 170 },
      data: { label: "Приоритетный досмотр", block: "busScreen" },
      style: {
        background: "#ffcdd2",
        padding: 15,
        borderRadius: 10,
        cursor: "pointer"
      }
    },

    // Эконом линия + общая регистрация
    {
      id: "common_reg",
      position: { x: 300, y: 70 },
      data: { label: "Общая регистрация", block: "commonReg" },
      style: {
        background: "#ffe0b2",
        padding: 15,
        borderRadius: 10,
        cursor: "pointer"
      }
    },
    {
      id: "eco_screen",
      position: { x: 300, y: 170 },
      data: { label: "Обычный досмотр", block: "ecoScreen" },
      style: {
        background: "#ffcdd2",
        padding: 15,
        borderRadius: 10,
        cursor: "pointer"
      }
    },

    // Общая посадка
    {
      id: "boarding",
      position: { x: 150, y: 270 },
      data: { label: "Общая посадка", block: "boarding" },
      style: {
        background: "#fff9c4",
        padding: 15,
        borderRadius: 10,
        cursor: "pointer"
      }
    },

    // Общий выход для эконом + бизнес
    {
      id: "exit_general",
      position: { x: 150, y: 370 },
      data: { label: "Выход (бизнес + эконом)" },
      style: {
        background: "#c8e6c9",
        padding: 15,
        borderRadius: 10
      }
    },

    // Грузовой выход
    {
      id: "cargo_exit",
      position: { x: 600, y: 170 },
      data: { label: "Выход (груз)" },
      style: {
        background: "#c8e6c9",
        padding: 15,
        borderRadius: 10
      }
    }
  ];

  // ------------- РЁБРА (СТРЕЛКИ) -------------
  const edges = [
    // бизнес
    { id: "b1", source: "label_business", target: "fast_reg" },
    { id: "b2", source: "fast_reg", target: "pri_screen" },
    { id: "b3", source: "pri_screen", target: "boarding" },

    // эконом
    { id: "e1", source: "label_economy", target: "common_reg" },
    { id: "e2", source: "common_reg", target: "eco_screen" },
    { id: "e3", source: "eco_screen", target: "boarding" },

    // посадка → общий выход
    { id: "exit1", source: "boarding", target: "exit_general" },

    // грузовой
    { id: "c1", source: "label_cargo", target: "common_reg" },
    { id: "c2", source: "common_reg", target: "cargo_exit" }
  ];

  const onNodeClick = (_, node) => {
    if (node.data.block) {
      setSelectedNode(node);
    } else {
      setSelectedNode(null);
    }
  };

  // ------------- ЗАПУСК СИМУЛЯЦИИ -------------
  const simulate = () => {
    try {
      const info = new InfoSystem(requestAmount);

      const rejection = info.simulate(
        new UniformDistribution(genLower, genUpper),
        {
          fastReg: new UniformDistribution(
            params.fastReg.min,
            params.fastReg.max
          ),
          commonReg: new UniformDistribution(
            params.commonReg.min,
            params.commonReg.max
          ),
          ecoScreen: new UniformDistribution(
            params.ecoScreen.min,
            params.ecoScreen.max
          ),
          busScreen: new UniformDistribution(
            params.busScreen.min,
            params.busScreen.max
          ),
          boarding: new UniformDistribution(
            params.boarding.min,
            params.boarding.max
          )
        }
      );

      const percent = Math.max(
        0,
        Math.min(100, parseFloat((rejection * 100).toFixed(2)))
      );
      setResult(`Вероятность отказа: ${percent.toFixed(2)}%`);
    } catch (err) {
      setResult("Ошибка: " + err.message);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* ==== Левая часть — схема ==== */}
      <div style={{ flex: 1, borderRight: "1px solid #444" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          onNodeClick={onNodeClick}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* ==== Правая часть — параметры и результат ==== */}
      <div
        style={{
          width: 340,
          padding: 16,
          background: "#111",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <h2>Параметры модели</h2>

        <div style={{ marginBottom: 12 }}>
          <label>
            Количество заявок:
            <input
              type="number"
              value={requestAmount}
              onChange={(e) =>
                setRequestAmount(parseInt(e.target.value || "0", 10))
              }
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
        </div>

        <h3>Генератор заявок</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <label style={{ flex: 1 }}>
            min
            <input
              type="number"
              value={genLower}
              onChange={(e) => setGenLower(parseFloat(e.target.value || "0"))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label style={{ flex: 1 }}>
            max
            <input
              type="number"
              value={genUpper}
              onChange={(e) => setGenUpper(parseFloat(e.target.value || "0"))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
        </div>

        <button
          onClick={simulate}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 16,
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Смоделировать
        </button>

        <div style={{ marginBottom: 24 }}>
          <h3>Результат</h3>
          <p>{result}</p>
        </div>

        <hr style={{ borderColor: "#444", marginBottom: 16 }} />

        <h3>Параметры блока</h3>
        {selectedNode && selectedNode.data.block ? (
          <div style={{ marginTop: 8 }}>
            <h4>{selectedNode.data.label}</h4>
            {["min", "max"].map((key) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <label>
                  {key}:
                  <input
                    type="number"
                    value={params[selectedNode.data.block][key]}
                    onChange={(e) =>
                      updateParam(
                        selectedNode.data.block,
                        key,
                        parseFloat(e.target.value || "0")
                      )
                    }
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 14 }}>
            Кликни по блоку на схеме, чтобы изменить его min/max.
          </p>
        )}
      </div>
    </div>
  );
}
