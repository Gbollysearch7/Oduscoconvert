'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ConversionResult } from '@/lib/types';

interface TablePreviewProps {
  result: ConversionResult;
}

export function TablePreview({ result }: TablePreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (result.mode === 'text') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Extracted Text Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[300px] overflow-auto rounded-lg border bg-muted/30 p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-medium">Page</th>
                  <th className="px-2 py-2 text-left font-medium">Content</th>
                </tr>
              </thead>
              <tbody>
                {result.textContent.slice(0, 10).map((item, index) => (
                  <tr key={index} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-2 text-muted-foreground">{item.page}</td>
                    <td className="px-2 py-2 truncate max-w-[400px]">{item.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.textContent.length > 10 && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Showing 10 of {result.textContent.length} rows
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const tables = result.tables;
  const currentTable = tables[activeIndex];

  if (!currentTable) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table className="h-4 w-4" />
            {tables.length > 1 ? `Table ${activeIndex + 1} of ${tables.length}` : 'Extracted Table'}
          </CardTitle>
          {tables.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                disabled={activeIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setActiveIndex((i) => Math.min(tables.length - 1, i + 1))}
                disabled={activeIndex === tables.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{currentTable.source}</p>
      </CardHeader>
      <CardContent>
        <div className="max-h-[300px] overflow-auto rounded-lg border bg-muted/30">
          <table className="w-full text-sm">
            <tbody>
              {currentTable.rows.slice(0, 15).map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex === 0 ? 'bg-muted font-medium' : 'border-t border-border/50'}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2 truncate max-w-[200px]"
                      title={cell}
                    >
                      {cell || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {currentTable.rows.length > 15 && (
            <p className="border-t p-2 text-center text-xs text-muted-foreground">
              Showing 15 of {currentTable.rows.length} rows
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          {currentTable.rows.length} rows × {currentTable.rows[0]?.length || 0} columns
        </p>
      </CardContent>
    </Card>
  );
}
