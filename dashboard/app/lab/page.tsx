import { useState, useEffect, useRef } from "react";
import Explorer from "@/app/lab/editor/explorer";
import TerminalUI from "@/app/lab/editor/terminal";
import EditorMain from "@/app/lab/editor/editor-main";


import { Shield, AlertCircle, X, CheckCircle2, Play } from "lucide-react";


const BACKEND_URL = "";
  // (import.meta as any).env?.VITE_RESEARCH_BACKEND_URL || 
  // (window.location.hostname === "localhost" 
  //   ? "http://localhost:5001" 
  //   : "https://blink-1-6xql.onrender.com/api/research");

const Lab = () => {
  // const { isConnected, marketData, subscribe, sendMessage } = useWebSocket();

  const [files, setFiles] = useState<FileType[]>([
    {
    id: "ai-file",                          // fixed id
    name: "AI Assistant",
    language: "ai",
    content: "",                            // not used for rendering
    path: "ai/assistant"                    // just for display
  },
    {
      id: "1",
      name: "research_notebook.ipynb",
      content: JSON.stringify([
        { id: "c1", type: "markdown", content: "# Research Notebook\n\nDocument your hypothesis and analysis here." },
        {
          id: "c2",
          type: "code",
          content: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

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
`,
          output: ""
        }
      ]),
      language: "ipynb",
      path: "research/research_notebook.ipynb",
    },
    {
      id: "2",
      name: "sma_crossover.py",
      content: `# Simple Moving Average Crossover Strategy
import time

class SMACrossover:
    def __init__(self, short_period=5, long_period=20):
        self.short_period = short_period
        self.long_period = long_period
        self.prices = []
        print(f"SMA Crossover Initialized (Short: {short_period}, Long: {long_period})")

    def on_tick(self, price):
        self.prices.append(price)
        if len(self.prices) > self.long_period:
            self.prices.pop(0)
            
        if len(self.prices) < self.long_period:
            return "WAITING"
            
        short_sma = sum(self.prices[-self.short_period:]) / self.short_period
        long_sma = sum(self.prices[-self.long_period:]) / self.long_period
        
        if short_sma > long_sma:
            return "BUY"
        elif short_sma < long_sma:
            return "SELL"
        return "HOLD"`,
      language: "python",
      path: "engine/algos/sma_crossover.py",
    },
    {
      id: "3",
      name: "rsi_strategy.py",
      content: `# RSI Mean Reversion Strategy
import time

class RSIStrategy:
    def __init__(self, period=14, overbought=70, oversold=30):
        self.period = period
        self.overbought = overbought
        self.oversold = oversold
        self.prices = []
        print(f"RSI Strategy Initialized (Period: {period}, OB: {overbought}, OS: {oversold})")

    def calculate_rsi(self, prices):
        if len(prices) <= self.period:
            return 50
        
        gains = []
        losses = []
        for i in range(1, len(prices)):
            diff = prices[i] - prices[i-1]
            if diff >= 0:
                gains.append(diff)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(diff))
        
        avg_gain = sum(gains[-self.period:]) / self.period
        avg_loss = sum(losses[-self.period:]) / self.period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def on_tick(self, price):
        self.prices.append(price)
        if len(self.prices) > self.period + 1:
            self.prices.pop(0)
            
        if len(self.prices) < self.period + 1:
            return "WAITING"
            
        rsi = self.calculate_rsi(self.prices)
        
        if rsi < self.oversold:
            return "BUY"
        elif rsi > self.overbought:
            return "SELL"
        return "HOLD"`,
      language: "python",
      path: "engine/algos/rsi_strategy.py",
    },
    
  ]);

  const [activeFile, setActiveFile] = useState<FileType>(files[0]);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showDeployWarning, setShowDeployWarning] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(13);
  const [terminalHeight, setTerminalHeight] = useState(30);

  const isDraggingSidebar = useRef(false);
  const isDraggingTerminal = useRef(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const startSidebar = useRef(0);
  const startTerminal = useRef(0);

  

  const updateFileContent = (content: string) => {
    const updated = files.map((f) =>
      f.id === activeFile.id ? { ...f, content } : f
    );
    setFiles(updated);
    setActiveFile({ ...activeFile, content });
  };

  const handleSave = async () => {
    setOutput("Validating strategy components...\n");
    try {
      const res = await fetch(`${BACKEND_URL}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language
        }),
      });
      
      const data = await res.json();
      if (data.valid) {
        setOutput("Validation successful. Strategy structure is correct.\n");
        setShowDeployWarning(true);
      } else {
        setOutput(`Validation failed:\n${data.error}\n`);
      }
    } catch (err) {
      setOutput("Validation backend error. Please ensure Research Executor is running on port 5001.\n");
    }
  };

  const confirmSave = async () => {
    setOutput("Persisting strategy to simulation engine...\n");
    try {
      const res = await fetch(`${BACKEND_URL}/save-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeFile.name.split('.')[0],
          content: activeFile.content,
          language: activeFile.language
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setShowDeployWarning(false);
        setOutput(`Strategy successfully saved and deployed to simulation engine!\nLocation: ${data.path}\n`);

        sendMessage(JSON.stringify({
          request: "save_strategy",
          data: {
            name: activeFile.name.replace(/\.[^/.]+$/, ""),
            language: activeFile.language,
            content: activeFile.content,
            path: data.path
          }
        }));
      } else {
        setOutput(`Save failed: ${data.error}\n`);
      }
    } catch (err) {
      setOutput("Save backend error. Please ensure Research Executor is running on port 5001.\n");
    }
  };

  const runCode = async () => {
    setOutput("Running...\n");

    try {
      const res = await fetch(`${BACKEND_URL}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language
        }),
      });

      const data = await res.json();

      if (data.success) {
        setOutput(`Execution completed\n\n${data.output}`);
      } else {
        setOutput(`Error during execution:\n\n${data.error || data.output}`);
      }
    } catch (err) {
      setOutput("Research Executor backend not running or connection failed. Make sure port 5001 is open.");
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (isDraggingSidebar.current) {
        const dx = e.clientX - startX.current;
        const percent = (dx / window.innerWidth) * 100;
        const newWidth = startSidebar.current + percent;
        setSidebarWidth(Math.max(10, Math.min(40, newWidth)));
      }

      if (isDraggingTerminal.current) {
        const dy = startY.current - e.clientY;
        const percent = (dy / window.innerHeight) * 100;
        const newHeight = startTerminal.current + percent;
        setTerminalHeight(Math.max(10, Math.min(60, newHeight)));
      }
    };

    const stopDrag = () => {
      isDraggingSidebar.current = false;
      isDraggingTerminal.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    window.addEventListener("blur", stopDrag);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
      window.removeEventListener("blur", stopDrag);
    };
  }, []);

  return (
    <div className="flex h-screen">
      {/* Explorer */}
      <div
        className="h-full border-r border-white/10"
        style={{ width: `${sidebarWidth}%`, flexShrink: 0 }}
      >
        <Explorer
          files={files}
          setFiles={setFiles}
          activeFileId={activeFile.id}
          setActiveFileId={(id: string) => {
            const file = files.find((f) => f.id === id);
            if (file) setActiveFile(file);
          }}
        />
      </div>

      {/* Sidebar Handle */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          isDraggingSidebar.current = true;
          startX.current = e.clientX;
          startSidebar.current = sidebarWidth;
          document.body.style.userSelect = "none";
          document.body.style.cursor = "col-resize";
        }}
        className="w-[6px] flex items-center justify-center cursor-col-resize hover:bg-white/10 select-none"
      >
        <div className="w-[2px] h-10 bg-white/30 rounded-full" />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-2 flex justify-end items-center border-b border-white/10 gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30 px-3 py-1 text-[10px] font-bold rounded transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 size={12} /> Save
            </button>
            <button
              onClick={runCode}
              className="bg-[#FF6D1F] hover:bg-[#e55d1a] text-white px-4 py-1 text-[10px] font-bold rounded shadow-lg shadow-[#FF6D1F]/10 transition-all flex items-center gap-1.5"
            >
              <Play size={12} fill="currentColor" /> Run
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            
    <EditorMain
      activeFile={activeFile}
      updateFileContent={updateFileContent}
    />
  
          </div>
        </div>

        {/* Terminal Handle */}
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            isDraggingTerminal.current = true;
            startY.current = e.clientY;
            startTerminal.current = terminalHeight;
            document.body.style.userSelect = "none";
            document.body.style.cursor = "row-resize";
          }}
          className="h-[10px] flex items-center justify-center cursor-row-resize hover:bg-white/10 select-none"
        >
          <div className="h-[2px] w-20 bg-white/30 rounded-full" />
        </div>

        {/* Terminal */}
        <div
          className="border-t border-white/10 bg-[#181818] flex flex-col overflow-hidden"
          style={{ flexBasis: `${terminalHeight}%`, flexShrink: 0 }}
        >
          <div className="p-2 border-b border-white/10 text-xs text-white/50">
            
          </div>
          
          <div className="flex-1 min-h-0">
            <TerminalUI output={output} />
          </div>
        </div>
      </div>

      {/* Deployment Warning Modal */}
      {showDeployWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield size={20} className="text-[#FF6D1F]" />
                Strategy Deployment
              </h3>
              <button
                onClick={() => setShowDeployWarning(false)}
                className="text-white/30 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                  <AlertCircle size={32} className="text-red-500" />
                </div>
                <h4 className="text-white text-lg font-bold mb-3">Risk Acknowledgment</h4>
                <p className="text-white/50 text-sm leading-relaxed">
                  You are about to save and deploy <span className="text-white font-bold">"{activeFile.name}"</span>. 
                  By proceeding, you acknowledge that you are <span className="text-red-400 font-semibold underline decoration-red-400/30">solely responsible</span> for any financial outcomes resulting from the use of this strategy with real capital.
                </p>
              </div>
              
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex gap-3 items-start">
                <Shield size={16} className="text-[#FF6D1F] mt-0.5 shrink-0" />
                <p className="text-[11px] text-white/40 leading-relaxed italic">
                  Ensure the strategy has been thoroughly backtested and validated against historical datasets before production use.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeployWarning(false)}
                className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                className="bg-[#FF6D1F] hover:bg-[#e55d1a] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#FF6D1F]/20 active:scale-95"
              >
                I Understand, Save & Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lab;