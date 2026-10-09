#!/usr/bin/env bash
# Bash 入口：直接转 Node 安装器（跨工具逻辑以 install.mjs 为唯一实现）
exec node "$(dirname "${BASH_SOURCE[0]}")/install.mjs" "$@"
