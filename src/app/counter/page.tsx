"use client";

import { useState } from "react";

export default function CounterPage() {
  const [count, setCount] = useState(0);

  const increment = () => setCount((prev) => prev + 1);
  const decrement = () => setCount((prev) => prev - 1);
  const reset = () => setCount(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-3xl p-16 shadow-2xl border border-slate-700 text-center animate-fadeIn">
        <h1 className="text-5xl font-bold text-slate-100 mb-12 tracking-tight">
          Counter App
        </h1>

        <div className="my-12 p-8 bg-indigo-500/10 rounded-2xl border-2 border-indigo-500/30">
          <span className="text-8xl font-extrabold text-indigo-500 block transition-transform hover:scale-105">
            {count}
          </span>
        </div>

        <div className="flex gap-5 justify-center mt-12">
          <button
            onClick={decrement}
            className="px-9 py-5 text-2xl font-semibold bg-red-500 text-white rounded-xl
                     hover:bg-red-600 active:transform active:scale-95
                     transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-w-[80px]"
            aria-label="Decrement counter"
          >
            −
          </button>

          <button
            onClick={reset}
            className="px-9 py-5 text-base font-semibold bg-indigo-600 text-white rounded-xl
                     hover:bg-indigo-700 active:transform active:scale-95
                     transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            aria-label="Reset counter"
          >
            Reset
          </button>

          <button
            onClick={increment}
            className="px-9 py-5 text-2xl font-semibold bg-green-500 text-white rounded-xl
                     hover:bg-green-600 active:transform active:scale-95
                     transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-w-[80px]"
            aria-label="Increment counter"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
