#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  سرزمین عسل — Honey Land E-commerce + Telegram Bot
#  Full Production Installer (3X-UI friendly edition)
#
#  This script:
#    1. Installs all system dependencies (Bun, Caddy, build tools)
#    2. Detects existing services (3X-UI / x-ui / xray) and listening ports
#       so the website NEVER conflicts with your VPN panel
#    3. Copies the project to /opt/sarzemine-asal
#    4. Installs npm dependencies, builds the site, sets up the database
#    5. Configures the Telegram bot with your token
#    6. Asks for a domain — if provided, sets up Caddy reverse proxy
#       with automatic HTTPS. If ports 80/443 are taken (e.g. by 3X-UI),
#       offers safe alternatives (custom port / HTTP-only).
#    7. Installs systemd services for auto-start on boot
#    8. Installs a health monitor with Telegram alerts
#    9. Configures the firewall WITHOUT ever blocking your 3X-UI ports
#
#  Usage:  sudo bash setup.sh
#  Re-run: sudo bash setup.sh   (safe — detects existing install)
# ═══════════════════════════════════════════════════════════════════════

set -Eeuo pipefail

# ── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Config ───────────────────────────────────────────────────────────
INSTALL_DIR="${INSTALL_DIR:-/opt/sarzemine-asal}"
SERVICE_USER="${SERVICE_USER:-sarzemine}"
SITE_PORT="${SITE_PORT:-3000}"
BOT_PORT="${BOT_PORT:-3003}"
LOG_DIR="/var/log/sarzemine-asal"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_SRC="$SCRIPT_DIR/project"

# Default bot config — empty by default. User MUST enter their own values.
DEFAULT_BOT_TOKEN=""
DEFAULT_ADMIN_ID=""

# Default GitHub repo (can be overridden with GITHUB_REPO_URL env var or via prompt)
DEFAULT_GITHUB_REPO=""

