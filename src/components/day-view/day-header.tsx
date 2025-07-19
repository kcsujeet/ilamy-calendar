import { useCalendarContext } from "@/contexts/calendar-context/context";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import dayjs from "dayjs";

export const DayHeader = () => {
  const { currentDate } = useCalendarContext();
  const isToday = currentDate.isSame(dayjs(), "day");

  return (
    <div className="bg-card sticky top-0 z-10 flex items-center justify-center border-b p-2 border-x">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentDate.format("YYYY-MM-DD")}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className={cn(
            "flex items-center text-center text-base font-semibold sm:text-xl",
            isToday && "text-primary"
          )}
        >
          <span className="xs:inline hidden">
            {currentDate.format("dddd, ")}
          </span>
          {currentDate.format("MMMM D, YYYY")}
          {isToday && (
            <span className="bg-primary text-primary-foreground ml-2 rounded-full px-1 py-0.5 text-xs sm:px-2 sm:text-sm">
              Today
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
