#!/bin/bash

# Script to remove a user completely from the system
# Usage: ./scripts/remove-user.sh <github-username>

if [ -z "$1" ]; then
  echo "Error: Please provide a GitHub username"
  echo "Usage: ./scripts/remove-user.sh <github-username>"
  exit 1
fi

# Run the TypeScript script with the username
npx tsx scripts/remove-user.ts "$1" 