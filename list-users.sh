#!/bin/bash

# Load environment variables from .env.koko
set -a
source .env.koko
set +a

# Run the list users script
npx tsx scripts/list-users.ts
