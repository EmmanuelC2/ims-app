#!/bin/bash

# Configuration
SOURCE_BRANCH="development"
CURRENT_BRANCH=$(git branch --show-current)

echo "🔄 Syncing $CURRENT_BRANCH with $SOURCE_BRANCH..."

# 1. Safety Check: Ensure no "dirty" code exists before starting
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ ABORTED: You have uncommitted changes."
    echo "Please commit or stash your work before running the sync script."
    exit 1
fi

# 2. Update local knowledge of the remote repository
echo "fetching latest changes..."
git fetch origin

# 3. Merge with 'theirs' strategy to prioritize the development branch
# This ensures that if the local branch was lagging, it snaps to the dev version.
if git merge -Xtheirs "origin/$SOURCE_BRANCH"; then
    echo "✅ Success! $CURRENT_BRANCH is now up to date with $SOURCE_BRANCH."
    echo "🚀 You are ready to start coding."
else
    echo "⚠️ Unexpected error during merge. Please check 'git status'."
    exit 1
fi
