// ═══════════════════════════════════════
// csvParser.js
// Reads and parses uploaded CSV file
// ═══════════════════════════════════════

// Stores parsed CSV data globally
let parsedData = {
  headers: [],
  rows: [],
};

// Called when user selects a CSV file
function parseCSV(file) {
  return new Promise(function (resolve, reject) {
    // Check if file is CSV
    if (!file.name.endsWith(".csv")) {
      reject("Please upload a valid .csv file.");
      return;
    }

    // Check file size max 5MB
    if (file.size > 5 * 1024 * 1024) {
      reject("File size exceeds 5MB limit.");
      return;
    }

    let reader = new FileReader();

    // When file is read successfully
    reader.onload = function (event) {
      let text = event.target.result;
      let result = processCSVText(text);

      if (result.headers.length === 0) {
        reject("CSV file appears to be empty.");
        return;
      }

      parsedData = result;
      resolve(result);
    };

    // If reading fails
    reader.onerror = function () {
      reject("Failed to read the file. Please try again.");
    };

    // Start reading file as text
    reader.readAsText(file);
  });
}

// Converts raw CSV text into headers and rows
function processCSVText(text) {
  let lines = text.trim().split("\n");

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // First line = column headers
  let headers = lines[0].split(",").map(function (h) {
    return h.trim().replace(/"/g, "");
  });

  // Remaining lines = data rows
  let rows = [];
  for (let i = 1; i < lines.length; i++) {
    let values = lines[i].split(",").map(function (v) {
      return v.trim().replace(/"/g, "");
    });

    if (values.length === headers.length) {
      let row = {};
      headers.forEach(function (header, index) {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }

  return { headers: headers, rows: rows };
}

// Get labels — first column values for chart
function getLabels() {
  return parsedData.rows.map(function (row) {
    return row[parsedData.headers[0]];
  });
}

// Get values — second column numeric values for chart
function getValues() {
  return parsedData.rows.map(function (row) {
    return parseFloat(row[parsedData.headers[1]]) || 0;
  });
}

// Get summary stats from parsed data
function getSummary() {
  let values = getValues();
  let total = values.reduce(function (a, b) {
    return a + b;
  }, 0);
  let average = values.length > 0 ? total / values.length : 0;
  let max = Math.max(...values);
  let min = Math.min(...values);

  return {
    total: total.toFixed(2),
    average: average.toFixed(2),
    max: max.toFixed(2),
    min: min.toFixed(2),
    rowCount: parsedData.rows.length,
  };
}
