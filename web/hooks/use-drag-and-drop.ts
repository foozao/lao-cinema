import { useState, useCallback } from 'react';

export interface UseDragAndDropOptions<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  onReorderComplete?: (items: T[]) => Promise<void>;
}

export interface UseDragAndDropReturn {
  draggedIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  handleTouchStart: (index: number, e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent, dataAttribute: string) => void;
  handleTouchEnd: () => void;
}

export function useDragAndDrop<T>({
  items,
  onReorder,
  onReorderComplete,
}: UseDragAndDropOptions<T>): UseDragAndDropReturn {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      const newItems = [...items];
      const draggedItem = newItems[draggedIndex];
      newItems.splice(draggedIndex, 1);
      newItems.splice(index, 0, draggedItem);

      onReorder(newItems);
      setDraggedIndex(index);
    },
    [draggedIndex, items, onReorder]
  );

  const handleDragEnd = useCallback(async () => {
    if (onReorderComplete && draggedIndex !== null) {
      await onReorderComplete(items);
    }
    setDraggedIndex(null);
  }, [draggedIndex, items, onReorderComplete]);

  const handleTouchStart = useCallback((index: number, e: React.TouchEvent) => {
    setDraggedIndex(index);
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent, dataAttribute: string) => {
      if (draggedIndex === null || touchStartY === null) return;

      e.preventDefault();
      const touchY = e.touches[0].clientY;

      // Find which element the touch is over
      const elements = document.elementsFromPoint(e.touches[0].clientX, touchY);
      const targetItem = elements.find((el) => el.hasAttribute(dataAttribute));

      if (targetItem) {
        const overIndex = parseInt(targetItem.getAttribute(dataAttribute) || '0');

        if (overIndex !== draggedIndex) {
          const newItems = [...items];
          const draggedItem = newItems[draggedIndex];
          newItems.splice(draggedIndex, 1);
          newItems.splice(overIndex, 0, draggedItem);

          onReorder(newItems);
          setDraggedIndex(overIndex);
        }
      }
    },
    [draggedIndex, touchStartY, items, onReorder]
  );

  const handleTouchEnd = useCallback(async () => {
    if (onReorderComplete && draggedIndex !== null) {
      await onReorderComplete(items);
    }
    setDraggedIndex(null);
    setTouchStartY(null);
  }, [draggedIndex, items, onReorderComplete]);

  return {
    draggedIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
