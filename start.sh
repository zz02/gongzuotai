#!/usr/bin/env bash
# insprira 本地后台启动脚本
# 用法: ./start.sh {start|stop|restart|status|logs}
set -euo pipefail

cd "$(dirname "$0")"

APP_NAME="insprira"
PID_FILE="app.pid"
LOG_FILE="server.log"
MAIN="server.js"
START_TIMEOUT_SEC="${INSPRIRA_START_TIMEOUT_SEC:-10}"
STOP_TIMEOUT_SEC=10
LAUNCH_AGENT_FILE="${HOME}/Library/LaunchAgents/com.insprira.local.plist"

if [[ ! "$START_TIMEOUT_SEC" =~ ^[1-9][0-9]*$ ]]; then
    START_TIMEOUT_SEC=10
fi

if [[ -t 1 ]]; then
    GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; RED=$'\033[0;31m'; NC=$'\033[0m'
else
    GREEN=''; YELLOW=''; RED=''; NC=''
fi

info()  { printf "%s[INFO]%s  %s\n"  "$GREEN"  "$NC" "$*"; }
warn()  { printf "%s[WARN]%s  %s\n"  "$YELLOW" "$NC" "$*"; }
error() { printf "%s[ERROR]%s %s\n" "$RED"    "$NC" "$*" >&2; }

launchd_managed() {
    [[ "$(uname -s)" == "Darwin" && -f "$LAUNCH_AGENT_FILE" && -f scripts/macos-service.js ]] || return 1
    node -e 'process.exit(require("./scripts/macos-service").serviceTargetsAppRoot() ? 0 : 1)' >/dev/null 2>&1
}

is_running() {
    [[ -f "$PID_FILE" ]] || return 1
    local pid; pid=$(cat "$PID_FILE" 2>/dev/null) || return 1
    [[ -n "$pid" ]] || return 1
    kill -0 "$pid" 2>/dev/null
}

configured_port() {
    local port
    port=$(awk -F= '/^[[:space:]]*PORT[[:space:]]*=/{gsub(/[[:space:]"'\'']/, "", $2); print $2; exit}' .env 2>/dev/null || true)
    printf '%s' "${port:-8080}"
}

http_ready() {
    local port="$1"
    node -e '
const port = Number(process.argv[1]);
fetch(`http://127.0.0.1:${port}/api/_/version`, { signal: AbortSignal.timeout(1000) })
  .then(async response => {
    const payload = await response.json().catch(() => null);
    process.exit(response.ok && payload?.ok === true && payload?.version ? 0 : 1);
  })
  .catch(() => process.exit(1));
' "$port" >/dev/null 2>&1
}

preflight() {
    if ! command -v node >/dev/null 2>&1; then
        error "未找到 node，请先安装 Node.js >= 20"
        exit 1
    fi
    local major; major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
    if (( major < 20 )); then
        error "Node 版本过低 (当前 v$major，需要 >= 20)"
        exit 1
    fi

    if [[ ! -f .env ]]; then
        if [[ -f .env.example ]]; then
            cp .env.example .env
            chmod 600 .env
            info "已创建本机配置 .env；RedFox 与大模型可稍后在设置页配置"
        else
            error ".env 不存在且无 .env.example 可参考"
            exit 1
        fi
    fi

    if [[ ! -d node_modules ]]; then
        info "未检测到 node_modules，开始安装运行依赖 (npm install --omit=dev) ..."
        npm install --omit=dev
    fi

    if ! node scripts/check-native-dependencies.js >/dev/null 2>&1; then
        warn "检测到 Node 运行时变化或数据库依赖不可用，开始重建本机数据库模块 ..."
        if ! npm rebuild better-sqlite3; then
            error "数据库依赖重建失败。请切换到 Node.js 20 / 22 / 24 LTS 后重试"
            exit 1
        fi
        if ! node scripts/check-native-dependencies.js; then
            error "数据库依赖仍无法使用。请切换到 Node.js 20 / 22 / 24 LTS 后重试"
            exit 1
        fi
        info "数据库依赖已适配当前 Node 运行时"
    fi
}

do_start() {
    if launchd_managed; then
        node scripts/macos-service.js start
        return
    fi
    if is_running; then
        warn "$APP_NAME 已在运行 (PID $(cat "$PID_FILE"))"
        return 0
    fi

    preflight

    info "启动 $APP_NAME ..."
    nohup node "$MAIN" >>"$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"

    local port ready=0 waited=0
    port=$(configured_port)
    while (( waited < START_TIMEOUT_SEC * 2 )); do
        kill -0 "$pid" 2>/dev/null || break
        if http_ready "$port"; then
            ready=1
            break
        fi
        sleep 0.5
        waited=$((waited + 1))
    done

    if (( ready == 1 )); then
        info "$APP_NAME 已启动 (PID $pid)，健康检查通过，日志：$LOG_FILE"
        info "打开 http://127.0.0.1:${port}；首次使用请在页面创建管理员"
    else
        error "$APP_NAME 启动失败：${START_TIMEOUT_SEC}s 内未通过健康检查，最近 30 行日志："
        tail -n 30 "$LOG_FILE" >&2 || true
        kill "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
        rm -f "$PID_FILE"
        exit 1
    fi
}

do_stop() {
    if launchd_managed; then
        node scripts/macos-service.js stop
        rm -f "$PID_FILE"
        return
    fi
    if ! is_running; then
        warn "$APP_NAME 未在运行"
        rm -f "$PID_FILE"
        return 0
    fi
    local pid; pid=$(cat "$PID_FILE")
    info "停止 $APP_NAME (PID $pid) ..."
    kill "$pid" 2>/dev/null || true

    local waited=0
    while (( waited < STOP_TIMEOUT_SEC * 2 )); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
        waited=$((waited + 1))
    done

    if kill -0 "$pid" 2>/dev/null; then
        warn "${STOP_TIMEOUT_SEC}s 内未退出，发送 SIGKILL"
        kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
    info "已停止"
}

do_status() {
    if launchd_managed; then
        node scripts/macos-service.js status
        return
    fi
    if is_running; then
        local port
        port=$(configured_port)
        if http_ready "$port"; then
            info "$APP_NAME 运行中 (PID $(cat "$PID_FILE"))，健康检查通过"
        else
            warn "$APP_NAME 进程存在，但 http://127.0.0.1:${port} 健康检查失败"
            return 1
        fi
    else
        warn "$APP_NAME 未运行"
        return 1
    fi
}

do_logs() {
    if launchd_managed; then
        node scripts/macos-service.js logs
        return
    fi
    if [[ ! -f "$LOG_FILE" ]]; then
        warn "日志文件 $LOG_FILE 不存在"
        return 0
    fi
    info "实时跟踪 $LOG_FILE (Ctrl+C 退出)"
    tail -n 100 -f "$LOG_FILE"
}

usage() {
    cat <<EOF
用法: $0 {start|stop|restart|status|logs}
  start    启动服务（已安装 macOS 常驻服务时自动交给系统托管）
  stop     停止 (先 SIGTERM，超时再 SIGKILL)
  restart  重启
  status   查看运行状态
  logs     实时查看日志 (tail -f, Ctrl+C 退出)
EOF
}

case "${1:-}" in
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_stop; do_start ;;
    status)  do_status ;;
    logs)    do_logs ;;
    "")
        error "缺少子命令"
        usage
        exit 1
        ;;
    *)
        usage
        exit 1
        ;;
esac
