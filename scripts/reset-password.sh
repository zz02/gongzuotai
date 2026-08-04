#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
umask 077

username=""
while (( $# > 0 )); do
  case "$1" in
    --username)
      username="${2:-}"
      shift 2
      ;;
    -h|--help)
      printf '用法：%s [--username 登录账号]\n' "$0"
      exit 0
      ;;
    *)
      printf '[ERROR] 未知参数：%s\n' "$1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$username" ]]; then
  read -r -p '登录账号 [admin]：' username
  username="${username:-admin}"
fi

read -r -s -p '新密码（8-128 位）：' password
printf '\n'
read -r -s -p '再次输入新密码：' confirm_password
printf '\n'

printf '%s\n%s\n' "$password" "$confirm_password" \
  | node scripts/reset-password.js --username "$username"

unset password confirm_password
