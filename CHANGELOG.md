# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.9] - 2025-07-21

### Fixed
- Event Form broken when using 'New Event' button

## [0.1.8] - 2025-07-21

### Added
- Added support for Date objects and strings as start/end dates for event

### Fixed
- Export correct types for CalendarEvent

## [0.1.7] - 2025-07-21

### Added
- Comprehensive JSDoc documentation for all type definitions
- Flexible date input support (accepts Dayjs objects, Date objects, and date strings)
- Enhanced color system supporting hex, rgba, hsl values in addition to CSS classes
- Complete test coverage for all calendar views with data-testid attributes
- GitHub Actions CI/CD workflow with linting, formatting, and testing

### Fixed
- Dayjs locale configuration issues when used as external library
- Time precision issues in event creation and drag-and-drop operations

## [0.1.0] - 2025-07-19

### Added
- Full-featured React calendar component library with Month, Week, Day, and Year views
- Drag-and-drop event management with @dnd-kit integration
- Recurring events support with flexible patterns (daily, weekly, monthly, yearly)
- Internationalization support with 100+ locales via dayjs
- Event form with comprehensive validation using 