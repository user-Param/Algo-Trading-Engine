

import { useEffect, useRef, useMemo } from "react";
import Highcharts from "highcharts";
import { useDatafeed } from "@/app/lib/datafeed-context";

interface OrderbookProps {
  selectedSymbol: string;
}

// Helper: generate dummy depth levels around the real bid/ask
const generateDepthLevels = (
  bid: number,
  ask: number,
  levels: number = 20,
): { bids: { price: number; size: number }[]; asks: { price: number; size: number }[] } => {
  const spread = ask - bid;
  const step = spread / (levels + 1); // step per level

  const bids = [];
  const asks = [];

  for (let i = 0; i < levels; i++) {
    const priceDown = bid - i * step;
    const priceUp = ask + i * step;
    // Simulate sizes: larger near the mid, smaller further out
    const sizeDown = Math.random() * 50 + 10;
    const sizeUp = Math.random() * 50 + 10;
    bids.push({ price: Math.round(priceDown * 100) / 100, size: Math.round(sizeDown * 100) / 100 });
    asks.push({ price: Math.round(priceUp * 100) / 100, size: Math.round(sizeUp * 100) / 100 });
  }
  return { bids, asks };
};

export default function Orderbook({ selectedSymbol }: OrderbookProps) {
  const { tickerData } = useDatafeed();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Highcharts.Chart | null>(null);

  // Get current ticker
  const ticker = selectedSymbol ? tickerData[selectedSymbol] : null;

  // Generate depth data when ticker changes
  const depthData = useMemo(() => {
    if (!ticker) return null;
    const bid = ticker.bid || ticker.price;
    const ask = ticker.ask || ticker.price;
    if (!bid || !ask) return null;
    return generateDepthLevels(bid, ask, 10);
  }, [ticker]);

  // Initialize chart once
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = Highcharts.chart(chartRef.current, {
      chart: {
        type: "bar",
        backgroundColor: "rgb(18, 18, 18)",
        marginTop: 70,
        animation: { duration: 200 },
        events: {
          load() {
            // Start auto-update interval
            const interval = setInterval(() => {
              if (this.series && depthData) {
                const bidData = depthData.bids.map((item, i) => ({
                  x: i,
                  y: item.size,
                  price: item.price,
                }));
                const askData = depthData.asks.map((item, i) => ({
                  x: i,
                  y: item.size,
                  price: item.price,
                }));
                this.series[0].setData(askData, false);
                this.series[1].setData(bidData, false);
                this.redraw();
              }
            }, 500);
            // Store interval for cleanup
            (this as any).updateInterval = interval;
          },
        },
      },
      title: {
        text: `Orderbook Depth (${selectedSymbol || ""})`,
        style: { color: "#ffffff", opacity: 0.0},
      },
      xAxis: [
        {
          reversed: true,
          visible: false,
          title: { text: "Bids" },
        },
        {
          opposite: true,
          visible: false,
          title: { text: "Asks" },
        },
      ],
      yAxis: [
        {
          offset: 0,
          opposite: true,
          gridLineWidth: 0,
          tickAmount: 1,
          left: "50%",
          width: "50%",
          min: 0,
          title: { text: "Asks" },
          labels: {
            enabled: true,
            format: "Asks",
            style: { color: "#ffffff" },
          },
        },
        {
          offset: 0,
          opposite: true,
          gridLineWidth: 0,
          tickAmount: 2,
          left: "0%",
          width: "50%",
          reversed: true,
          min: 0,
          title: { text: "Bids" },
          labels: {
            enabled: true,
            format: "Bids",
            style: { color: "#ffffff" },
          },
        },
      ],
      legend: { enabled: false },
      plotOptions: {
        series: {
          animation: false,
          pointPadding: 0,
          groupPadding: 0,
          borderWidth: 0,
          crisp: false,
          dataLabels: {
            enabled: true,
            color: "#ffffff",
            style: { fontSize: "12px", textOutline: "none" },
          },
        },
      },
      series: [
        {
          name: "Asks",
          color: "#d83b2a",
          data: [],
          dataLabels: [
            {
              align: "right",
              alignTo: "plotEdges",
              format: "{point.y:,.0f}",
            },
            {
              align: "left",
              inside: true,
              format: "{point.price:,.1f}",
            },
          ],
        },
        {
          name: "Bids",
          color: "#066bcc",
          data: [],
          yAxis: 1,
          dataLabels: [
            {
              align: "left",
              alignTo: "plotEdges",
              format: "{point.y:,.0f}",
            },
            {
              align: "right",
              inside: true,
              format: "{point.price:,.1f}",
            },
          ],
        },
      ],
      tooltip: {
        headerFormat: "Price: <b>${point.price:,.1f}</b><br/>",
        pointFormat: "{series.name}: <b>{point.y:,.0f}</b>",
      },
    });

    chartInstance.current = chart;

    return () => {
      if (chartInstance.current) {
        clearInterval((chartInstance.current as any).updateInterval);
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []); // Run once

  // Update chart data when depthData changes
  useEffect(() => {
    if (!chartInstance.current || !depthData) return;

    const chart = chartInstance.current;
    const bidData = depthData.bids.map((item, i) => ({
      x: i,
      y: item.size,
      price: item.price,
    }));
    const askData = depthData.asks.map((item, i) => ({
      x: i,
      y: item.size,
      price: item.price,
    }));

    chart.series[0].setData(askData, false);
    chart.series[1].setData(bidData, false);
    chart.redraw();

  }, [depthData, selectedSymbol]);

  return (
    <div className="h-[600px] w-full bg-[#0a0a0a]">
      <div ref={chartRef} className="h-full flex-1 w-full" />
    </div>
  );
}