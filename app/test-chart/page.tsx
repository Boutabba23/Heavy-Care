"use client";

import React from "react";
import BarChart from "../../components/ui/BarChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import TestDashboardCharts from "../../components/TestDashboardCharts";

// Sample data for testing
const sampleMachines = [
  { id: "1", marque: "CAT", designation: "Excavator 1", type: "Excavator", code: "CAT001", serviceHours: 1000 },
  { id: "2", marque: "Komatsu", designation: "Excavator 2", type: "Excavator", code: "KOM001", serviceHours: 1200 },
  { id: "3", marque: "CAT", designation: "Bulldozer 1", type: "Bulldozer", code: "CAT002", serviceHours: 800 },
  { id: "4", marque: "Volvo", designation: "Truck 1", type: "Truck", code: "VOL001", serviceHours: 1500 },
  { id: "5", marque: "CAT", designation: "Excavator 3", type: "Excavator", code: "CAT003", serviceHours: 900 },
];

const sampleMaintenanceRecords = [
  { id: "1", machineId: "1", date: "2024-01-15", serviceHours: 1000, gamme: "C", filtersUsed: [] },
  { id: "2", machineId: "1", date: "2024-02-20", serviceHours: 1100, gamme: "D", filtersUsed: [] },
  { id: "3", machineId: "2", date: "2024-03-10", serviceHours: 1200, gamme: "C", filtersUsed: [] },
  { id: "4", machineId: "3", date: "2024-04-05", serviceHours: 800, gamme: "E", filtersUsed: [] },
  { id: "5", machineId: "4", date: "2024-05-12", serviceHours: 1500, gamme: "C", filtersUsed: [] },
];

const TestChartPage = () => {
  // Sample data for testing
  const sampleData = [
    { label: "CAT", value: 15 },
    { label: "Komatsu", value: 12 },
    { label: "Volvo", value: 8 },
    { label: "Liebherr", value: 6 },
    { label: "Hitachi", value: 4 },
  ];

  const sampleMaintenanceData = [
    { label: "Jan'24", value: 25 },
    { label: "Feb'24", value: 18 },
    { label: "Mar'24", value: 22 },
    { label: "Apr'24", value: 30 },
    { label: "May'24", value: 28 },
    { label: "Jun'24", value: 35 },
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Test Charts</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Machine Brands Test</CardTitle>
            <CardDescription>Fixed sample data</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            <BarChart data={sampleData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Maintenance History Test</CardTitle>
            <CardDescription>Fixed sample data</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            <BarChart data={sampleMaintenanceData} />
          </CardContent>
        </Card>
      </div>
      
      <TestDashboardCharts 
        machines={sampleMachines} 
        maintenanceRecords={sampleMaintenanceRecords} 
      />
    </div>
  );
};

export default TestChartPage;