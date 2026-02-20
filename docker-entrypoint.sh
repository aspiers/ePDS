#!/bin/sh
set -e
# Ensure the data directory is owned by appuser regardless of volume mount ownership.
# This runs as root before dropping to appuser via gosu/su-exec.
mkdir -p /data
chown appuser:appuser /data
exec su-exec appuser "$@"
