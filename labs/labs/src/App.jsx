import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Lab1 from "./pages/lab1";
import Lab2 from "./pages/lab2";
import "./App.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lab1" element={<Lab1 />} />
        <Route path="/lab2" element={<Lab2 />} />
      </Routes>
    </Router>
  );
}

function Home() {
  return (
    <div className="app-container">
      <h1 className="app-title">Лабораторные работы по Моделированию</h1>

      <nav className="navbar">
        <Link to="/lab1" className="nav-button green">
          Лабораторная работа 1
        </Link>
        <Link to="/lab2" className="nav-button green">
          Лабораторная работа 2
        </Link>
      </nav>
    </div>
  );
}
