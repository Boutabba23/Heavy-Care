import React from "react";

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[250px] text-sm text-muted-foreground">
        Aucune donnée à afficher pour ce graphique.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1); // Avoid division by zero

  return (
    <div className="w-full h-64 flex items-end justify-around gap-2 px-4 pt-4 border-t border-border -mt-px">
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * 100;
        const animationDelay = `${index * 50}ms`;

        return (
          <div
            key={item.label}
            className="flex-1 flex flex-col items-center justify-end group"
            style={{ minWidth: "20px", maxWidth: "60px" }}
          >
            <div className="relative w-full bg-primary/20 rounded-t-lg transition-all duration-300 group-hover:bg-primary/40">
              <div
                className="w-full bg-primary rounded-t-lg origin-bottom animate-slideInUp"
                style={{
                  height: `${barHeight}%`,
                  animationDelay,
                  animationFillMode: "backwards",
                }}
                title={`${item.label}: ${item.value}`}
              ></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs font-bold bg-card px-2 py-1 rounded-lg shadow-lg border">
                {item.value}
              </div>
            </div>
            <span className="text-xs mt-2 text-muted-foreground truncate w-full text-center">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
