import React, { useEffect, useState } from "react";
import { BGPattern } from "@/app/component/animation/background";
import { Component as TextVaporize } from "@/app/component/animation/text";
import AnimatedTextCycle from "@/app/component/animation/text2";
import { Routes, Route, useNavigate } from "react-router-dom";

import {
  TrendingUp,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  Globe,
  Cpu,
  Layers,
} from "lucide-react";
import TradingList from "@/app/component/section2";
import { useDatafeed } from "../lib/datafeed-context";


const Home = () => {
  
  return (
    <div className="min-h-screen text-white overflow-x-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-screen z-0 pointer-events-none">
        <BGPattern variant="grid" size={40} fill="rgba(255,255,255,0.03)" mask="fade-edges" />
      </div>
      
      <div className="relative z-10 pt-20 pb-16 px-6 lg:pt-32 lg:pb-32 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto text-left w-full">
          

          <h1 className="mb-8 font-black tracking-tighter leading-[1.1] flex flex-col uppercase">
            <span className="text-2xl lg:text-4xl normal-case font-medium text-white/70">
              Shaping the next generation of 
            </span>
            <span className="text-2xl lg:text-4xl normal-case font-medium text-white/70">
              algorithmic traders
            </span>
            <div className="flex flex-col lg:flex-row lg:gap-4 items-start">
              <span className="text-9xl lg:text-5xl opacity-10">Build.</span>
              <span className="text-9xl lg:text-5xl opacity-30">Backtest.</span>
              <span className="text-9xl lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#FF6D1F] to-[#ff8c4a]">
                Deploy.
              </span>
            </div>
          </h1>

          <div className="flex flex-col sm:flex-row items-start justify-start gap-4 mt-8">
            <button
              
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#FF6D1F] hover:bg-[#e55d1a] text-white font-bold transition-all shadow-lg shadow-[#FF6D1F]/20 flex items-center justify-center gap-2 group text-sm"
            >
              Start Researching{" "}
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
            <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-all flex items-center justify-center gap-2 text-sm">
              View Documentation
            </button>
          </div>
        </div>
      </div>

      {/* Animated Text Section */}
      <div className="relative z-10 w-full py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="w-full flex justify-between mb-12">
            <VaporizeBlock text="AI" label="Strategy Generation" />
            <VaporizeBlock text="10K+" label="Parallel Executions" />
            <VaporizeBlock text="24/7" label="Global Market Coverage" />
            <VaporizeBlock text="5ms" label="Execution Latency" />
          </div>
          
          
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20">
          <TradingList />
        </div>
      </div>
      <div className="h-[20vh] w-full flex flex-col justify-center items-center border-t border-white/20">
            <p className="text-white/30 text-sm uppercase tracking-widest mb-4">Empowering Traders to</p>
            <AnimatedTextCycle
              words={["Analyze.", "Automate.", "Accelerate.", "Succeed."]}
              interval={1000}
              className="text-4xl lg:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-[#FF6D1F] to-[#ff8c4a]"
            />
          </div>
    </div>
  );
};

const VaporizeBlock = ({ text, label }: { text: string; label: string }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  return (
    <div 
      className="h-full w-[20%] rounded-xl text-center flex flex-col items-center justify-center group cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-24 w-full">
        <TextVaporize text={text} />
      </div>
      <span className={`text-[10px] uppercase tracking-[0.2em] font-semibold transition-all duration-300 ${isHovered ? 'text-orange-500' : 'text-white/40'}`}>
        {label}
      </span>
    </div>
  );
};

export default Home;