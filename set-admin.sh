#!/bin/bash

# Load environment variables from .env.koko
set -a
source .env.koko
set +a

# Run the set admin script
npx tsx scripts/set-line-admin.ts "$@"
