'use client';

import { ReactNode } from 'react';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraggableItemListProps<T> {
  items: T[];
  draggedIndex: number | null;
  dataAttribute: string;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onTouchStart: (index: number, e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onRemove?: (item: T, index: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
  showInstructions?: boolean;
}

export function DraggableItemList<T>({
  items,
  draggedIndex,
  dataAttribute,
  onDragStart,
  onDragOver,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onRemove,
  renderItem,
  emptyMessage = 'No items yet',
  showInstructions = true,
}: DraggableItemListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {showInstructions && (
        <p className="text-sm text-gray-600 mb-3">Drag to reorder</p>
      )}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            draggable
            {...{ [dataAttribute]: index }}
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            onTouchStart={(e) => onTouchStart(index, e)}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className={`flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 transition-colors ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
          >
            <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <span className="text-2xl font-bold text-gray-400 w-8 flex-shrink-0">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">{renderItem(item, index)}</div>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item, index)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