# ── Helpers ──────────────────────────────────────────────────────────
info()  { echo -e "${BLUE}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }
step()  { echo -e "\n${CYAN}${BOLD}═══ $* ═══${NC}"; }

die() { err "$*"; exit 1; }

# Check if a command exists
has() { command -v "$1" &>/dev/null; }

# Check whether a TCP port is already listening
port_busy() { ss -tln 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$1$"; }

# ── Error trap ───────────────────────────────────────────────────────
on_error() {
  local line=$1
  err "Setup failed at line $line"
  err "Check the output above for details."
  err "If you need help, the log files are in $LOG_DIR"
}
trap 'on_error $LINENO' ERR

# ═══════════════════════════════════════════════════════════════════════
# STEP 1: Pre-flight checks
# ═══════════════════════════════════════════════════════════════════════
step "Step 1/9: Pre-flight checks"

# Must run as root (or with sudo)
if [[ $EUID -ne 0 ]]; then
  err "This script must be run as root (use: sudo bash setup.sh)"
  exit 1
fi
ok "Running as root"

# Check OS
if ! has apt-get; then
  die "This installer requires a Debian/Ubuntu-based system (apt-get not found)."
fi
ok "OS: $(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || echo "Linux")"

# Check if git is installed (needed for GitHub-based deployment)
if ! has git; then
  info "Installing git..."
  apt-get install -y -qq git >/dev/null 2>&1 || true
fi

# ── 3X-UI / VPN panel coexistence detection ─────────────────────────
VPN_PANEL_DETECTED=false
VPN_SERVICES=""
for svc in 3x-ui x-ui xray marzbadns marznastin; do
  if systemctl list-unit-files 2>/dev/null | grep -q "^${svc}.service" || \
     systemctl is-active --quiet "$svc" 2>/dev/null; then
    VPN_PANEL_DETECTED=true
    VPN_SERVICES="$VPN_SERVICES $svc"
  fi
done

BUSY_PORTS=""
if command -v ss &>/dev/null; then
  BUSY_PORTS=$(ss -tln 2>/dev/null | awk 'NR>1 {print $4}' | \
    grep -oE '[0-9]+$' | sort -un | tr '\n' ' ')
fi

if [[ "$VPN_PANEL_DETECTED" == "true" ]]; then
  echo ""
  echo -e "${GREEN}${BOLD}🛡  VPN panel detected on this server:${NC} ${VPN_SERVICES}"
  echo -e "  This installer is 3X-UI aware:"
  echo -e "   • It will NOT touch your panel, xray inbounds, or their ports"
  echo -e "   • It will NOT enable strict firewall rules that could block VPN ports"
  echo -e "   • It will pick free ports for the website & bot automatically"
  echo ""
  echo -e "  Ports currently listening on this server:"
  echo -e "  ${CYAN}${BUSY_PORTS:-none detected}${NC}"
  echo ""
else
  info "No 3X-UI/x-ui/xray services detected — standard installation."
  [[ -n "$BUSY_PORTS" ]] && info "Currently listening ports: $BUSY_PORTS"
fi

# Two deployment modes:
#   1. GitHub clone (recommended) — setup.sh clones the repo to /opt/sarzemine-asal
#      This enables future updates via `update.sh` (git pull + rebuild)
#   2. Local files — uses the project/ folder bundled with setup.sh
#
# We detect GitHub repo URL from: env var GITHUB_REPO_URL > interactive prompt > .github-repo file
GITHUB_REPO="${GITHUB_REPO_URL:-$DEFAULT_GITHUB_REPO}"

# Check if there's a .github-repo file with the URL saved from a previous run
if [[ -z "$GITHUB_REPO" && -f "$SCRIPT_DIR/.github-repo" ]]; then
  GITHUB_REPO=$(cat "$SCRIPT_DIR/.github-repo" 2>/dev/null || echo "")
fi

# If still no GitHub repo, check if local project/ exists
if [[ -z "$GITHUB_REPO" && -d "$PROJECT_SRC" && -f "$PROJECT_SRC/package.json" ]]; then
  # Local mode — use the bundled project/ folder
  DEPLOY_MODE="local"
  ok "Deployment mode: local files (bundled project/)"
  warn "Note: Without GitHub, you won't be able to use update.sh for easy updates."
  warn "      To enable GitHub-based updates later, see README.md."
elif [[ -n "$GITHUB_REPO" ]]; then
  DEPLOY_MODE="github"
  ok "Deployment mode: GitHub clone"
  info "Repo: $GITHUB_REPO"
else
  # No GitHub repo, no local project/ — need to ask the user
  echo ""
  echo -e "${BOLD}Deployment source not found.${NC}"
  echo -e "  Option 1: Provide a GitHub repo URL for git-based deployment (recommended)."
  echo -e "           This enables easy updates via update.sh."
  echo -e "  Option 2: Place the project/ folder next to setup.sh and re-run."
  echo ""
  read -rp "$(echo -e "${CYAN} GitHub repo URL (or press Enter to cancel): ${NC}")" GITHUB_REPO_INPUT
  if [[ -z "$GITHUB_REPO_INPUT" ]]; then
    die "No deployment source provided. Cannot continue."
  fi
  GITHUB_REPO="$GITHUB_REPO_INPUT"
  DEPLOY_MODE="github"
  ok "Deployment mode: GitHub clone"
  info "Repo: $GITHUB_REPO"
fi

# Check internet connectivity
if ! curl -s --max-time 10 https://bun.sh >/dev/null 2>&1; then
  warn "Cannot reach bun.sh — internet may be limited. Continuing anyway..."
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 2: Interactive configuration
# ═══════════════════════════════════════════════════════════════════════
step "Step 2/9: Configuration"

echo ""
echo -e "${BOLD}Please answer the following questions:${NC}"
echo ""

# Bot token — required (no default for security)
echo -e "${BOLD}Telegram bot token${NC} (from @BotFather)"
echo -e "  Get one by messaging @BotFather → /newbot"
while true; do
  read -rp "$(echo -e "${CYAN} Bot token: ${NC}")" BOT_TOKEN
  if [[ -z "$BOT_TOKEN" ]]; then
    err "Bot token is required. Cannot continue without it."
    continue
  fi
  if [[ ! "$BOT_TOKEN" =~ ^[0-9]+:AA[a-zA-Z0-9_-]+$ ]]; then
    warn "Token doesn't look like a Telegram bot token (expected format: 123456789:AAxxx). Try again."
    continue
  fi
  break
done
ok "Bot token: ${BOT_TOKEN:0:15}..."

# Admin ID — required (no default for security)
echo ""
echo -e "${BOLD}Your Telegram admin ID${NC}"
echo -e "  Send /start to @userinfobot to find yours"
while true; do
  read -rp "$(echo -e "${CYAN} Admin ID: ${NC}")" ADMIN_ID
  if [[ -z "$ADMIN_ID" ]]; then
    err "Admin ID is required. Cannot continue without it."
    continue
  fi
  if [[ ! "$ADMIN_ID" =~ ^[0-9]+$ ]]; then
    warn "Admin ID must be numeric. Try again."
    continue
  fi
  break
done
ok "Admin ID: $ADMIN_ID"

# ── Site port selection (3X-UI aware) ────────────────────────────────
echo ""
echo -e "${BOLD}Website internal port${NC} (the Next.js server)"
if port_busy "$SITE_PORT"; then
  warn "Default port $SITE_PORT is already in use on this server."
  while true; do
    read -rp "$(echo -e "${CYAN} Choose a free port for the website [3001-3010, 8080]: ${NC}")" SITE_PORT_INPUT
    SITE_PORT="${SITE_PORT_INPUT:-$SITE_PORT}"
    if ! [[ "$SITE_PORT" =~ ^[0-9]+$ ]]; then
      err "Port must be numeric."
      continue
    fi
    if port_busy "$SITE_PORT"; then
      err "Port $SITE_PORT is also busy. Try another."
      continue
    fi
    ok "Website will use port $SITE_PORT"
    break
  done
else
  ok "Website internal port: $SITE_PORT (free)"
fi

# ── Bot port selection ───────────────────────────────────────────────
if port_busy "$BOT_PORT"; then
  warn "Bot port $BOT_PORT is already in use."
  while true; do
    read -rp "$(echo -e "${CYAN} Choose a free port for the bot service [3004-3010]: ${NC}")" BOT_PORT_INPUT
    BOT_PORT="${BOT_PORT_INPUT:-$BOT_PORT}"
    if ! [[ "$BOT_PORT" =~ ^[0-9]+$ ]] || port_busy "$BOT_PORT"; then
      err "Port busy or invalid. Try another."
      continue
    fi
    ok "Bot will use port $BOT_PORT"
    break
  done
else
  ok "Bot internal port: $BOT_PORT (free)"
fi

# Domain / public access mode
echo ""
echo -e "${BOLD}Public access — domain (optional):${NC}"
echo -e "  If you have a domain (e.g. honey.example.com), enter it now."
echo -e "  Caddy will automatically obtain a free SSL certificate (Let's Encrypt)."
if [[ "$VPN_PANEL_DETECTED" == "true" ]]; then
  echo -e "  ${YELLOW}3X-UI detected:${NC} if your panel or xray inbounds already use ports"
  echo -e "  80/443, the installer will detect it and suggest safe alternatives."
fi
echo -e "  Leave empty to serve the site directly on a custom port (HTTP)."
echo ""
read -rp "$(echo -e "${CYAN} Domain (optional): ${NC}")" DOMAIN
DOMAIN="${DOMAIN:-}"

HTTP80_FREE=true
HTTPS443_FREE=true
port_busy 80  && HTTP80_FREE=false
port_busy 443 && HTTPS443_FREE=false
# Caddy itself listening is fine (we manage it) — treat as free if it's caddy
if ! $HTTP80_FREE; then
  if ss -tlnp 2>/dev/null | grep -E '[:.]80 ' | grep -q caddy; then HTTP80_FREE=true; fi
fi
if ! $HTTPS443_FREE; then
  if ss -tlnp 2>/dev/null | grep -E '[:.]443 ' | grep -q caddy; then HTTPS443_FREE=true; fi
fi

# Public access mode resolution:
#   mode=https-domain   → Caddy serves https://DOMAIN on 443 (needs 80+443 free)
#   mode=https-altport  → Caddy serves https://DOMAIN:CUSTOM_HTTPS_PORT (needs 80 free for cert)
#   mode=http-direct    → Next.js exposed directly on SITE_PORT (or custom public port)
CADDY_SITE_ADDR=""
PUBLIC_PORT="$SITE_PORT"

if [[ -n "$DOMAIN" ]]; then
  if $HTTP80_FREE && $HTTPS443_FREE; then
    CADDY_SITE_ADDR="$DOMAIN"
    ok "Domain: $DOMAIN (HTTPS on 443 will be configured)"
  elif $HTTP80_FREE && ! $HTTPS443_FREE; then
    warn "Port 443 is busy (probably 3X-UI xray inbound or another panel)."
    echo -e "  Option A: HTTPS on an alternate port (e.g. 8443) — cert still auto-issued via port 80"
    echo -e "  Option B: HTTP only on port 80 (no SSL)"
    echo -e "  Option C: Enter a different domain/port setup manually"
    read -rp "$(echo -e "${CYAN} Choose [A/B/C, default=A]: ${NC}")" HTTPS_CHOICE
    HTTPS_CHOICE="${HTTPS_CHOICE:-A}"
    case "$HTTPS_CHOICE" in
      [Aa])
        while true; do
          read -rp "$(echo -e "${CYAN} HTTPS port [8443]: ${NC}")" HTTPS_PORT
          HTTPS_PORT="${HTTPS_PORT:-8443}"
          if port_busy "$HTTPS_PORT"; then
            err "Port $HTTPS_PORT is busy. Try another."
            continue
          fi
          break
        done
        CADDY_SITE_ADDR="$DOMAIN:$HTTPS_PORT"
        ok "HTTPS will be served on https://$DOMAIN:$HTTPS_PORT"
        ;;
      [Bb])
        CADDY_SITE_ADDR="http://$DOMAIN"
        ok "HTTP-only site: http://$DOMAIN"
        ;;
      *)
        die "Manual setup selected — aborting. Re-run setup.sh when ready."
        ;;
    esac
  elif ! $HTTP80_FREE && $HTTPS443_FREE; then
    warn "Port 80 is busy (TLS-ALPN will be used for certs on 443)."
    CADDY_SITE_ADDR="$DOMAIN"
    ok "Domain: $DOMAIN — Caddy will obtain certs via TLS-ALPN-01 on 443."
    warn "If certificate issuance fails, free port 80 or use an alternate HTTPS port."
  else
    warn "Both 80 and 443 are busy — a VPN panel likely owns them."
    echo -e "  The site can still be served with HTTPS on an alternate port using a"
    echo -e "  self-signed cert, or plain HTTP on an alternate port."
    read -rp "$(echo -e "${CYAN} Serve plain HTTP on alternate port? [Y/n]: ${NC}")" ALT_HTTP
    if [[ "${ALT_HTTP:-Y}" =~ ^[Yy]$ ]]; then
      while true; do
        read -rp "$(echo -e "${CYAN} Public HTTP port [8080]: ${NC}")" PUBLIC_PORT
        PUBLIC_PORT="${PUBLIC_PORT:-8080}"
        if port_busy "$PUBLIC_PORT"; then
          err "Port $PUBLIC_PORT is busy. Try another."
          continue
        fi
        break
      done
      CADDY_SITE_ADDR=":$PUBLIC_PORT"
      DOMAIN=""  # plain HTTP mode — no cert management
      ok "Site will be served on http://<server-ip>:$PUBLIC_PORT"
    else
      die "Cannot configure public access without a free port. Aborting."
    fi
  fi

  # Email for Let's Encrypt (required if domain provided)
  if [[ -n "$DOMAIN" ]]; then
    LE_EMAIL=""
    echo ""
    echo -e "${BOLD}Email for Let's Encrypt certificate notifications:${NC}"
    echo -e "  (used only for certificate expiry warnings — required by Let's Encrypt)"
    read -rp "$(echo -e "${CYAN} Email: ${NC}")" LE_EMAIL
    if [[ -z "$LE_EMAIL" ]]; then
      warn "No email provided — Caddy will use a default. You may not receive expiry warnings."
    fi
  fi
