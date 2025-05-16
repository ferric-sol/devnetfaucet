#!/bin/bash

# =============================================
# User Removal Script
# =============================================
# This script facilitates the complete removal of a user from the system
# by executing a TypeScript-based removal process.
#
# The script takes a GitHub username as input and passes it to a TypeScript
# script that handles the actual user removal logic.
# =============================================

# Check if a GitHub username was provided as an argument
if [ -z "$1" ]; then
  echo "Error: Please provide a GitHub username"
  echo "Usage: ./scripts/remove-user.sh <github-username>"
  exit 1
fi

# Execute the TypeScript removal script using tsx
# The username is passed as an argument to the TypeScript script
npx tsx scripts/remove-user.ts "$1" 