import { useState, useEffect, useRef } from "react";
import { Plus, FileCode, Code, Book, X, FileText } from "lucide-react";
import type { FileType } from "../../types/editor";

type Props = {
  files: FileType[];
  setFiles: React.Dispatch<React.SetStateAction<FileType[]>>;
  activeFileId: string;
  setActiveFileId: (id: string) => void;
};

const Explorer = ({
  files,
  setFiles,
  activeFileId,
  setActiveFileId,
}: Props) => {
  const addFile = (language: "cpp" | "python" | "ipynb") => {
    const id = Date.now().toString();
    const extension =
      language === "ipynb" ? "ipynb" : language === "cpp" ? "cpp" : "py";
    const name = `strategy_${files.length + 1}.${extension}`;
    const path =
      language === "ipynb" ? `research/${name}` : `engine/algos/${name}`;

    let content = "";
    if (language === "cpp") {
      content = `#include <iostream>
#include <string>
#include <map>
#include <vector>

// Strategy Configuration
struct MarketData {
    double price;
    double bid;
    double ask;
    std::string symbol;
    long timestamp;
};

// Algo Base Class (simplified)
class Algo {
public:
    virtual ~Algo() = default;
    virtual void onTick(const MarketData& md) = 0;
};

// Your Strategy Implementation
class MyStrategy : public Algo {
private:
    std::string symbol_;
    double lastPrice_;
    
public:
    MyStrategy(const std::string& symbol) 
        : symbol_(symbol), lastPrice_(0.0) {}
    
    void onTick(const MarketData& md) override {
        // Your optimized C++ trading logic here
        if (md.price > lastPrice_ * 1.01) {
            std::cout << "Price spike detected! Buy signal" << std::endl;
        } else if (md.price < lastPrice_ * 0.99) {
            std::cout << "Price drop detected! Sell signal" << std::endl;
        }
        lastPrice_ = md.price;
    }
};

// Test the strategy
int main() {
    MyStrategy strategy("BTCUSDT");
    
    // Simulate market data
    MarketData md = {.price = 50000, .bid = 49999, .ask = 50001, .symbol = "BTCUSDT", .timestamp = 0};
    strategy.onTick(md);
    
    std::cout << "Strategy compiled and executed successfully!" << std::endl;
    return 0;
}`;
    } else if (language === "ipynb") {
      content: JSON.stringify([
        {
          id: "c1",
          type: "markdown",
          content:
            "# Research Notebook\n\nDocument your hypothesis and analysis here.",
        },
        {
          id: "c2",
          type: "code",
          content: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

# ============================================
# 1. 2D Plot (line + scatter)
# ============================================
x = np.linspace(0, 2 * np.pi, 100)
y1 = np.sin(x)
y2 = np.cos(x)
plt.figure(figsize=(8, 4))
plt.plot(x, y1, label='sin(x)', color='crimson', linewidth=2)
plt.plot(x, y2, label='cos(x)', color='teal', linewidth=2)
plt.scatter([np.pi/2, np.pi], [1, -1], color='gold', s=80, zorder=5)
plt.title("2D: Trigonometric Functions")
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()

# ============================================
# 2. 3D Plot (surface)
# ============================================
X = np.linspace(-5, 5, 50)
Y = np.linspace(-5, 5, 50)
X, Y = np.meshgrid(X, Y)
Z = X * np.exp(-X**2 - Y**2)   # peaks-like function

fig = plt.figure(figsize=(7, 5))
ax = fig.add_subplot(111, projection='3d')
surf = ax.plot_surface(X, Y, Z, cmap='plasma', edgecolor='none', alpha=0.9)
fig.colorbar(surf, shrink=0.5)
ax.set_title("3D: $z = x e^{-x^2 - y^2}$")
ax.set_xlabel("X")
ax.set_ylabel("Y")
ax.set_zlabel("Z")
plt.show()

# ============================================
# 3. Text Output – DataFrame
# ============================================
df = pd.DataFrame({
    'Asset': ['BTC', 'ETH', 'SOL'],
    'Price': [64200, 3200, 135],
    '24h Change %': [2.34, -1.12, 5.67]
})
print("Portfolio Snapshot:")
print(df.to_string(index=False))

# ============================================
# 4. Intentional Error (uncomment to test)
# ============================================
# x = 1 / 0`,
          output: "",
        },
      ]);
    } else {
      content = `import matplotlib.pyplot as plt
import numpy as np

# Generate 50 fake prices (simple upward trend with noise)
prices = 100 + np.cumsum(np.random.randn(50) * 2)

# Create the plot
plt.figure(figsize=(10, 5))
plt.plot(prices, marker='o', linestyle='-', color='lime', linewidth=2, markersize=4)
plt.title('Simple Price Trend', fontsize=14)
plt.xlabel('Time (minutes)')
plt.ylabel('Price (USDT)')
plt.grid(True, alpha=0.3)

# Show the chart (opens a new window)
plt.show()`;
    }

    const newFile: FileType = { id, name, content, language, path };
    setFiles([...files, newFile]);
    setActiveFileId(id);
  };

  const deleteFile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFiles = files.filter((f) => f.id !== id);
    setFiles(newFiles);
    if (activeFileId === id && newFiles.length > 0) {
      setActiveFileId(newFiles[0].id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/5 space-y-2">
        <p className="text-[10px] font-bold  uppercase tracking-widest px-1">
          New Strategy
        </p>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => addFile("cpp")}
            className="flex flex-col items-center justify-center p-2 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/50 transition-all group"
            title="New C++ Strategy"
          >
            <FileCode size={14} className="text-blue-400 mb-1" />
            <span className="text-[8px] font-bold text-white/40 group-hover:text-white transition-colors">
              C++
            </span>
          </button>
          <button
            onClick={() => addFile("ipynb")}
            className="flex flex-col items-center justify-center p-2 hover:bg-[#FF6D1F]/20 border border-white/5 hover:border-[#FF6D1F]/50 transition-all group"
            title="New Notebook"
          >
            <Book size={14} className="text-[#FF6D1F] mb-1" />
            <span className="text-[8px] font-bold text-white/40 group-hover:text-white transition-colors">
              NB
            </span>
          </button>
          <button
            onClick={() => addFile("python")}
            className="flex flex-col items-center justify-center p-2 hover:bg-green-500/20 border border-white/5 hover:border-green-500/50 transition-all group"
            title="New Python Script"
          >
            <Code size={14} className="text-green-400 mb-1" />
            <span className="text-[8px] font-bold text-white/40 group-hover:text-white transition-colors">
              PY
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-4 mb-2">
          Files
        </p>
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => setActiveFileId(file.id)}
            className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all ${
              activeFileId === file.id
                ? " text-white"
                : "text-white/40  hover:text-white/70"
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {file.language === "cpp" ? (
                <FileCode size={14} className="shrink-0 text-blue-400" />
              ) : file.language === "ipynb" ? (
                <Book size={14} className="shrink-0 text-[#FF6D1F]" />
              ) : (
                <Code size={14} className="shrink-0 text-green-400" />
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] font-medium truncate">
                  {file.name}
                </span>
                <span className="text-[8px] text-white/20 truncate">
                  {file.path}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => deleteFile(e, file.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Explorer;
