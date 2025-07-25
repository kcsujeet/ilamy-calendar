# Event Recurrence Feature

The Ilamy Calendar now includes a comprehensive Google Calendar-style event recurrence system that allows users to create repeating events with advanced scheduling options.

## Features

### 🔄 **Flexible Recurrence Patterns**
- **Daily**: Repeat every N days
- **Weekly**: Repeat every N weeks with specific day selection
- **Monthly**: Repeat every N months
- **Yearly**: Repeat every N years

### 📅 **Day-of-Week Selection** (Weekly Recurrence)
When using weekly recurrence, users can select specific days of the week:
- Individual day selection (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- Multiple day combinations (e.g., weekdays only, weekends only)
- Custom patterns (e.g., Mon/Wed/Fri)

### ⏱️ **End Conditions**
Three ways to control when recurrence stops:
1. **Never**: Event repeats indefinitely
2. **On Date**: Event stops repeating after a specific date
3. **After N Occurrences**: Event stops after a set number of instances

### 🚫 **Exception Handling**
- Skip specific dates (holidays, vacations)
- Maintain recurrence pattern while excluding selected dates

## Usage

### Basic Implementation

```tsx
import { IlamyCalendar, EventForm, RecurrenceEditor } from '@ilamy/calendar'
import { RecurrenceHandler } from '@ilamy/calendar/lib'

// Create a recurring event
const recurringEvent = {
  id: '1',
  title: 'Weekly Team Meeting',
  start: dayjs().day(1).hour(9), // Monday 9 AM
  end: dayjs().day(1).hour(10),   // Monday 10 AM
  recurrence: {
    frequency: 'weekly',
    interval: 1,
    endType: 'never',
    daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
  }
}
```

### Using the RecurrenceEditor Component

```tsx
import { RecurrenceEditor } from '@ilamy/calendar'

function MyEventForm() {
  const [recurrence, setRecurrence] = useState()

  return (
    <form>
      {/* Other event fields */}
      
      <RecurrenceEditor
        initialRecurrence={recurrence}
        onChange={setRecurrence}
      />
    </form>
  )
}
```

### Generating Recurring Instances

```tsx
import { RecurrenceHandler } from '@ilamy/calendar/lib'

// Generate recurring events for a date range
const recurringInstances = RecurrenceHandler.generateRecurringEvents(
  baseEvent,
  startDate,
  endDate
)

// Get human-readable description
const description = RecurrenceHandler.getRecurrenceDescription(recurrence)
// Output: "Weekly on Mon, Wed, Fri"
```

## Recurrence Data Structure

### RecurrenceHandler Interface

```typescript
interface RecurrenceHandler {
  /** How often the event repeats */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  
  /** Interval between repetitions */
  interval: number
  
  /** How the recurrence should end */
  endType: 'never' | 'on' | 'after'
  
  /** End date (when endType is 'on') */
  endDate?: dayjs.Dayjs
  
  /** Max occurrences (when endType is 'after') */
  count?: number
  
  /** Days of week for weekly recurrence (0=Sunday, 6=Saturday) */
  daysOfWeek?: number[]
  
  /** Dates to exclude from the pattern */
  exceptions?: dayjs.Dayjs[]
}
```

## Examples

### 1. Daily Standup (Weekdays Only)

```typescript
const dailyStandup = {
  title: 'Daily Standup',
  recurrence: {
    frequency: 'weekly',
    interval: 1,
    endType: 'never',
    daysOfWeek: [1, 2, 3, 4, 5] // Monday through Friday
  }
}
```

### 2. Monthly All-Hands Meeting

```typescript
const monthlyMeeting = {
  title: 'All-Hands Meeting',
  recurrence: {
    frequency: 'monthly',
    interval: 1,
    endType: 'after',
    count: 12 // One year
  }
}
```

### 3. Quarterly Business Review

```typescript
const quarterlyReview = {
  title: 'Quarterly Business Review',
  recurrence: {
    frequency: 'monthly',
    interval: 3, // Every 3 months
    endType: 'on',
    endDate: dayjs('2025-12-31')
  }
}
```

### 4. Weekly Team Meeting with Exceptions

```typescript
const weeklyMeeting = {
  title: 'Team Meeting',
  recurrence: {
    frequency: 'weekly',
    interval: 1,
    endType: 'never',
    daysOfWeek: [2], // Tuesdays
    exceptions: [
      dayjs('2025-12-25'), // Christmas
      dayjs('2025-01-01')  // New Year
    ]
  }
}
```

## UI Components

### RecurrenceEditor

The `RecurrenceEditor` component provides a Google Calendar-style interface for setting up recurrence patterns:

**Props:**
- `initialRecurrence?: RecurrenceHandler` - Pre-populate with existing recurrence
- `onChange: (recurrence: RecurrenceHandler | undefined) => void` - Callback when recurrence changes

**Features:**
- Checkbox to enable/disable recurrence
- Frequency and interval selection
- Day-of-week buttons for weekly recurrence
- End condition options (never/on date/after count)
- Live preview of the recurrence pattern

### Integration with EventForm

The enhanced `EventForm` component automatically includes the `RecurrenceEditor` and handles:
- Form state management
- Validation
- Proper data formatting

## Calendar Integration

The calendar system automatically:
- Processes recurring events in the background
- Generates instances within the visible date range
- Handles performance optimization (±2 years from current view)
- Updates when base events change

## Performance Considerations

### Optimizations
- **Smart Range Generation**: Only generates instances within ±2 years of current view
- **Lazy Processing**: Recurrence instances are computed as needed
- **Memory Efficient**: Uses virtual event instances, not storing each occurrence
- **Safety Limits**: Prevents infinite loops with maximum occurrence limits

### Best Practices
- Use reasonable end dates for long-running recurrences
- Consider using exceptions sparingly for better performance
- Monitor recurrence complexity in high-frequency patterns

## Advanced Usage

### Custom Recurrence Logic

```typescript
// Extend the RecurrenceHandler class for custom patterns
class CustomRecurrence extends RecurrenceHandler {
  static generateBusinessDaysOnly(baseEvent, start, end) {
    // Custom logic for business days only
  }
}
```

### Integration with External Calendars

```typescript
// Convert to/from common calendar formats
function toICalRRule(recurrence: RecurrenceHandler): string {
  // Convert to RFC 5545 RRULE format
}

function fromICalRRule(rrule: string): RecurrenceHandler {
  // Parse RFC 5545 RRULE to internal format
}
```

## Browser Support

The recurrence feature works in all modern browsers and is fully compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

The `RecurrenceEditor` component includes:
- Proper ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode compatibility