else
  # No domain — direct HTTP exposure on a public port
  echo ""
  echo -e "${BOLD}Direct public access (no domain):${NC}"
  echo -e "  The site can be exposed directly on a port of your choice (HTTP)."
  echo -e "  3X-UI ports are never touched."
  read -rp "$(echo -e "${CYAN} Public port for the website [default: $SITE_PORT]: ${NC}")" PUBLIC_PORT
  PUBLIC_PORT="${PUBLIC_PORT:-$SITE_PORT}"
  if ! [[ "$PUBLIC_PORT" =~ ^[0-9]+$ ]]; then
    PUBLIC_PORT="$SITE_PORT"
  fi
  if [[ "$PUBLIC_PORT" != "$SITE_PORT" ]] && port_busy "$PUBLIC_PORT"; then
    warn "Port $PUBLIC_PORT is busy — falling back to $SITE_PORT."
    PUBLIC_PORT="$SITE_PORT"
  fi
  ok "Site will be reachable at http://<server-ip>:$PUBLIC_PORT"
fi

# Confirm
echo ""
echo -e "${BOLD}═══ Summary ═══${NC}"
echo -e "  Install dir:  $INSTALL_DIR"
echo -e "  Bot token:    ${BOT_TOKEN:0:15}..."
echo -e "  Admin ID:     $ADMIN_ID"
echo -e "  Site port:    $SITE_PORT (internal)"
[[ "$PUBLIC_PORT" != "$SITE_PORT" ]] && echo -e "  Public port:  $PUBLIC_PORT"
echo -e "  Bot port:     $BOT_PORT"
if [[ -n "$CADDY_SITE_ADDR" ]]; then
  echo -e "  Caddy addr:   $CADDY_SITE_ADDR"
else
  echo -e "  Web server:   direct (no Caddy)"
fi
[[ -n "${LE_EMAIL:-}" ]] && echo -e "  LE Email:     $LE_EMAIL"
[[ "$VPN_PANEL_DETECTED" == "true" ]] && echo -e "  3X-UI mode:   ${GREEN}coexistence (panel untouched)${NC}"
echo ""
read -rp "$(echo -e "${YELLOW} Proceed with installation? [Y/n]: ${NC}")" CONFIRM
[[ "${CONFIRM:-Y}" =~ ^[Yy]$ ]] || die "Installation cancelled."

# ═══════════════════════════════════════════════════════════════════════
# STEP 3: Install system dependencies
# ═══════════════════════════════════════════════════════════════════════
step "Step 3/9: Installing system dependencies"

export DEBIAN_FRONTEND=noninteractive

info "Updating apt package index..."
apt-get update -qq

info "Installing build tools and certificates..."
apt-get install -y -qq \
  curl git build-essential python3 \
  ca-certificates gnupg \
  sqlite3 jq rsync >/dev/null

ok "System packages installed"

# Install Bun (if not already installed for the service user)
BUN_INSTALL_SCRIPT="https://bun.sh/install"
if ! id "$SERVICE_USER" &>/dev/null; then
  info "Creating service user: $SERVICE_USER"
  useradd -r -m -d "/home/$SERVICE_USER" -s /bin/bash "$SERVICE_USER"
  ok "User $SERVICE_USER created"
fi

SERVICE_HOME="/home/$SERVICE_USER"
BUN_BIN="$SERVICE_HOME/.bun/bin/bun"

if [[ ! -f "$BUN_BIN" ]]; then
  info "Installing Bun runtime for $SERVICE_USER..."
  sudo -u "$SERVICE_USER" -H bash -c "curl -fsSL $BUN_INSTALL_SCRIPT | bash" 2>/dev/null
  if [[ ! -f "$BUN_BIN" ]]; then
    die "Failed to install Bun. Check your internet connection."
  fi
fi
ok "Bun installed: $($BUN_BIN --version)"

# Install Caddy (only needed when we proxy via a domain / custom public port)
if [[ -n "$CADDY_SITE_ADDR" ]]; then
  if ! has caddy; then
    info "Installing Caddy web server (for HTTPS)..."
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
      | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
      | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    apt-get update -qq
    apt-get install -y -qq caddy >/dev/null
    ok "Caddy installed"
  else
    ok "Caddy already installed"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 4: Deploy project files (clone from GitHub OR copy local files)
# ═══════════════════════════════════════════════════════════════════════
step "Step 4/9: Deploying project files"

mkdir -p "$INSTALL_DIR"

if [[ "$DEPLOY_MODE" == "github" ]]; then
  # ── GitHub mode: clone the repo ──
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    # Already cloned — update to latest
    info "Repo already cloned at $INSTALL_DIR — updating to latest..."
    sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && git fetch origin && git pull origin main" 2>&1 | tail -5 || \
      sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && git pull origin master" 2>&1 | tail -5
    ok "Repo updated to latest"
  else
    info "Cloning from GitHub: $GITHUB_REPO"
    # Clone to a temp dir first, then move (avoids permission issues)
    TMP_CLONE="/tmp/sarzemine-clone-$$"
    git clone --depth 1 "$GITHUB_REPO" "$TMP_CLONE" 2>&1 | tail -5
    if [[ ! -d "$TMP_CLONE" ]]; then
      die "git clone failed. Check the repo URL and your server's access to GitHub."
    fi
    # Move cloned files to install dir (preserves any existing .env, db)
    if command -v rsync &>/dev/null; then
      rsync -a "$TMP_CLONE/" "$INSTALL_DIR/"
    else
      # Fallback: cp -r when rsync not installed
      warn "rsync not available — using cp fallback"
      cp -r "$TMP_CLONE/." "$INSTALL_DIR/" 2>/dev/null || true
    fi
    rm -rf "$TMP_CLONE"
    ok "Repo cloned successfully"

    # Initialize git history (for future updates via update.sh)
    # The clone was --depth 1 (shallow). Fetch full history for safety.
    sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && git fetch --unshallow 2>/dev/null || true"

    # Save the repo URL for future reference
    echo "$GITHUB_REPO" > "$INSTALL_DIR/.github-repo"
    chmod 644 "$INSTALL_DIR/.github-repo"
  fi
else
  # ── Local mode: copy the bundled project/ folder ──
  info "Copying local project files to $INSTALL_DIR..."
  if command -v rsync &>/dev/null; then
    rsync -a --delete \
      --exclude='node_modules' \
      --exclude='.next' \
      --exclude='db/*.db' \
      --exclude='db/*.db-shm' \
      --exclude='db/*.db-wal' \
      --exclude='dev.log' \
      --exclude='server.log' \
      --exclude='.env' \
      "$PROJECT_SRC/" "$INSTALL_DIR/"
  else
    # Fallback: cp -r with manual exclusions (rsync not installed)
    warn "rsync not available — using cp fallback"
    mkdir -p "$INSTALL_DIR"
    # Build exclusion pattern for find
    (cd "$PROJECT_SRC" && find . -type f \
      ! -path './node_modules/*' \
      ! -path './.next/*' \
      ! -path './db/*.db' \
      ! -path './db/*.db-shm' \
      ! -path './db/*.db-wal' \
      ! -name 'dev.log' \
      ! -name 'server.log' \
      ! -name '.env' \
      -print0) | (cd "$PROJECT_SRC" && xargs -0 -I{} install -D "{}" "$INSTALL_DIR/{}")
  fi
  ok "Local project files copied"

  warn "Local mode: update.sh will not work (no git history)."
  warn "To switch to GitHub mode later, see README.md → 'Switching to GitHub deployment'."
fi

# Ensure db directory exists
mkdir -p "$INSTALL_DIR/db"
ok "Database directory ready"

# Copy monitor.sh and update.sh (deployment scripts)
cp "$SCRIPT_DIR/monitor.sh" "$INSTALL_DIR/monitor.sh"
chmod +x "$INSTALL_DIR/monitor.sh"
if [[ -f "$SCRIPT_DIR/update.sh" ]]; then
  cp "$SCRIPT_DIR/update.sh" "$INSTALL_DIR/update.sh"
  chmod +x "$INSTALL_DIR/update.sh"
  ok "Update script installed (use: sudo bash /opt/sarzemine-asal/update.sh)"
fi
ok "Monitor script installed"

# Set ownership
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
ok "Ownership set to $SERVICE_USER"

# ═══════════════════════════════════════════════════════════════════════
# STEP 5: Write environment config
# ═══════════════════════════════════════════════════════════════════════
step "Step 5/9: Writing environment configuration"

# In direct mode the Next.js standalone server is exposed publicly → bind all
# interfaces. In Caddy mode we keep it loopback-only for safety.
if [[ -n "$CADDY_SITE_ADDR" ]]; then
  SITE_BIND="127.0.0.1"
else
  SITE_BIND="0.0.0.0"
fi

cat > "$INSTALL_DIR/.env" << EOF
# Auto-generated by setup.sh — do not edit manually.
# Re-run setup.sh to change values.

DATABASE_URL=file:$INSTALL_DIR/db/custom.db
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_ADMIN_ID=$ADMIN_ID
BOT_PORT=$BOT_PORT
BOT_SERVICE_URL=http://localhost:$BOT_PORT
BOT_HEALTH_URL=http://localhost:$BOT_PORT/health
SITE_PORT=$SITE_PORT
SITE_URL=http://localhost:$SITE_PORT
PORT=$SITE_PORT
HOSTNAME=$SITE_BIND
NODE_ENV=production
EOF

chmod 600 "$INSTALL_DIR/.env"
chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/.env"
ok ".env written (site binds to $SITE_BIND:$SITE_PORT)"

# Also create .env for the bot (it reads from its own dir as fallback)
cat > "$INSTALL_DIR/mini-services/telegram-bot/.env" << EOF
DATABASE_URL=file:$INSTALL_DIR/db/custom.db
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_ADMIN_ID=$ADMIN_ID
BOT_PORT=$BOT_PORT
EOF
chmod 600 "$INSTALL_DIR/mini-services/telegram-bot/.env"
chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/mini-services/telegram-bot/.env"
ok "Bot .env written"

# ═══════════════════════════════════════════════════════════════════════
# STEP 6: Install dependencies, build, database
# ═══════════════════════════════════════════════════════════════════════
step "Step 6/9: Installing dependencies & building"

cd "$INSTALL_DIR"

info "Installing site dependencies (bun install)..."
sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && '$BUN_BIN' install" 2>&1 | tail -3
ok "Site dependencies installed"

info "Generating Prisma client..."
sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && '$BUN_BIN' run db:generate" 2>&1 | tail -3
ok "Prisma client generated"

info "Building Next.js site (this may take a minute)..."
sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && '$BUN_BIN' run build" 2>&1 | tail -5
ok "Site built"

info "Setting up database (db:push)..."
sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && DATABASE_URL='file:$INSTALL_DIR/db/custom.db' '$BUN_BIN' run db:push" 2>&1 | tail -3
ok "Database schema pushed"

info "Seeding products..."
sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && DATABASE_URL='file:$INSTALL_DIR/db/custom.db' '$BUN_BIN' run db:seed" 2>&1 | tail -5
ok "Products seeded"

# Seed default admin user for the admin panel
# Default credentials: admin / admin12345
# Can be overridden via env vars ADMIN_USERNAME / ADMIN_PASSWORD (set before running setup.sh)
info "Seeding default admin user..."
DEFAULT_ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
DEFAULT_ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin12345}"
sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && DATABASE_URL='file:$INSTALL_DIR/db/custom.db' ADMIN_USERNAME='$DEFAULT_ADMIN_USERNAME' ADMIN_PASSWORD='$DEFAULT_ADMIN_PASSWORD' '$BUN_BIN' run db:seed-admin" 2>&1 | tail -5
ok "Admin user seeded (username: $DEFAULT_ADMIN_USERNAME)"

# Seed example blog posts (idempotent)
if [[ -f "$INSTALL_DIR/prisma/seed-blog.ts" ]]; then
  info "Seeding blog posts..."
  sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && DATABASE_URL='file:$INSTALL_DIR/db/custom.db' '$BUN_BIN' prisma/seed-blog.ts" 2>&1 | tail -3 || true
  ok "Blog posts seeded"
fi

# Install bot dependencies
info "Installing bot dependencies..."
sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR/mini-services/telegram-bot' && '$BUN_BIN' install" 2>&1 | tail -3
ok "Bot dependencies installed"

# ═══════════════════════════════════════════════════════════════════════
# STEP 7: Configure web server (Caddy or direct exposure)
# ═══════════════════════════════════════════════════════════════════════
step "Step 7/9: Configuring web server"

if [[ -n "$CADDY_SITE_ADDR" ]]; then
  info "Configuring Caddy for: $CADDY_SITE_ADDR"

  # Stop Caddy temporarily to write config
  systemctl stop caddy 2>/dev/null || true

  # Write Caddyfile
  CADDYFILE="/etc/caddy/Caddyfile"

  # Preserve any existing (non-managed) Caddy config? We own this file in this design.
  # Set Let's Encrypt email if provided
  if [[ -n "${LE_EMAIL:-}" ]]; then
    cat > "$CADDYFILE" << EOF
{
    email $LE_EMAIL
}
EOF
  else
    echo "" > "$CADDYFILE"
  fi

  cat >> "$CADDYFILE" << EOF

