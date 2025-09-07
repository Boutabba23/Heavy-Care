"use client";

import React from "react";
import BarChart from "./ui/BarChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";

interface TestDashboardChartsProps {
  machines: any[];
  maintenanceRecords: any[];
}

const TestDashboardCharts: React.FC<TestDashboardChartsProps> = ({ 
  machines, 
  maintenanceRecords 
}) => {
  // Test data to verify charts work
  const testData = [
    { label: "Test A", value: 10 },
    { label: "Test B", value: 20 },
    { label: "Test C", value: 15 },
  ];

  // Machine brands data
  const machineBrandsData = React.useMemo(() => {
    console.log('Test: Calculating machine brands data...');
    console.log('Test: Machines input:', machines);
    
    const brandCounts = machines.reduce((acc, machine) => {
      if (machine.marque) {
        acc[machine.marque] = (acc[machine.marque] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    console.log('Test: Brand counts:', brandCounts);

    const data = Object.entries(brandCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    
    console.log('Test: Machine Brands Data:', data);
    return data;
  }, [machines]);

  // Maintenance history data
  const maintenanceHistoryData = React.useMemo(() => {
    console.log('Test: Calculating maintenance history data...');
    console.log('Test: Maintenance records input:', maintenanceRecords);
    
    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const history: Record<string, number> = {};
    const monthLabels: Record<string, string> = {};

    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      const monthLabel = `${monthNames[d.getMonth()]}'${String(
        d.getFullYear()
      ).slice(-2)}`;
      history[monthKey] = 0;
      monthLabels[monthKey] = monthLabel;
    }

    console.log('Test: Initialized history:', history);

    maintenanceRecords.forEach((record, index) => {
      try {
        console.log(`Test: Processing record ${index}:`, record);
        const recordDate = new Date(record.date);
        console.log(`Test: Record date for ${index}:`, recordDate);
        
        if (isNaN(recordDate.getTime())) {
          console.error(`Test: Invalid date for record ${index}:`, record.date);
          return;
        }
        
        const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth()}`;
        console.log(`Test: Month key for record ${index}:`, monthKey);
        
        if (monthKey in history) {
          history[monthKey]++;
          console.log(`Test: Incremented count for ${monthKey}:`, history[monthKey]);
        }
      } catch (error) {
        console.error('Test: Error processing maintenance record:', record, error);
      }
    });

    const data = Object.keys(history).map((key) => ({
      label: monthLabels[key],
      value: history[key],
    }));
    
    console.log('Test: Maintenance History Data:', data);
    return data;
  }, [maintenanceRecords]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Test Dashboard Charts</h2>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Data Chart</CardTitle>
            <CardDescription>
              Simple test chart with fixed data
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[300px]">
            <BarChart data={testData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Machine Brands Data</CardTitle>
            <CardDescription>
              Real data from machines prop
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[300px]">
            <BarChart data={machineBrandsData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Maintenance History Data</CardTitle>
            <CardDescription>
              Real data from maintenance records prop
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[300px]">
            <BarChart data={maintenanceHistoryData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestDashboardCharts;