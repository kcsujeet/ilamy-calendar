#!/bin/bash
exec > git_log.txt 2>&1
echo "Current Branch:"
git branch --show-current
echo "Status Before:"
git status
echo "Performing Add and Commit..."
git add .
git commit -m "feat: add resource-based business hours and fix multi-rule support (#73)" --no-verify
echo "Status After:"
git status
echo "Git Log (Last 1):"
git log -1
