import React from "react";

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  // Debug log
  console.log('BarChart received data:', data);
  console.log('BarChart data type:', typeof data);
  
  // More robust check for empty data
  if (!data) {
    console.log('BarChart: data is null or undefined');
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-muted-foreground">
        Aucune donnée disponible.
      </div>
    );
  }
  
  if (!Array.isArray(data)) {
    console.log('BarChart: data is not an array');
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-muted-foreground">
        Format de données invalide.
      </div>
    );
  }
  
  console.log('BarChart data length:', data.length);
  
  if (data.length === 0) {
    console.log('BarChart: data array is empty');
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-muted-foreground">
        Aucune donnée à afficher pour ce graphique.
      </div>
    );
  }

  // Filter out any invalid data points
  const validData = data.filter(item => 
    item && 
    typeof item.label === 'string' && 
    typeof item.value === 'number' && 
    !isNaN(item.value) &&
    isFinite(item.value) &&
    item.value >= 0
  );

  console.log('BarChart valid data:', validData);
  console.log('BarChart valid data length:', validData.length);

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-muted-foreground">
        Aucune donnée valide à afficher pour ce graphique.
      </div>
    );
  }

  // Calculate max value, ensuring it's at least 1 to avoid division by zero
  const maxValue = Math.max(...validData.map((d) => d.value), 1);

  // Debug log
  console.log('BarChart maxValue:', maxValue);

  return (
    <div className="w-full min-h-[300px] h-64 flex items-end justify-around gap-2 px-4 pt-4">
      {validData.map((item, index) => {
        // Calculate bar height as a percentage, ensuring it's between 0 and 100
        const barHeight = Math.min(Math.max((item.value / maxValue) * 100, 5), 100); // Minimum 5% height for visibility
        const animationDelay = `${index * 50}ms`;

        return (
          <div
            key={item.label}
            className="flex-1 flex flex-col items-center justify-end group"
            style={{ minWidth: "20px", maxWidth: "60px" }}
          >
            <div className="relative w-full bg-primary/20 rounded-t-md border-2 border-foreground/15 transition-all duration-300 group-hover:bg-primary/30 flex flex-col justify-end h-full">
              <div
                className="w-full bg-primary rounded-t-md border-2 border-foreground origin-bottom animate-slideInUp"
                style={{
                  height: `${barHeight}%`,
                  animationDelay,
                  animationFillMode: "backwards",
                }}
                title={`${item.label}: ${item.value}`}
              ></div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs font-bold bg-card px-2 py-1 rounded-lg border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]">
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