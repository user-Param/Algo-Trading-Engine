import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";

import { Play, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  activeFile: FileType;
  updateFileContent: (content: string) => void;
};

type NotebookCell = {
  id: string;
  type: "code" | "markdown";
  content: string;
  output?: string;
  outputs?: CellOutput[];
};

interface CellOutput {
  type: "text" | "image/png" | "error";
  data: string;
}

const BACKEND_URL =
  (import.meta as any).env?.VITE_RESEARCH_BACKEND_URL ||
  "http://localhost:5001";

const EditorMain = ({ activeFile, updateFileContent }: Props) => {
  // Logic for .ipynb files
  const [cells, setCells] = useState<NotebookCell[]>([]);

  useEffect(() => {
    if (activeFile.language === "ipynb") {
      try {
        setCells(JSON.parse(activeFile.content));
      } catch (e) {
        setCells([]);
      }
    }
  }, [activeFile.id, activeFile.language]);

  const updateCell = (id: string, content: string) => {
    const newCells = cells.map((c) => (c.id === id ? { ...c, content } : c));
    setCells(newCells);
    updateFileContent(JSON.stringify(newCells));
  };

  const addCell = (type: "code" | "markdown", index?: number) => {
    const newCell: NotebookCell = {
      id: Date.now().toString(),
      type,
      content: type === "code" ? "# New code cell" : "### New Section",
      output: "",
    };

    let newCells;
    if (typeof index === "number") {
      newCells = [
        ...cells.slice(0, index + 1),
        newCell,
        ...cells.slice(index + 1),
      ];
    } else {
      newCells = [...cells, newCell];
    }

    setCells(newCells);
    updateFileContent(JSON.stringify(newCells));
  };

  const deleteCell = (id: string) => {
    const newCells = cells.filter((c) => c.id !== id);
    setCells(newCells);
    updateFileContent(JSON.stringify(newCells));
  };

  const runCell = async (id: string) => {
    const cell = cells.find((c) => c.id === id);
    if (!cell || cell.type !== "code") return;

    // Show a temporary loading state (optional, but clean)
    const loadingOutputs: CellOutput[] = [{ type: "text", data: "Running..." }];
    let updatedCells = cells.map((c) =>
      c.id === id ? { ...c, outputs: loadingOutputs } : c,
    );
    setCells(updatedCells);
    updateFileContent(JSON.stringify(updatedCells));

    try {
      const res = await fetch(`${BACKEND_URL}/run-cell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cell.content, language: "python" }),
      });
      const json = await res.json();
      const outputs: CellOutput[] = json.outputs || [];
      updatedCells = cells.map((c) => (c.id === id ? { ...c, outputs } : c));
    } catch (err) {
      const errorOutput: CellOutput[] = [
        { type: "error", data: "Failed to reach backend." },
      ];
      updatedCells = cells.map((c) =>
        c.id === id ? { ...c, outputs: errorOutput } : c,
      );
    }
    setCells(updatedCells);
    updateFileContent(JSON.stringify(updatedCells));
  };

  if (activeFile.language === "ipynb") {
    return (
      <div className="h-full overflow-y-auto p-8 space-y-2">
        <div className="max-w-4xl mx-auto space-y-2 pb-20">
          {cells.map((cell, index) => (
            <div key={cell.id} className="group/cell relative">
              <div className="relative group/content">
                <div className="absolute -left-12 top-0 flex flex-col items-center gap-2 opacity-0 group-hover/content:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white/20">
                    [{index + 1}]
                  </span>
                  {cell.type === "code" && (
                    <button
                      onClick={() => runCell(cell.id)}
                      className="p-1.5 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all"
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteCell(cell.id)}
                    className="p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div
                  className={`rounded-xl border transition-all duration-300 ${
                    cell.type === "code"
                      ? "bg-[#141414] border-white/10 shadow-2xl focus-within:border-[#FF6D1F]/40"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] focus-within:bg-white/[0.05] focus-within:border-white/20"
                  }`}
                >
                  {cell.type === "markdown" ? (
                    <textarea
                      className="w-full bg-transparent p-4 text-white/80 resize-none focus:outline-none min-h-[40px] text-lg font-medium"
                      value={cell.content}
                      onChange={(e) => updateCell(cell.id, e.target.value)}
                      placeholder="Write markdown here..."
                      rows={cell.content.split("\n").length}
                    />
                  ) : (
                    <div className="p-0 overflow-hidden rounded-xl">
                      <Editor
                        height={`${Math.max(100, cell.content.split("\n").length * 20 + 40)}px`}
                        theme="vs-dark"
                        language="python"
                        value={cell.content}
                        options={{
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          fontSize: 13,
                          lineNumbers: "on",
                          folding: false,
                          glyphMargin: false,
                          lineDecorationsWidth: 0,
                          lineNumbersMinChars: 3,
                          automaticLayout: true,
                        }}
                        onChange={(val) => updateCell(cell.id, val || "")}
                      />
                      {cell.outputs && cell.outputs.length > 0 ? (
                        <div className="border-t border-white/10">
                          {cell.outputs.map((out, i) => {
                            if (out.type === "text") {
                              return (
                                <pre
                                  key={i}
                                  className="p-4 font-mono text-[11px] text-white/90 whitespace-pre-wrap leading-relaxed"
                                >
                                  {out.data}
                                </pre>
                              );
                            } else if (out.type === "image/png") {
                              return (
                                <div
                                  key={i}
                                  className="p-4  flex justify-center"
                                >
                                  <img
                                    src={`data:image/png;base64,${out.data}`}
                                    alt="Cell output"
                                    className="max-w-full h-auto rounded border border-white/10"
                                  />
                                </div>
                              );
                            } else if (out.type === "error") {
                              return (
                                <pre
                                  key={i}
                                  className="p-4 bg-red-500/10 font-mono text-[11px] text-red-400 whitespace-pre-wrap border-l-2 border-red-500/50"
                                >
                                  {out.data}
                                </pre>
                              );
                            }
                            return null;
                          })}
                        </div>
                      ) : cell.output ? (
                        // fallback for old notebooks that still use `output` string
                        <div className="p-4 bg-black/40 border-t border-white/5 font-mono text-[11px] text-white/40 whitespace-pre-wrap">
                          {cell.output}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Cell Button below */}
              <div className="h-6 relative flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                <div className="absolute inset-x-0 h-px bg-white/5" />
                <button
                  onClick={() => addCell("code", index)}
                  className="z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-[#1a1a1a] border border-white/10 hover:border-[#FF6D1F]/50 text-[10px] text-white/40 hover:text-white transition-all shadow-xl"
                >
                  <Plus size={10} /> Code
                </button>
                <button
                  onClick={() => addCell("markdown", index)}
                  className="z-10 ml-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[#1a1a1a] border border-white/10 hover:border-blue-500/50 text-[10px] text-white/40 hover:text-white transition-all shadow-xl"
                >
                  <Plus size={10} /> Markdown
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-center gap-4 py-8">
            <button
              onClick={() => addCell("code")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-[#FF6D1F]/10 hover:border-[#FF6D1F]/50 text-xs font-bold transition-all"
            >
              <Plus size={14} /> Add Code Cell
            </button>
            <button
              onClick={() => addCell("markdown")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-blue-500/10 hover:border-blue-500/50 text-xs font-bold transition-all"
            >
              <Plus size={14} /> Add Markdown Cell
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        theme="vs-dark"
        language={activeFile.language === "cpp" ? "cpp" : "python"}
        value={activeFile.content}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          automaticLayout: true,
          padding: { top: 20 },
        }}
        onChange={(value) => updateFileContent(value || "")}
      />
    </div>
  );
};

export default EditorMain;