# ── sarzemine-asal site (managed by setup.sh) ─────────────────────
$CADDY_SITE_ADDR {
    reverse_proxy localhost:$SITE_PORT

    encode gzip zstd

    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    @static {
        path *.js *.css *.svg *.png *.jpg *.jpeg *.gif *.ico *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    log {
        output file $LOG_DIR/caddy-access.log {
            roll_size 10mb
            roll_keep 5
        }
        format common
    }
}
# ── end sarzemine-asal site ───────────────────────────────────────
EOF

  ok "Caddyfile written to $CADDYFILE"

  # Enable and start Caddy
  systemctl enable caddy >/dev/null 2>&1
  systemctl start caddy
  sleep 3

  if systemctl is-active --quiet caddy; then
    ok "Caddy is running"
    if [[ "$CADDY_SITE_ADDR" == "$DOMAIN" ]]; then
      info "SSL certificate will be obtained automatically on first request."
      info "Visit https://$DOMAIN in your browser to trigger cert provisioning."
    fi
  else
    warn "Caddy failed to start. Check: journalctl -u caddy -e"
  fi
else
  ok "No Caddy — site exposed directly on port $PUBLIC_PORT (HTTP)"
  info "Make sure port $PUBLIC_PORT is open in your cloud provider's firewall."
fi

# ── Firewall configuration (3X-UI SAFE) ─────────────────────────────
# Rules of engagement:
#   • NEVER add deny rules
#   • NEVER enable ufw when a VPN panel (3X-UI/x-ui/xray) is present —
#     enabling it would block the panel's inbound proxy ports and break
#     VPN clients. We only append allow rules when ufw is ALREADY active.
#   • Always keep SSH allowed before any change (lockout protection)
if command -v ufw &>/dev/null; then
  UFW_ACTIVE=false
  ufw status 2>/dev/null | grep -q "Status: active" && UFW_ACTIVE=true

  if [[ "$VPN_PANEL_DETECTED" == "true" ]]; then
    if [[ "$UFW_ACTIVE" == "true" ]]; then
      info "ufw is active — adding allow rules (your VPN ports stay untouched)..."
      ufw allow ssh >/dev/null 2>&1 || true
      ufw allow 80/tcp >/dev/null 2>&1 || true
      ufw allow 443/tcp >/dev/null 2>&1 || true
      if [[ -z "$CADDY_SITE_ADDR" ]]; then
        ufw allow "$PUBLIC_PORT/tcp" >/dev/null 2>&1 || true
      fi
      ok "Firewall: allow rules added for the website (no deny rules, VPN untouched)"
    else
      info "ufw installed but INACTIVE with 3X-UI present — leaving it inactive on purpose"
      info "(enabling ufw could block your VPN inbound ports; add rules manually if needed)"
      if [[ -z "$CADDY_SITE_ADDR" ]]; then
        info "If you later enable ufw, remember: ufw allow $PUBLIC_PORT/tcp"
      fi
    fi
  else
    info "Configuring firewall (ufw)..."
    ufw allow ssh >/dev/null 2>&1 || true
    ufw allow http >/dev/null 2>&1 || true
    ufw allow https >/dev/null 2>&1 || true
    if [[ -z "$CADDY_SITE_ADDR" ]]; then
      ufw allow "$PUBLIC_PORT/tcp" >/dev/null 2>&1 || true
    fi
    # Only enable ufw if not already enabled (to avoid locking out SSH)
    if [[ "$UFW_ACTIVE" != "true" ]]; then
      echo "y" | ufw enable >/dev/null 2>&1 || true
    fi
    ok "Firewall configured (SSH, HTTP, HTTPS allowed)"
  fi
else
  info "ufw not installed — skipping firewall."
  info "Make sure ports 80/443 (or $PUBLIC_PORT) are open and $SITE_PORT/$BOT_PORT are NOT exposed."
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 8: Install systemd services + monitoring
# ═══════════════════════════════════════════════════════════════════════
step "Step 8/9: Installing services & monitoring"

# Copy systemd service files
cp "$SCRIPT_DIR/systemd/sarzemine-asal-site.service" /etc/systemd/system/
cp "$SCRIPT_DIR/systemd/sarzemine-asal-bot.service" /etc/systemd/system/
cp "$SCRIPT_DIR/systemd/sarzemine-asal-monitor.service" /etc/systemd/system/
cp "$SCRIPT_DIR/systemd/sarzemine-asal-monitor.timer" /etc/systemd/system/

# Patch service files to use correct Bun path if non-default
if [[ "$BUN_BIN" != "/home/sarzemine/.bun/bin/bun" ]]; then
  sed -i "s|/home/sarzemine/.bun/bin/bun|$BUN_BIN|g" \
    /etc/systemd/system/sarzemine-asal-*.service
fi

systemctl daemon-reload
ok "systemd services registered"

# Enable services (start on boot)
systemctl enable sarzemine-asal-site sarzemine-asal-bot >/dev/null 2>&1
ok "Services enabled for auto-start"

# Stop existing instances (if re-running)
systemctl stop sarzemine-asal-site 2>/dev/null || true
systemctl stop sarzemine-asal-bot 2>/dev/null || true
sleep 1

# Start services
info "Starting site service..."
systemctl start sarzemine-asal-site
sleep 3

info "Starting bot service..."
systemctl start sarzemine-asal-bot
sleep 3

# Enable monitoring timer
systemctl enable sarzemine-asal-monitor.timer >/dev/null 2>&1
systemctl start sarzemine-asal-monitor.timer
ok "Health monitor timer enabled (runs every 5 minutes)"

# Create log directory
mkdir -p "$LOG_DIR"
chown -R "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR" 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════════════
# STEP 9: Health verification
# ═══════════════════════════════════════════════════════════════════════
step "Step 9/9: Health Verification"

ALL_OK=true

# Check site
info "Checking website..."
sleep 3  # Give Next.js time to start
SITE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "http://localhost:$SITE_PORT" 2>/dev/null || echo "000")
if [[ "$SITE_CODE" == "200" ]]; then
  ok "Website: HTTP 200 ✓"
