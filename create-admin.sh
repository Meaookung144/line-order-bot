#!/bin/bash

# Load environment variables from .env.koko
set -a
source .env.koko
set +a

# Run the admin creation script
npx tsx scripts/create-admin-direct.ts "$1" "$2" "$3"
