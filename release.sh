#!/bin/bash

# Exit on error
set -e

# Check if gh cli is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first:"
    echo "https://github.com/cli/cli#installation"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo "GitHub CLI is not authenticated. Please run 'gh auth login' first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Not in a git repository!"
    exit 1
fi

# Ensure we're on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo "Not on main/master branch!"
    exit 1
fi

# Ensure working directory is clean
if [[ -n $(git status --porcelain) ]]; then
    echo "Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Get the current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Ask for new version
read -p "Enter new version (current is $CURRENT_VERSION): " NEW_VERSION

# Validate semver format
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Invalid version format. Please use semantic versioning (e.g., 1.0.0)"
    exit 1
fi

# Update package.json version
npm version $NEW_VERSION --no-git-tag-version

# Build the project
echo "Building the project..."
npm run build

# Commit the changes
git add package.json package-lock.json dist/
git commit -m "chore: release version $NEW_VERSION"

# Create a new tag
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

# Push changes and tag
git push origin main
git push origin "v$NEW_VERSION"

# Create GitHub release
echo "Creating GitHub release..."
gh release create "v$NEW_VERSION" \
    --title "Release v$NEW_VERSION" \
    --notes-file <(echo "## Changes in this release

<!-- Add your release notes here -->

### Added
- 

### Changed
-

### Fixed
-

### Removed
-
") \
    --draft \
    dist/index.js

echo "Draft release v$NEW_VERSION created!"
echo "Please:"
echo "1. Review the release notes"
echo "2. Add your changes"
echo "3. Publish the release when ready"
echo ""
echo "Visit the releases page to publish:"
gh browse -R # Opens the repository page
