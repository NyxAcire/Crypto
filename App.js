import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

const assets = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "solana", symbol: "SOL" },
  { id: "ripple", symbol: "XRP" },
  { id: "cardano", symbol: "ADA" },
  { id: "binancecoin", symbol: "BNB" },
  { id: "gold", symbol: "XAU" }
];

const TELEGRAM_BOT_TOKEN = "7540619915:AAHnfJ1UjllM9XIPUd-Pfzu_zOelX9Xh4BA";
const TELEGRAM_CHAT_ID = "5140989931";

export default function App() {
  const [data, setData] = useState({});
  const [lastSignals, setLastSignals] = useState({});

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const updatedData = {};
    const updatedSignals = { ...lastSignals };

    await Promise.all(
      assets.map(async (asset) => {
        try {
          const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart`,
            {
              params: {
                vs_currency: "usd",
                days: "1",
                interval: "minute"
              }
            }
          );

          const prices = response.data.prices.map((p) => ({
            time: new Date(p[0]).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
            price: p[1]
          }));

          const avg =
            prices.slice(-20).reduce((sum, p) => sum + p.price, 0) / 20;
          const latest = prices[prices.length - 1].price;

          let signal = "Hold 🤝";
          if (latest > avg * 1.01) signal = "Sell 📉";
          else if (latest < avg * 0.99) signal = "Buy 📈";

          if (lastSignals[asset.symbol] && lastSignals[asset.symbol] !== signal) {
            sendTelegramAlert(asset.symbol, signal, latest);
          }
          updatedSignals[asset.symbol] = signal;

          updatedData[asset.symbol] = {
            currentPrice: latest,
            signal,
            prices
          };
        } catch (error) {
          console.error(`Error fetching ${asset.symbol} data:`, error);
        }
      })
    );

    setLastSignals(updatedSignals);
    setData(updatedData);
  };

  const sendTelegramAlert = async (symbol, signal, price) => {
    try {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: `${symbol} Signal Update: ${signal}\nCurrent Price: $${price.toFixed(2)}`
      });
    } catch (error) {
      console.error("Telegram alert failed:", error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Crypto Signal Dashboard</h1>
      {Object.entries(data).map(([symbol, assetData]) => {
        const chartData = {
          labels: assetData.prices.map((p) => p.time),
          datasets: [
            {
              label: `${symbol} Price (USD)`,
              data: assetData.prices.map((p) => p.price),
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.2)",
              tension: 0.3
            }
          ]
        };
        return (
          <div key={symbol} style={{ marginBottom: 50 }}>
            <h2>{symbol} - ${assetData.currentPrice.toFixed(2)}</h2>
            <p>Signal: <strong>{assetData.signal}</strong></p>
            <Line data={chartData} />
          </div>
        );
      })}
    </div>
  );
}
