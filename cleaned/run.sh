#!/usr/bin/env bash
# run.sh — CodeAura v3.1.0 local test + publish helper
# Usage:
#   ./run.sh          — install deps + link globally + smoke test
#   ./run.sh publish  — npm publish (dry run first)
#   ./run.sh clean    — remove node_modules + cache files

set -e

GREEN='\033[0;32m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

print_step() { echo -e "\n${BOLD}▸ $1${RESET}"; }
print_ok()   { echo -e "  ${GREEN}✓${RESET} $1"; }
print_dim()  { echo -e "  ${DIM}· $1${RESET}"; }

# ─── CLEAN ────────────────────────────────────────────────────────────────────
if [ "$1" = "clean" ]; then
  print_step "Cleaning"
  rm -rf node_modules
  rm -f .codeaura-hashes.json .codeaura-chat.json .codeaura-api-key
  rm -f codeaura-export-*.html codeaura-export-*.json codeaura-export-*.md
  print_ok "Cleaned."
  exit 0
fi

# ─── PUBLISH ──────────────────────────────────────────────────────────────────
if [ "$1" = "publish" ]; then
  print_step "Pre-publish checks"

  # Verify package.json
  node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf-8')); \
    console.log('  · name:',p.name); \
    console.log('  · version:',p.version); \
    console.log('  · bin:',JSON.stringify(p.bin));"

  print_step "Dry run"
  npm publish --dry-run

  echo ""
  read -p "  Publish to npm? (y/N) " confirm
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    print_step "Publishing"
    npm publish --access public
    print_ok "Published! npm i -g codeaura"
  else
    print_dim "Aborted."
  fi
  exit 0
fi

# ─── DEFAULT: install + link + smoke test ────────────────────────────────────
print_step "CodeAura v3.1.0 — Local Test"

# Check Node version
NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "  ✗ Node.js >= 18 required (found $(node --version))"
  exit 1
fi
print_ok "Node.js $(node --version)"

# Install dependencies
print_step "Installing dependencies"
npm install
print_ok "Dependencies installed"

# Optional packages
print_step "Installing optional packages"
npm install p-limit fast-glob chokidar --save-optional 2>/dev/null || true
print_ok "Optional packages ready"

# Create test repo if it doesn't exist
TEST_DIR="./test-repo"
if [ ! -d "$TEST_DIR" ]; then
  print_step "Creating test repository"
  mkdir -p "$TEST_DIR/src"

  cat > "$TEST_DIR/src/auth.js" << 'EOF'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyToken(token, secret) {
  try {
    const decoded = jwt.verify(token, secret);
    return { valid: true, payload: decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

export function generateToken(userId, secret, expiresIn = '7d') {
  return jwt.sign({ userId, iat: Date.now() }, secret, { expiresIn });
}
EOF

  cat > "$TEST_DIR/src/database.ts" << 'EOF'
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

export async function findUserById(id: string) {
  const rows = await query<{id: string; email: string}>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createUser(email: string, passwordHash: string) {
  const rows = await query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *', [email, passwordHash]);
  return rows[0];
}
EOF

  cat > "$TEST_DIR/src/middleware.js" << 'EOF'
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

export function rateLimiter(maxRequests = 100, windowMs = 60000) {
  const clients = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const data = clients.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > data.resetAt) { data.count = 0; data.resetAt = now + windowMs; }
    if (data.count >= maxRequests) return res.status(429).json({ error: 'Rate limit exceeded' });
    data.count++;
    clients.set(key, data);
    next();
  };
}
EOF

  cat > "$TEST_DIR/src/router.go" << 'EOF'
package main

import (
    "net/http"
    "github.com/gorilla/mux"
)

func NewRouter() *mux.Router {
    r := mux.NewRouter()
    r.HandleFunc("/api/users", GetUsers).Methods("GET")
    r.HandleFunc("/api/users/{id}", GetUser).Methods("GET")
    r.HandleFunc("/api/auth/login", Login).Methods("POST")
    r.HandleFunc("/api/auth/logout", Logout).Methods("POST")
    return r
}

func GetUsers(w http.ResponseWriter, r *http.Request) {
    users, err := db.FindAll()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(users)
}
EOF

  cat > "$TEST_DIR/package.json" << 'EOF'
{"name": "test-repo", "version": "1.0.0"}
EOF

  print_ok "Test repository created at $TEST_DIR"
fi

# Copy .env if it exists
if [ -f ".env" ]; then
  print_ok "Using existing .env"
elif [ -f ".env.example" ]; then
  print_dim "No .env found — copying from .env.example"
  cp .env.example .env
  print_dim "Edit .env to add your GROQ_API_KEY and HUGGINGFACE_API_KEY"
fi

# Link globally
print_step "Linking globally (npm link)"
npm link 2>/dev/null || sudo npm link 2>/dev/null || true
print_ok "codeaura command available"

# Smoke test: version
print_step "Smoke test: version"
codeaura --version

# Smoke test: doctor
print_step "Smoke test: doctor"
codeaura doctor

# Smoke test: index
print_step "Smoke test: index $TEST_DIR"
codeaura setup "$TEST_DIR" --no-menu

# Smoke test: diff
print_step "Smoke test: diff"
codeaura diff "$TEST_DIR"

echo ""
echo -e "${BOLD}  CodeAura v3.1.0 is ready.${RESET}"
echo ""
echo -e "  ${DIM}Commands to try:${RESET}"
echo -e "  ${DIM}codeaura search \"JWT authentication\"${RESET}"
echo -e "  ${DIM}codeaura chat${RESET}"
echo -e "  ${DIM}codeaura serve${RESET}"
echo -e "  ${DIM}codeaura stats${RESET}"
echo ""