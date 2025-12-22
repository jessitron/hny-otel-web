# Updating hny-otel-web

This guide provides a step-by-step checklist for updating dependencies and publishing new versions of this library.

## Update Types

There are two types of updates:

**Dependency-Only Updates** (Steps 1-10, 13-15)
- Updating OpenTelemetry or Honeycomb SDK versions
- Updating build tools (esbuild)
- No changes to `src/hny.js` functionality
- Skip steps 11-12 (CHANGELOG and README docs)

**Code Changes** (All Steps 1-15)
- Bug fixes in `src/hny.js`
- New features or API additions
- Changes to configuration options
- Behavior modifications
- **Must** update CHANGELOG.md (step 11)
- **Must** update README.md if API changed (step 12)

## Update Checklist

### 1. Pre-Update Smoke Test

Before making any changes, verify the current version works:

```bash
npm run futz
```

Then open http://127.0.0.1:8081/ and verify traces appear in Honeycomb.

**Why:** Establishes a baseline to compare against after updates.

---

### 2. Check Available Updates

Identify which dependencies have new versions available:

```bash
npm outdated
```

Pay special attention to:
- `@honeycombio/opentelemetry-web`
- `@opentelemetry/api`
- `@opentelemetry/auto-instrumentations-web`

---

### 3. Review Honeycomb Changelog

**Before updating**, read the changelog to identify breaking changes or new features:

- Visit: https://github.com/honeycombio/honeycomb-opentelemetry-web/releases
- Look for:
  - Breaking changes
  - Deprecated APIs
  - New configuration options
  - Behavior changes in instrumentation

**Document any expected changes** that may affect users or require code updates.
Tell the user about them.

---

### 4. Update Dependencies

Force update to the latest versions of core dependencies:

```bash
npm install @honeycombio/opentelemetry-web@latest @opentelemetry/api@latest @opentelemetry/auto-instrumentations-web@latest
```

This ensures we get the absolute latest versions, not just what `npm update` considers acceptable within semver ranges.

Review the changes in `package.json` and `package-lock.json` to confirm versions were updated.

---

### 5. Update Version Numbers (Critical: 3 Locations!)

**IMPORTANT:** The version number must be updated in **THREE** places:

#### 5a. Update `package.json`

```json
{
  "version": "0.X.Y"
}
```

#### 5b. Update `README.md`

Find the unpkg.com script tag and update the version in the URL:

```html
<script type="module" src="https://unpkg.com/@jessitronica/hny-otel-web@0.X.Y/dist/hny.min.js"></script>
```

#### 5c. Update `src/hny.js`

Find the `MY_VERSION` constant near the top of the file:

```javascript
const MY_VERSION = "0.X.Y";
```

**Version Selection Guidelines:**
- Patch (0.11.X): Bug fixes, minor updates, no breaking changes
- Minor (0.X.0): New features, dependency updates, compatible changes
- Major (X.0.0): Breaking changes, API changes

---

### 6. Build the Project

Build with the updated dependencies:

```bash
npm run build
```

Check for any build errors or warnings. If esbuild reports issues, investigate before proceeding.

---

### 7. Run Full Test Suite

As a task, Follow the complete testing process from [TESTING.md](TESTING.md). The whole thing! Link the user to a query to review the data in Honeycomb.

---

### 10. Build Distribution Version

Once testing passes, build the minified distribution version:

```bash
npm run dist
```

This creates `dist/hny.min.js` for npm distribution.

---

### 11. Update CHANGELOG (If Code Changed)

**Skip this step for dependency-only updates.**

If you made code changes (bug fixes, new features, API changes), update `CHANGELOG.md`:

```markdown
## [0.X.Y] - YYYY-MM-DD

### Added
- New feature or capability

### Changed
- Modified behavior or updated API

### Fixed
- Bug fixes

### Deprecated
- Features that will be removed in future versions

### Breaking Changes
- API changes that require user action
```

**Guidelines:**
- Use [Keep a Changelog](https://keepachangelog.com/) format
- Be specific about what changed and why users should care
- Include migration instructions for breaking changes
- Reference GitHub issues/PRs if applicable

---

### 12. Update README Documentation (If Code Changed)

**Skip this step for dependency-only updates.**

If code changes affect the API or usage:

#### 12a. Update API Examples

Review and update code examples in README.md:
- Verify all example code still works
- Add examples for new features
- Update examples that reference changed APIs

#### 12b. Update Configuration Options

If new configuration options were added to `initializeTracing()`:
- Document the new options in the "Configuration" section
- Provide example usage
- Explain default values and behavior

#### 12c. Update Feature List

If new capabilities were added:
- Update the feature list/overview
- Add usage examples
- Document any prerequisites or limitations

#### 12d. Update Browser Compatibility

If minimum browser requirements changed:
- Update browser compatibility section
- Document any polyfills required

**Tip:** Run through the README examples yourself to ensure they work with the new version.

---

### 13. Commit Changes

Create a commit with the updates:

```bash
# For dependency-only updates:
git add package.json package-lock.json README.md src/hny.js dist/
git commit -m "Update to version 0.X.Y with latest dependencies - claude"

# For code changes, also include CHANGELOG.md:
git add package.json package-lock.json README.md src/hny.js dist/ CHANGELOG.md
git commit -m "Release version 0.X.Y - claude"
```

**Commit message tips:**
- Summarize the key change (e.g., "Add async span support" or "Fix exception recording")
- Include "- claude" suffix as per project conventions

---

### 14. Publish to npm

Publish the new version (requires authentication as `jessitronica`):

```bash
npm publish --access public
```

**Verify publication:**
- Check https://www.npmjs.com/package/@jessitronica/hny-otel-web
- Verify the version number updated
- Check that `dist/hny.min.js` is included in the package

---

### 15. Create GitHub Release (Optional)

Use the release script to create a GitHub release:

```bash
./release
```

This requires:
- `gh` CLI tool installed and authenticated
- `jq` command-line JSON processor

The script will:
- Create a git tag for the version
- Push the tag to GitHub
- Create a GitHub release with auto-generated notes

---

## Troubleshooting

### Build fails after dependency update

1. Check esbuild output for specific errors
2. Review Honeycomb changelog for breaking API changes
3. Check OpenTelemetry release notes for incompatibilities
4. Try updating dependencies one at a time to isolate the issue

### Tests pass but traces look different

1. Check Honeycomb changelog for instrumentation behavior changes
2. Verify auto-instrumentation configuration in `src/hny.js`
3. Check browser console for new warnings or errors
4. Compare span attributes between old and new versions

### Version number out of sync

If you forgot to update all three locations, the version will be inconsistent. To fix:

```bash
# Find current mismatches
grep -n "version" package.json
grep -n "unpkg.com" README.md
grep -n "MY_VERSION" src/hny.js

# Update them all to match
# Then rebuild and republish
```

### npm publish fails with authentication error

Ensure you're logged in as the correct user:

```bash
npm whoami
npm login  # Login as jessitronica if needed
```

---

## Post-Release Checklist

After publishing:

- [ ] Test the published package in a separate project
- [ ] Verify unpkg.com CDN serves the new version (may take a few minutes)
- [ ] Update any documentation or examples that reference specific version numbers
- [ ] Announce the update (if significant changes)

---

## Version History Tracking

Keep notes on significant updates:

| Version | Date | Key Changes |
|---------|------|-------------|
| 0.11.0 | TBD | [Document changes here] |
| 0.10.40 | Previous | [Previous changes] |
