import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useCalendarContext } from "@/contexts/calendar-context/context";
import dayjs from "dayjs";

interface DroppableCellProps {
  id: string;
  type: "day-cell" | "time-cell";
  date: dayjs.Dayjs;
  hour?: number;
  minute?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function DroppableCell({
  id,
  type,
  date,
  hour,
  minute,
  children,
  className,
  style,
}: DroppableCellProps) {
  const { onDateClick, disableDragAndDrop, disableDateClick } =
    useCalendarContext();
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type,
      date,
      hour,
      minute,
    },
    disabled: disableDragAndDrop,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && !disableDragAndDrop && "bg-accent",
        disableDateClick ? "cursor-default" : "cursor-pointer"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onDateClick(date);
      }}
      style={style}
    >
      {children}
    </div>
  );
}
