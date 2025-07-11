import { ScrollArea } from "@/components/ui";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import React from "react";
import { WeekAllDayRow } from "./week-all-day-row";
import { WeekHeader } from "./week-header";
import { WeekTimeGrid } from "./week-time-grid";
// Add weekOfYear plugin to dayjs
dayjs.extend(weekOfYear);

const WeekView: React.FC = () => {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Week header row - fixed */}
      <WeekHeader />

      {/* All-day events row - dynamic height based on content */}
      <WeekAllDayRow />

      {/* Scrollable time grid */}
      <ScrollArea className="flex flex-1 overflow-auto">
        <WeekTimeGrid />
      </ScrollArea>
    </div>
  );
};

export default WeekView;