else
  err "Website: HTTP $SITE_CODE ✗ (may need a moment to start — check: journalctl -u sarzemine-asal-site -e)"
  ALL_OK=false
fi

# Check bot
info "Checking bot..."
BOT_HEALTH=$(curl -s --max-time 10 "http://localhost:$BOT_PORT/health" 2>/dev/null || echo "")
if echo "$BOT_HEALTH" | grep -q '"ok":true'; then
  if echo "$BOT_HEALTH" | grep -q '"polling":true'; then
    ok "Bot: healthy, polling active ✓"
  else
    warn "Bot: running but polling not yet active (may still be starting)"
  fi
else
  err "Bot: not responding ✗ (check: journalctl -u sarzemine-asal-bot -e)"
  ALL_OK=false
fi

# Check systemd services
for svc in sarzemine-asal-site sarzemine-asal-bot; do
  STATUS=$(systemctl is-active "$svc" 2>/dev/null || echo "unknown")
  if [[ "$STATUS" == "active" ]]; then
    ok "$svc: active ✓"
  else
    err "$svc: $STATUS ✗"
    ALL_OK=false
  fi
done

# Resolve bot username for the summary
BOT_USERNAME=""
BOT_USERNAME=$(curl -s --max-time 10 "https://api.telegram.org/bot$BOT_TOKEN/getMe" 2>/dev/null | jq -r '.result.username // empty' 2>/dev/null || echo "")

# ═══════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  سرزمین عسل — Installation Complete!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Website:${NC}"
if [[ -n "$CADDY_SITE_ADDR" ]]; then
  if [[ "$CADDY_SITE_ADDR" == "$DOMAIN" ]]; then
    echo -e "    https://$DOMAIN"
  else
    echo -e "    https://$CADDY_SITE_ADDR"
  fi
else
  echo -e "    http://<server-ip>:$PUBLIC_PORT"
fi
echo ""
echo -e "  ${BOLD}Bot:${NC}"
[[ -n "$BOT_USERNAME" ]] && echo -e "    Telegram: @$BOT_USERNAME"
echo -e "    Health:   http://localhost:$BOT_PORT/health"
echo ""
echo -e "  ${BOLD}Admin Panel (مدیریت):${NC}"
if [[ -n "$CADDY_SITE_ADDR" ]]; then
  echo -e "    https://$CADDY_SITE_ADDR/admin/login"
else
  echo -e "    http://<server-ip>:$PUBLIC_PORT/admin/login"
fi
echo -e "    Username: $DEFAULT_ADMIN_USERNAME"
echo -e "    Password: $DEFAULT_ADMIN_PASSWORD ${YELLOW}(change after first login)${NC}"
echo ""
echo -e "  ${BOLD}Agent Panel (نمایندگان فروش):${NC}"
if [[ -n "$CADDY_SITE_ADDR" ]]; then
  echo -e "    Register: https://$CADDY_SITE_ADDR/agent/register"
  echo -e "    Login:    https://$CADDY_SITE_ADDR/agent/login"
else
  echo -e "    Register: http://<server-ip>:$PUBLIC_PORT/agent/register"
  echo -e "    Login:    http://<server-ip>:$PUBLIC_PORT/agent/login"
fi
echo -e "    ${YELLOW}(agents register themselves; admin approves them)${NC}"
if [[ "$VPN_PANEL_DETECTED" == "true" ]]; then
  echo ""
  echo -e "  ${BOLD}3X-UI coexistence:${NC}"
  echo -e "    ${GREEN}✓${NC} Panel services untouched: ${VPN_SERVICES}"
  echo -e "    ${GREEN}✓${NC} No VPN port was modified or blocked"
  echo -e "    ${GREEN}✓${NC} Website ports: $SITE_PORT (site), $BOT_PORT (bot) — localhost only"
fi
echo ""
echo -e "  ${BOLD}Services:${NC}"
echo -e "    systemctl status sarzemine-asal-site"
echo -e "    systemctl status sarzemine-asal-bot"
echo -e "    systemctl status sarzemine-asal-monitor.timer"
echo ""
echo -e "  ${BOLD}Logs:${NC}"
echo -e "    journalctl -u sarzemine-asal-site -f"
echo -e "    journalctl -u sarzemine-asal-bot -f"
echo -e "    tail -f $LOG_DIR/monitor.log"
echo ""
echo -e "  ${BOLD}Manage:${NC}"
echo -e "    sudo systemctl restart sarzemine-asal-site"
echo -e "    sudo systemctl restart sarzemine-asal-bot"
echo ""

if [[ "$ALL_OK" == "true" ]]; then
  echo -e "${GREEN}${BOLD}  ✅ All systems healthy!${NC}"
else
  echo -e "${YELLOW}${BOLD}  ⚠️  Some services need a moment to start.${NC}"
  echo -e "${YELLOW}     Wait 30 seconds and check: systemctl status sarzemine-asal-*${NC}"
  echo -e "${YELLOW}     The monitor will auto-restart failed services.${NC}"
fi
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
