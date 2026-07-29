"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";


export default function Chart() {
//   const chartRef = useRef<HTMLDivElement>(null);
//   const instanceRef = useRef<echarts.ECharts | null>(null);
//   const dataRef = useRef<number[][]>([]);
//   const candleRef = useRef<{
//     open: number;
//     high: number;
//     low: number;
//     close: number;
//   } | null>(null);
//   const userZoomedRef = useRef(false);
//   const [symbol, setSymbol] = useState('');
//   const { tickerData } = useDatafeed();
//   const symbols = Object.keys(tickerData);
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//   if (!symbol && symbols.length > 0) {
//     setSymbol(symbols[0]);
//   }
// }, [symbols]);

//   useEffect(() => {
//     if (!chartRef.current) return;
//     const chart = echarts.init(chartRef.current, "dark");
//     instanceRef.current = chart;

//     const data = dataRef.current;

//     chart.on("dataZoom", () => {
//       userZoomedRef.current = true;
//     });

//     const windowSize = 80;

//     const update = () => {
//       const tick = tickerData[symbol];

//       if (!tick) return;

//       const price = tick.price;

//       if (!candleRef.current) {
//         candleRef.current = {
//           open: price,
//           high: price,
//           low: price,
//           close: price,
//         };
//       } else {
//         candleRef.current.high = Math.max(candleRef.current.high, price);
//         candleRef.current.low = Math.min(candleRef.current.low, price);
//         candleRef.current.close = price;
//       }

//       data.push([
//         candleRef.current.open,
//         candleRef.current.close,
//         candleRef.current.low,
//         candleRef.current.high,
//       ]);

//       candleRef.current = {
//         open: price,
//         high: price,
//         low: price,
//         close: price,
//       };

//       const opt: any = {
//         grid: { top: 8, bottom: 24, left: 8, right: 60 },
//         xAxis: {
//           type: "category",
//           show: true,
//           axisLine: { show: true },
//           axisTick: { show: true },
//           splitLine: { show: false },
//           axisLabel: { fontSize: 10 },
//         },
//         yAxis: {
//           type: "value",
//           show: true,
//           position: "right",
//           splitLine: {
//             show: true,
//             lineStyle: { color: "#333", type: "dashed" },
//           },
//           axisLabel: { fontSize: 10, formatter: (v: any) => v.toFixed(2) },
//         },
//         series: [
//           {
//             type: "candlestick",
//             data,
//             animation: false,
//             markLine: {
//               silent: true,
//               symbol: "none",
//               lineStyle: { color: "#e0e0e0", width: 1 },
//               label: {
//                 show: true,
//                 formatter: () => price.toFixed(2),
//                 position: "end",
//                 backgroundColor: "#e0e0e0",
//                 color: "#000",
//                 padding: [2, 6],
//                 borderRadius: 2,
//                 fontSize: 11,
//               },
//               data: [{ yAxis: price }],
//             },
//           },
//         ],
//       };

//       if (!userZoomedRef.current) {
//         const endVal = data.length - 1;
//         const startVal = Math.max(0, endVal - windowSize + 1);
//         opt.dataZoom = [
//           {
//             type: "inside",
//             xAxisIndex: [0],
//             startValue: startVal,
//             endValue: endVal,
//           },
//           { type: "inside", yAxisIndex: [0] },
//         ];
//       }

//       chart.setOption(opt);
//     };

//     update();
//     const interval = setInterval(update, 1000);

//     const resize = () => chart.resize();
//     window.addEventListener("resize", resize);

//     return () => {
//       clearInterval(interval);
//       window.removeEventListener("resize", resize);
//       chart.dispose();
//     };
//   }, [symbol, tickerData]);

//   return (
//     <div className="h-full w-full">
//       <div className="relative p-2">
//   <button
//     onClick={() => setOpen(!open)}
//     className=" px-3 py-1 absolute z-1 rounded border border-gray-700"
//   >
//     {symbol || "Select Symbol"}
//   </button>

//   {open && (
//     <div className="absolute top-10 left-0 bg-[#090909] border border-zinc-700 max-h-64 overflow-y-auto z-50 no-scrollbar">
//       {symbols.map((s) => (
//         <button
//           key={s}
//           className="block w-full text-left hover:bg-zinc-700 no-scrollbar"
//           onClick={() => {
//             setSymbol(s);
//             dataRef.current = [];
//             candleRef.current = null;
//             setOpen(false);
//           }}
//         >
//           {s}
//         </button>
//       ))}
//     </div>
//   )}
// </div>

//       <div ref={chartRef} className="h-[1000px] w-[1000]" />
//     </div>
//   );
return(<>Chart</>);
}
