"use client";

import { useEffect, useRef } from "react";

export default function TerminalUI({ output }: { output: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const lastOutput = useRef<string>("");

  useEffect(() => {
    const initTerminal = async () => {
      const { Terminal } = await import("xterm");
      await import("xterm/css/xterm.css");

      if (!terminalRef.current) return;

      term.current = new Terminal({
        cursorBlink: true,
        fontSize: 12,
        theme: {
          background: "#181818",
          foreground: "#ffffff",
          cursor: "#ffffff"
        },
        scrollback: 1000,
        disableStdin: true
      });

      term.current.open(terminalRef.current);
      term.current.writeln("║  BLINK Research Executor Terminal  ║\x1b[0m");
    };

    initTerminal();

    return () => term.current?.dispose();
  }, []);

  useEffect(() => {
    if (output && term.current && output !== lastOutput.current) {
      lastOutput.current = output;

      term.current.writeln("");

      const lines = output.split('\n');

      lines.forEach(line => {
        if (!line.trim()) {
          term.current?.writeln("");
          return;
        }

        if (line.includes('') || line.includes('successfully')) {
          term.current?.writeln(`${line}`);
        } else if (line.includes('') || line.includes('Error') || line.includes('error')) {
          term.current?.writeln(`${line}`);
        } else if (line.includes('')) {
          term.current?.writeln(`${line}`);
        } else if (line.includes('')) {
          term.current?.writeln(`${line}`);
        } else {
          term.current?.writeln(line);
        }
      });

      term.current.scrollToBottom();
    }
  }, [output]);

  return (
    <div className="h-full w-full bg-black overflow-hidden rounded-lg">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  );
}