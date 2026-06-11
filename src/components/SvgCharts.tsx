import { useState } from "react";
import { HistoricalRecord, Participant } from "../types";
import { TrendingUp, Award, Activity } from "lucide-react";

interface SvgChartsProps {
  history: HistoricalRecord[];
  participants: Participant[];
}

export default function SvgCharts({ history, participants }: SvgChartsProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    participantName: string;
    dayIndex: number;
    points: number;
    x: number;
    y: number;
  } | null>(null);

  if (history.length === 0) {
    return (
      <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-800 text-center text-slate-400">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-lg font-medium text-slate-300">No Matchday History Loaded Yet</p>
        <p className="text-sm text-slate-500 mt-1">Standings data and trendlines will be graphed dynamic as you progress and fetch results!</p>
      </div>
    );
  }

  // Dimensions of the line chart
  const width = 600;
  const height = 300;
  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 40;

  // Compute scale boundaries
  const maxDayIndex = history.length;
  const maxPoints = Math.max(
    ...history.flatMap(h => h.participantStandings.map(s => s.points)),
    10 // fallback minimum max
  );

  const getX = (dayIndex: number) => {
    if (maxDayIndex <= 1) return paddingLeft + (width - paddingLeft - paddingRight) / 2;
    return (
      paddingLeft +
      ((dayIndex - 1) / (maxDayIndex - 1)) * (width - paddingLeft - paddingRight)
    );
  };

  const getY = (pts: number) => {
    return (
      height -
      paddingBottom -
      (pts / maxPoints) * (height - paddingTop - paddingBottom)
    );
  };

  // Generate paths for each participant
  const chartLines = participants.map(p => {
    const pointsList: { dayIndex: number; points: number }[] = [];
    
    // Day 0: Baseline of 0 points
    pointsList.push({ dayIndex: 0, points: 0 });

    history.forEach((h, idx) => {
      const ps = h.participantStandings.find(s => s.participant === p.name);
      if (ps) {
        pointsList.push({ dayIndex: h.dayIndex, points: ps.points });
      }
    });

    const coordinates = pointsList.map((pt, i) => {
      // Scale day index slightly to fit from day 0 to maxDayIndex
      const x = paddingLeft + (i / pointsList.length) * (width - paddingLeft - paddingRight);
      const y = getY(pt.points);
      return { x, y, dayIndex: pt.dayIndex, points: pt.points };
    });

    let pathD = "";
    if (coordinates.length > 0) {
      pathD = `M ${coordinates[0].x} ${coordinates[0].y} ` +
        coordinates.slice(1).map(c => `L ${c.x} ${c.y}`).join(" ");
    }

    return {
      participant: p.name,
      color: p.color,
      path: pathD,
      coordinates
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-outfit">
      {/* Standings points over time Svg line chart */}
      <div className="lg:col-span-2 bento-card relative overflow-hidden p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400/10 text-yellow-400 rounded-xl border border-yellow-400/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bungee text-lg text-slate-100 uppercase tracking-tight">PERFORMANCE PROGRESSION</h3>
              <p className="text-xs text-slate-400 font-outfit">How game contenders sweepstake scores evolve day by day</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-bungee bg-slate-950 px-3 py-1 rounded-lg border-2 border-slate-900 uppercase">
            Day: {history.length}
          </div>
        </div>

        {/* SVG Container */}
        <div className="relative w-full aspect-[2/1] bg-slate-950 rounded-2xl border-2 border-slate-900 p-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full text-slate-800"
          >
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const yVal = height - paddingBottom - ratio * (height - paddingTop - paddingBottom);
              const pointVal = Math.round(ratio * maxPoints);
              return (
                <g key={idx} className="opacity-30">
                  <line
                    x1={paddingLeft}
                    y1={yVal}
                    x2={width - paddingRight}
                    y2={yVal}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={yVal + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[10px] font-mono"
                  >
                    {pointVal}
                  </text>
                </g>
              );
            })}

            {/* X-Axis labels for matchdays */}
            {history.map((h, idx) => {
              const xPos = paddingLeft + ((idx + 1) / (history.length + 1)) * (width - paddingLeft - paddingRight);
              return (
                <text
                  key={idx}
                  x={xPos}
                  y={height - 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px] font-mono opacity-50"
                >
                  D{h.dayIndex}
                </text>
              );
            })}
            
            {/* Base origin x label */}
            <text
              x={paddingLeft}
              y={height - 20}
              textAnchor="middle"
              className="fill-slate-500 text-[9px] font-mono opacity-50"
            >
              Start
            </text>

            {/* Colored lines for players */}
            {chartLines.map((line, idx) => (
              <g key={idx}>
                {/* Glow under line */}
                <path
                  d={line.path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="5"
                  className="opacity-15 blur-sm"
                />
                {/* Main line */}
                <path
                  d={line.path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Hot vertices */}
                {line.coordinates.map((coord, cIdx) => (
                  <circle
                    key={cIdx}
                    cx={coord.x}
                    cy={coord.y}
                    r={hoveredPoint?.participantName === line.participant && hoveredPoint?.dayIndex === coord.dayIndex ? "6" : "3.5"}
                    className="transition-all duration-150 cursor-pointer"
                    fill={line.color}
                    stroke="#0b1329"
                    strokeWidth="1.5"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        participantName: line.participant,
                        dayIndex: coord.dayIndex,
                        points: coord.points,
                        x: coord.x,
                        y: coord.y,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </g>
            ))}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute p-3 rounded-xl bg-slate-950/95 border-2 border-slate-900 shadow-2xl text-xs z-50 pointer-events-none transition-all duration-75"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100 - 15}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-slate-105 font-bungee text-slate-100 uppercase">
                <span
                  className="w-2.5 h-2.5 rounded-full block"
                  style={{
                    backgroundColor:
                      participants.find(p => p.name === hoveredPoint.participantName)?.color || "#94a3b8"
                  }}
                />
                {hoveredPoint.participantName}
              </div>
              <div className="mt-1 text-slate-400">
                Matchday: <span className="text-slate-200 font-mono font-bold">D{hoveredPoint.dayIndex}</span>
              </div>
              <div className="text-slate-400">
                Sweepstake Pts: <span className="text-yellow-400 font-bold">{hoveredPoint.points} XP</span>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-5 px-1">
          {participants.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-lg block border-2 border-slate-950"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-xs font-bungee text-slate-300 tracking-wide">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic probability chart/survival ranking */}
      <div className="bento-card relative overflow-hidden flex flex-col justify-between p-6">
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bungee text-lg text-slate-100 uppercase tracking-tight">WIN PATH POTENTIAL</h3>
              <p className="text-xs text-slate-400 font-outfit">Aggregated success probability statistics</p>
            </div>
          </div>

          <div className="space-y-4 my-2">
            {participants.map((p, idx) => {
              const latestStandings = history[history.length - 1]?.participantStandings || [];
              const participantData = latestStandings.find(s => s.participant === p.name);
              const probability = participantData ? participantData.combinedProb : 0;
              
              return (
                <div key={idx} className="space-y-2 bg-slate-950/80 p-3 rounded-xl border-2 border-slate-900/60 font-outfit">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    <span className="text-yellow-400 font-bungee">
                      {probability}%
                    </span>
                  </div>
                  {/* Progress gauge */}
                  <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: p.color,
                        width: `${Math.min(100, probability)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t-2 border-slate-900 bg-slate-950/40 -mx-6 -mb-6 p-5 rounded-b-3xl text-xs text-slate-400 leading-relaxed font-outfit">
          <span className="text-yellow-400 font-bungee uppercase tracking-wide block mb-1">💡 Real-time Probability Sweep</span>
          A contender's path to winning scales with the aggregated FIFA success probabilities of their remaining active teams, computed dynamically as results settle.
        </div>
      </div>
    </div>
  );
}
