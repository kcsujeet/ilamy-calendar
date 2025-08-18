# Translation System Usage

The calendar supports two flexible approaches for internationalization:

## Approach 1: Translation Object

Provide a complete translations object with all required keys:

```tsx
import { IlamyCalendar, type Translations } from '@ilamy/calendar'

// Create your own translations
const myTranslations: Translations = {
  today: 'Hoy',
  create: 'Crear',
  edit: 'Editar',
  // ... all other required keys
}

<IlamyCalendar
  events={events}
  translations={myTranslations}
/>
```

## Approach 2: Translator Function

Provide a function that handles translation logic:

```tsx
import { IlamyCalendar, type TranslatorFunction } from '@ilamy/calendar'

// Simple key-based translator
const translator: TranslatorFunction = (key) => {
  const translations = {
    today: 'Hoy',
    create: 'Crear',
    // ... other translations
  }
  return translations[key] || key
}

// Or integration with existing i18n library
const translator: TranslatorFunction = (key) => {
  return i18next.t(`calendar.${key}`) // or your i18n solution
}

;<IlamyCalendar events={events} translator={translator} />
```

## Dynamic Language Switching

```tsx
import { useState } from 'react'
import {
  IlamyCalendar,
  defaultTranslations,
  spanishTranslations,
  type Translations,
} from '@ilamy/calendar'

const MultiLanguageCalendar = () => {
  const [locale, setLocale] = useState('en')

  const getTranslations = (locale: string): Translations => {
    switch (locale) {
      case 'es':
        return spanishTranslations
      default:
        return defaultTranslations
    }
  }

  return (
    <div>
      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>

      <IlamyCalendar events={events} translations={getTranslations(locale)} />
    </div>
  )
}
```

## Integration with i18next

```tsx
import { useTranslation } from 'react-i18next'
import { IlamyCalendar } from '@ilamy/calendar'

const I18nextCalendar = () => {
  const { t } = useTranslation('calendar')

  return <IlamyCalendar events={events} translator={(key) => t(key)} />
}

// Or with namespace support
const I18nextCalendarWithNamespace = () => {
  const { t } = useTranslation()

  return (
    <IlamyCalendar events={events} translator={(key) => t(`calendar.${key}`)} />
  )
}
```

## Using Translations in Custom Components

Any component rendered within the calendar can access the translation function:

```tsx
import { useCalendarContext } from '@ilamy/calendar'

const CustomHeader = () => {
  const { t, currentDate } = useCalendarContext()

  return (
    <div>
      <h1>
        {t('month')} {currentDate.format('YYYY')}
      </h1>
      <button>{t('today')}</button>
    </div>
  )
}

;<IlamyCalendar
  events={events}
  translations={spanishTranslations}
  headerComponent={<CustomHeader />}
/>
```

## Available Translation Keys

All required translation keys are defined in the `Translations` type:

- **Actions**: `today`, `create`, `edit`, `update`, `delete`, `cancel`, `save`
- **Event Form**: `createEvent`, `editEvent`, `eventTitlePlaceholder`, etc.
- **Views**: `month`, `week`, `day`, `year`
- **Days**: `sunday`, `monday`, etc. (full and short forms)
- **Months**: `january`, `february`, etc. (full and short forms)

See the `Translations` interface for the complete list of required keys.
