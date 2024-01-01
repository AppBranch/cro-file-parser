import React, { useRef, useState } from "react";
import "./App.css";
import * as XLSX from "xlsx";

function App() {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null); // Ref for the file input

  const processInputFile = (content) => {
    const lines = content.split("\n");
    const entriesMap = {};

    lines.forEach((line) => {
      if (line.startsWith("pY") || line.startsWith("pX")) {
        const parts = line.split("\t").map((part) => part.trim());
        const length = parseInt(parts[1].replace("/", ""), 10);
        const width = parseInt(parts[2].replace("/", ""), 10);
        const name = parts[6].split(" ")[0].replace("/", "");
        const code = parts[6].split(" ")[1].replace("/", "");

        const key = `${length}-${width}-${name}-${code}`;

        if (entriesMap[key]) {
          entriesMap[key].count += 1;
        } else {
          entriesMap[key] = { length, width, name, code, count: 1 };
        }
      }
    });

    // Convert the hashmap back to an array
    return Object.values(entriesMap);
  };

  const handleFileDrop = (file) => {
    setFileName(file.name.split(".").slice(0, -1).join(".")); // Remove the file extension

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const parsedData = processInputFile(content);
      setData(parsedData);
    };
    reader.readAsText(file);
  };

  // Function to handle file selection from the file input
  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name.split(".").slice(0, -1).join(".")); // Remove the file extension
      handleFileDrop(files[0]);
    }
  };

  // Function to trigger file input click
  const onDropzoneClick = () => {
    fileInputRef.current.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileDrop(files[0]);
    }
  };

  const renderTable = () => {
    if (!data || data.length === 0) {
      return null;
    }

    // Group data by material
    const groupedData = data.reduce((acc, item) => {
      acc[item.code] = acc[item.code] || [];
      acc[item.code].push(item);
      return acc;
    }, {});

    let rowNumber = 1;

    return (
      <table>
        <thead>
          <tr>
            <th rowSpan="2">Nr. crt.</th>
            <th rowSpan="2">Denumire</th>
            <th rowSpan="2">Material</th>
            <th colSpan="3">Dimensiuni</th>
          </tr>
          <tr>
            <th>L</th>
            <th>l</th>
            <th>buc</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedData).map(([material, items]) => (
            <React.Fragment key={material}>
              {items.map((item, index) => (
                <tr key={`${material}-${index}`}>
                  <td>{rowNumber++}</td>
                  <td>{item.name}</td>
                  {index === 0 && <td rowSpan={items.length}>{material}</td>}
                  <td>{item.length}</td>
                  <td>{item.width}</td>
                  <td>{item.count}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    );
  };

  const exportToExcel = () => {
    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([[]]); // Start with an empty sheet

    // Custom style for vertical alignment in merged cells
    const verticalAlignMiddle = {
      alignment: { vertical: "center" },
    };

    // Headers
    const headers = ["Nr. crt.", "Denumire", "Material", "Dimensiuni"];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(ws, [["", "", "", "L", "l", "buc"]], {
      origin: "A2",
    });

    // Adding data and tracking material merge ranges
    let rowNumber = 3; // Start from the third row
    const materialMergeRanges = [];
    let currentMaterialStart = rowNumber;
    let previousMaterial = null;

    data.forEach((item, index) => {
      const row = [
        index + 1,
        item.name,
        item.code,
        item.length,
        item.width,
        item.count,
      ];
      XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${rowNumber}` });

      if (previousMaterial !== item.code && previousMaterial !== null) {
        materialMergeRanges.push({
          s: { r: currentMaterialStart - 1, c: 2 },
          e: { r: rowNumber - 2, c: 2 },
        });
        currentMaterialStart = rowNumber;
      }
      previousMaterial = item.code;

      rowNumber++;
    });

    // Add the last material merge range
    materialMergeRanges.push({
      s: { r: currentMaterialStart - 1, c: 2 },
      e: { r: rowNumber - 2, c: 2 },
    });

    // Apply vertical alignment to each merged cell range
    materialMergeRanges.forEach((range) => {
      for (let r = range.s.r; r <= range.e.r; ++r) {
        const cellRef = XLSX.utils.encode_cell({ r: r, c: range.s.c });
        ws[cellRef].s = verticalAlignMiddle;
      }
    });

    // Merge cells for headers and materials
    const merges = [
      { s: { r: 0, c: 3 }, e: { r: 0, c: 5 } }, // Merge cells for "Dimensiuni" header
    ].concat(materialMergeRanges);
    ws["!merges"] = merges;

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Data");

    // Use the stored filename for the exported Excel file
    const excelFileName = fileName ? `${fileName}.xls` : "data.xls";
    XLSX.writeFile(wb, excelFileName);
  };

  const copyTableToClipboard = () => {
    let tableString = "Nr. crt.\tDenumire\tMaterial\tL\tl\tbuc\n"; // Table headers

    // Convert each row of data into a tab-separated string
    data.forEach((item, index) => {
      const row = [
        index + 1,
        item.name,
        item.code,
        item.length,
        item.width,
        item.count,
      ].join("\t"); // Join each cell with a tab

      tableString += row + "\n"; // Add the row to the table string with a newline
    });

    // Copy to clipboard
    navigator.clipboard.writeText(tableString).then(
      () => {
        alert("Table copied to clipboard!");
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className="App">
      <div
        className="drop-zone"
        onClick={onDropzoneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        Drag and drop a .cro file here, or click to select a file
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: "none" }}
        accept=".cro"
      />
      {data && (
        <div className="button-container">
          <button onClick={exportToExcel}>Export Excel</button>
          <button onClick={copyTableToClipboard}>Copy Table</button>
        </div>
      )}
      {data && renderTable()}
    </div>
  );
}

export default App;
