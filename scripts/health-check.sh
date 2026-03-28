#!/usr/bin/env bash
curl -sf http://localhost:3000/health || exit 1
echo 'healthy'
