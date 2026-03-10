#!/usr/bin/env sh
# Start API pro Railway – export env před prisma, aby se potlačily bannery a tipy
export PRISMA_HIDE_UPDATE_MESSAGE=1
export PRISMA_DISABLE_WARNINGS=1
prisma generate && prisma db push && node dist/index.js
