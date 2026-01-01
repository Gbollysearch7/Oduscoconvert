'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ConversionResult } from '@/lib/types';

interface SpreadsheetPreviewProps {
  result: ConversionResult;
  onDownload: () => void;
  onBack: () => void;
}

interface CellPosition {
  tableIndex: number;
  row: number;
  col: number;
}

export function SpreadsheetPreview({ result, onDownload, onBack }: SpreadsheetPreviewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: CellPosition; end: CellPosition } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const tables = result.tables;
  const activeTable = tables[activeTab];

  // Get column letters (A, B, C, ... Z, AA, AB, etc.)
  const getColumnLabel = (index: number): string => {
    let label = '';
    let num = index;
    while (num >= 0) {
      label = String.fromCharCode((num % 26) + 65) + label;
      num = Math.floor(num / 26) - 1;
    }
    return label;
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ tableIndex: activeTab, row, col });
    setSelectedRange(null);
  };

  // Handle cell mouse down for range selection
  const handleCellMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    const pos = { tableIndex: activeTab, row, col };
    setSelectedCell(pos);
    setSelectedRange({ start: pos, end: pos });
  };

  // Handle cell mouse enter during selection
  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting && selectedRange) {
      setSelectedRange({
        start: selectedRange.start,
        end: { tableIndex: activeTab, row, col },
      });
    }
  };

  // Handle mouse up to end selection
  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Check if cell is in selected range
  const isCellInRange = (row: number, col: number): boolean => {
    if (!selectedRange || selectedRange.start.tableIndex !== activeTab) return false;
    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // Check if cell is the primary selected cell
  const isCellSelected = (row: number, col: number): boolean => {
    return selectedCell?.tableIndex === activeTab && selectedCell?.row === row && selectedCell?.col === col;
  };

  // Get max columns across all rows
  const maxColumns = activeTable ? Math.max(...activeTable.rows.map((row) => row.length)) : 0;

  // Get letterhead rows count for this table
  const letterheadRows = activeTable?.letterhead || [];
  const letterheadCount = letterheadRows.length;

  // Total rows including letterhead
  const totalRowCount = letterheadCount + (activeTable?.rows.length || 0);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || selectedCell.tableIndex !== activeTab) return;

      const { row, col } = selectedCell;
      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case 'ArrowUp':
          newRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(totalRowCount - 1, row + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, col - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(maxColumns - 1, col + 1);
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            newCol = col > 0 ? col - 1 : maxColumns - 1;
            if (col === 0) newRow = Math.max(0, row - 1);
          } else {
            newCol = col < maxColumns - 1 ? col + 1 : 0;
            if (col === maxColumns - 1) newRow = Math.min(totalRowCount - 1, row + 1);
          }
          break;
        default:
          return;
      }

      setSelectedCell({ tableIndex: activeTab, row: newRow, col: newCol });
      setSelectedRange(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, activeTab, activeTable, maxColumns, totalRowCount]);

  if (!tables.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No tables found in this PDF</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-icons-round text-xl">arrow_back</span>
            Back
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-green-600 text-xl">table_chart</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {tables.length} Table{tables.length !== 1 ? 's' : ''} Found
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cell info */}
          {selectedCell && selectedCell.tableIndex === activeTab && (
            <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono text-gray-600 dark:text-gray-300">
              {getColumnLabel(selectedCell.col)}{selectedCell.row + 1}
              {selectedRange && selectedRange.start !== selectedRange.end && (
                <span className="text-gray-400">
                  :{getColumnLabel(selectedRange.end.col)}{selectedRange.end.row + 1}
                </span>
              )}
            </div>
          )}
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            <span className="material-icons-round text-xl">download</span>
            Download Excel
          </button>
        </div>
      </div>

      {/* Formula bar / Cell preview */}
      <div className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-16 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-center text-gray-600 dark:text-gray-300">
          {selectedCell && selectedCell.tableIndex === activeTab
            ? `${getColumnLabel(selectedCell.col)}${selectedCell.row + 1}`
            : ''}
        </div>
        <div className="mx-2 h-6 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded text-sm text-gray-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap">
          {selectedCell && selectedCell.tableIndex === activeTab
            ? selectedCell.row < letterheadCount
              ? letterheadRows[selectedCell.row] || '' // Letterhead row
              : activeTable?.rows[selectedCell.row - letterheadCount]?.[selectedCell.col] || '' // Table data row
            : 'Select a cell to view its content'}
        </div>
      </div>

      {/* Spreadsheet Area */}
      <div className="flex-1 overflow-hidden">
        <div ref={tableRef} className="h-full overflow-auto">
          <table className="border-collapse min-w-full">
            {/* Column Headers */}
            <thead className="sticky top-0 z-10">
              <tr>
                {/* Row number header */}
                <th className="sticky left-0 z-20 w-12 min-w-12 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400" />
                {/* Column headers A, B, C... */}
                {Array.from({ length: maxColumns }).map((_, colIndex) => (
                  <th
                    key={colIndex}
                    className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 min-w-[100px]"
                  >
                    {getColumnLabel(colIndex)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Letterhead rows - single merged-style column spanning all columns */}
              {letterheadRows.map((text, letterheadIndex) => (
                <tr key={`letterhead-${letterheadIndex}`}>
                  {/* Row number */}
                  <td className="sticky left-0 z-10 bg-amber-100 dark:bg-amber-900/30 border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 text-center">
                    {letterheadIndex + 1}
                  </td>
                  {/* Letterhead cell - spans all columns visually */}
                  <td
                    colSpan={maxColumns}
                    onClick={() => handleCellClick(letterheadIndex, 0)}
                    onMouseDown={() => handleCellMouseDown(letterheadIndex, 0)}
                    onMouseEnter={() => handleCellMouseEnter(letterheadIndex, 0)}
                    className={cn(
                      'border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm cursor-cell transition-colors select-none',
                      'bg-amber-50 dark:bg-amber-900/10 font-medium text-gray-800 dark:text-gray-200',
                      // Selected cell
                      isCellSelected(letterheadIndex, 0) && 'ring-2 ring-green-500 ring-inset bg-amber-100 dark:bg-amber-900/30',
                      // In selection range
                      isCellInRange(letterheadIndex, 0) && !isCellSelected(letterheadIndex, 0) && 'bg-amber-100/50 dark:bg-amber-900/20'
                    )}
                    title={text}
                  >
                    {text}
                  </td>
                </tr>
              ))}
              {/* Table data rows */}
              {activeTable?.rows.map((row, dataRowIndex) => {
                const actualRowIndex = letterheadCount + dataRowIndex;
                const isHeader = dataRowIndex === 0;

                return (
                  <tr key={`data-${dataRowIndex}`}>
                    {/* Row number */}
                    <td className="sticky left-0 z-10 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 text-center">
                      {actualRowIndex + 1}
                    </td>
                    {/* Data cells */}
                    {Array.from({ length: maxColumns }).map((_, colIndex) => {
                      const cellValue = row[colIndex] || '';
                      const isSelected = isCellSelected(actualRowIndex, colIndex);
                      const isInRange = isCellInRange(actualRowIndex, colIndex);

                      return (
                        <td
                          key={colIndex}
                          onClick={() => handleCellClick(actualRowIndex, colIndex)}
                          onMouseDown={() => handleCellMouseDown(actualRowIndex, colIndex)}
                          onMouseEnter={() => handleCellMouseEnter(actualRowIndex, colIndex)}
                          className={cn(
                            'border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm cursor-cell transition-colors select-none',
                            'min-w-[100px] max-w-[300px] truncate',
                            // Header row styling
                            isHeader && 'bg-green-50 dark:bg-green-900/20 font-semibold text-gray-900 dark:text-white',
                            // Normal cell
                            !isHeader && 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                            // Alternating rows
                            !isHeader && dataRowIndex % 2 === 0 && 'bg-gray-50 dark:bg-gray-800/50',
                            // Selected cell
                            isSelected && 'ring-2 ring-green-500 ring-inset bg-green-100 dark:bg-green-900/40',
                            // In selection range
                            isInRange && !isSelected && 'bg-green-50 dark:bg-green-900/20'
                          )}
                          title={cellValue}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 overflow-x-auto">
        {tables.map((table, index) => (
          <button
            key={index}
            onClick={() => {
              setActiveTab(index);
              setSelectedCell(null);
              setSelectedRange(null);
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
              activeTab === index
                ? 'bg-white dark:bg-gray-900 text-green-600 dark:text-green-400 border-t-2 border-green-500'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
            )}
          >
            <span className="material-icons-round text-base">
              {activeTab === index ? 'table_chart' : 'grid_on'}
            </span>
            {table.title || table.source || `Table ${index + 1}`}
            <span className="text-xs text-gray-400">
              ({table.rows.length} rows)
            </span>
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>Rows: {totalRowCount}</span>
          {letterheadCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400">({letterheadCount} header)</span>
          )}
          <span>Columns: {maxColumns}</span>
          {selectedRange && (
            <span>
              Selected: {Math.abs(selectedRange.end.row - selectedRange.start.row) + 1} x{' '}
              {Math.abs(selectedRange.end.col - selectedRange.start.col) + 1} cells
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-sm text-green-500">check_circle</span>
          Ready to download
        </div>
      </div>
    </div>
  );
}
