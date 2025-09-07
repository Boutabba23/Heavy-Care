// Simple test script to verify database schema
// This script can be run in a Node.js environment with the supabase-js package installed

const { createClient } = require("@supabase/supabase-js");

// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const supabaseUrl = "https://yklkxvvoeovksyslcfjy.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbGt4dnZvZW92a3N5c2xjZmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjAyMjcsImV4cCI6MjA2OTQ5NjIyN30.j7Whr8rPAtSwNbSyZ2iTTFEQAGsDI51022l4ZfsIlmo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseSchema() {
  console.log("Testing database schema...");

  try {
    // Test 1: Check if machines table has the new columns
    console.log("Test 1: Checking machines table structure...");
    const { data: machines, error: machinesError } = await supabase
      .from("machines")
      .select("*")
      .limit(1);

    if (machinesError) {
      console.error("Error fetching machines:", machinesError);
      return;
    }

    if (machines && machines.length > 0) {
      const machine = machines[0];
      console.log("Machine structure:", Object.keys(machine));

      // Check if serial_number and registration_number columns exist
      if ("serial_number" in machine) {
        console.log("✓ serial_number column exists");
      } else {
        console.log("✗ serial_number column missing");
      }

      if ("registration_number" in machine) {
        console.log("✓ registration_number column exists");
      } else {
        console.log("✗ registration_number column missing");
      }
    } else {
      console.log("No machines found in database");
    }

    // Test 2: Try to insert a machine with serial_number and registration_number
    console.log("\nTest 2: Testing machine insertion with new columns...");
    const testMachine = {
      id: `test-${Date.now()}`,
      code: "TEST001",
      designation: "Machine de Test",
      marque: "TestBrand",
      type: "TestType",
      serial_number: "SN123456",
      registration_number: "REG789012",
      service_hours: 100,
      assigned_filters: [],
    };

    const { data: insertedMachine, error: insertError } = await supabase
      .from("machines")
      .insert(testMachine)
      .select();

    if (insertError) {
      console.error("Error inserting machine:", insertError);
    } else {
      console.log("✓ Machine inserted successfully with new columns");
      console.log("Inserted machine:", insertedMachine[0]);

      // Clean up test machine
      await supabase.from("machines").delete().eq("id", testMachine.id);
      console.log("✓ Test machine cleaned up");
    }

    console.log("\nDatabase schema test completed.");
  } catch (error) {
    console.error("Error during database schema test:", error);
  }
}

// Run the test
testDatabaseSchema();
