# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.12.0] - 2024-12-21

### Added
- Explicit WebVitalsInstrumentation to match Honeycomb's recommended initialization pattern

### Changed
- Updated `@honeycombio/opentelemetry-web` to latest version
- Updated `@opentelemetry/api` to latest version
- Updated `@opentelemetry/auto-instrumentations-web` to latest version
- Improved documentation in UPDATING.md with new verification step for SDK initialization

### Notes
- Web Vitals were already working via auto-instrumentation, but now explicitly declared for better maintainability and alignment with Honeycomb docs

## [0.11.0] - TBD

### Changed
- Updated to track changes going forward

## [0.10.40] - Previous Release

### Notes
- Version history before 0.11.0 was not formally tracked
- See git commit history for detailed changes

---

## Template for New Releases

When releasing a new version, copy this template to the top of the file (below [Unreleased]):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features or capabilities
- New configuration options
- New helper functions or APIs

### Changed
- Modifications to existing functionality
- Updated default behavior
- Dependency version updates (if significant)

### Fixed
- Bug fixes
- Error handling improvements
- Trace data corrections

### Deprecated
- Features that will be removed in future versions
- APIs that have been superseded

### Breaking Changes
- Changes that require user action to upgrade
- Removed features
- Changed API signatures
- Configuration changes that require updates
```

### Guidelines

- **Be specific:** "Fixed exception recording in async spans" not "Fixed bugs"
- **User-focused:** Explain impact on users, not implementation details
- **Reference issues:** Include GitHub issue numbers when applicable (#123)
- **Migration notes:** For breaking changes, explain how users should update their code
- **Group similar changes:** Combine related changes under one bullet when appropriate
