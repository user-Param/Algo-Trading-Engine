import { ArrowRight } from "lucide-react";
import  Link  from "next/link";


const data = [
  { title: "Native AI",        color: "pink",    path: "/research" },
  { title: "Strategy Engine",  color: "green",   path: "/research" },
  { title: "Backtesting Lab",  color: "purple",  path: "/simulate" },
  { title: "Instant Deployment", color: "red",   path: "/trade" },
  { title: "Community",        color: "blue",    path: "/social" },
];

const Particle = ({ color }: { color: string }) => {
  return (
    <div 
      className="absolute inset-0 opacity-20"
      style={{
        background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
        filter: 'blur(10px)'
      }}
    />
  );
};

export default function TradingList() {
  return (
    <div className="w-full text-white">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-8 border-b border-white/10 text-sm tracking-widest text-white/60">
        <span className="text-lg tracking-[0.3em]">BLNK Token coming soon...</span>
        <span className="text-green-400">1.67% △</span>
      </div>

      List
      <div>
        {data.map((item, i) => (
          <Link
            key={i}
            href={item.path}
            className="group flex items-center justify-between px-8 py-8 border-b border-white/5 hover:bg-white/[0.02] transition-all duration-300 cursor-pointer"
          >
            <span className="text-xl text-white/90">{item.title}</span>
            <div className="flex items-center gap-6">
              <div className="w-24 h-20 rounded-xl bg-[#111] relative overflow-hidden">
                <Particle color={item.color} />
              </div>
              <ArrowRight className="text-white/40 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Row({ title, color }) {
  return (
    <div className="group flex items-center justify-between px-8 py-8 border-b border-white/5 hover:bg-white/[0.02] transition-all duration-300">
      
      {/* Left Text */}
      <span className="text-xl text-white/90">{title}</span>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        
        {/* Preview Box */}
        <div className="w-24 h-20 rounded-xl bg-[#111] relative overflow-hidden">
          <Particle color={color} />
        </div>

        {/* Arrow */}
        <ArrowRight className="text-white/40 group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </div>
  );
}
