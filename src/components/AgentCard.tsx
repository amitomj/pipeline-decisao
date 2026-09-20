import { Agent } from "../types";
import { Sparkles } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}

export default function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-neutral-900 bg-neutral-900 text-white shadow-md scale-[1.01]"
          : "border-gray-200 bg-white text-gray-950 hover:bg-gray-50 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <span
            className={`text-2xl p-2 rounded-xl flex items-center justify-center ${
              isSelected ? "bg-white/10" : "bg-neutral-50"
            }`}
          >
            {agent.avatarEmoji}
          </span>
          <div>
            <h3 className="font-sans font-semibold text-sm leading-tight tracking-tight">
              {agent.name}
            </h3>
            <span
              className={`inline-block text-[10px] font-medium mt-1 px-2 py-0.5 rounded-full ${
                isSelected
                  ? "bg-white/15 text-white/90"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {agent.badge}
            </span>
          </div>
        </div>
        {isSelected && (
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        )}
      </div>
      <p
        className={`text-xs mt-3 leading-relaxed font-sans ${
          isSelected ? "text-white/80" : "text-gray-550"
        }`}
      >
        {agent.description}
      </p>
    </button>
  );
}
