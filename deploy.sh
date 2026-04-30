#!/bin/bash
# =============================================================
#  STI College Cubao — Faculty Paging System
#  Ubuntu Server Deploy Script
#  Run as: bash deploy.sh
# =============================================================
set -e

DOMAIN="pagesys.acatche.com"
APP_DIR="/var/www/sti-cubao-paging-system"
DB_NAME="pagesys"
DB_USER="pagesys_user"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  STI Cubao Faculty Paging System — Deploy    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. System dependencies ──────────────────────────────────
echo "[1/8] Checking system dependencies..."

if ! command -v node &>/dev/null; then
  echo "  Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "  Installing Apache..."
sudo apt-get update
sudo apt-get install -y apache2 libxml2-dev

echo "  Enabling Apache modules..."
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl

sudo systemctl restart apache2

echo "  ✓ Apache modules enabled"

# ── 2. App directory ────────────────────────────────────────
echo "[2/8] Using existing app directory at $APP_DIR..."
sudo chown -R "$USER":"$USER" "$APP_DIR"

# ── 3. Server dependencies ──────────────────────────────────
echo "[3/8] Installing Node.js dependencies..."
cd "$APP_DIR/server"
npm install --omit=dev

# ── 4. Environment file ─────────────────────────────────────
echo "[4/8] Creating .env..."
if [ ! -f "$APP_DIR/server/.env" ]; then
  read -rsp "  Enter MySQL root password: " MYSQL_ROOT_PASS; echo ""
  read -rsp "  Set a DB password for '$DB_USER': " DB_PASS; echo ""
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")

  cat > "$APP_DIR/server/.env" <<EOF
PORT=3001
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
CLIENT_URL=https://$DOMAIN
NODE_ENV=production
EOF

  # ── 5. MySQL setup ────────────────────────────────────────
  echo "[5/8] Setting up MySQL database..."
  mysql -u root -p"$MYSQL_ROOT_PASS" <<MYSQL_SCRIPT
    CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
    GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
    FLUSH PRIVILEGES;
MYSQL_SCRIPT
  mysql -u root -p"$MYSQL_ROOT_PASS" "$DB_NAME" < "$APP_DIR/schema.sql"
  echo "  ✓ Database and tables created"
  echo "  ✓ Default admin: username=admin  password=Admin@1234  (CHANGE THIS!)"
else
  echo "  .env already exists — skipping DB setup"
fi

# ── 6. Build React client ────────────────────────────────────
echo "[6/8] Building React client..."
cd "$APP_DIR/client"
cat > .env.production <<EOF
VITE_API_URL=
EOF
npm install
npm run build
sudo mkdir -p "$APP_DIR/client-dist"
sudo cp -r dist/. "$APP_DIR/client-dist/"
echo "  ✓ Client built to $APP_DIR/client-dist"

# ── 7. Apache config ─────────────────────────────────────────
echo "[7/8] Installing Apache config..."
sudo cp "$APP_DIR/apache/pagesys.conf" "/etc/apache2/sites-available/pagesys.conf"
sudo sed -i "s|/var/www/pagesys/client|$APP_DIR/client-dist|g" /etc/apache2/sites-available/pagesys.conf
sudo a2ensite pagesys &>/dev/null
sudo a2dissite 000-default &>/dev/null || true
sudo systemctl reload apache2
echo "  ✓ Apache configured and reloaded"

# ── 8. systemd service ──────────────────────────────────────
echo "[8/8] Installing systemd service..."
sudo cp "$APP_DIR/pagesys.service" /etc/systemd/system/
sudo sed -i "s|WorkingDirectory=.*|WorkingDirectory=$APP_DIR/server|" /etc/systemd/system/pagesys.service
sudo chown -R www-data:www-data "$APP_DIR/server/uploads"
sudo systemctl daemon-reload
sudo systemctl enable pagesys
sudo systemctl start pagesys
echo "  ✓ pagesys service started"

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  Student Kiosk:    http://$DOMAIN/outside"
echo "  Faculty Display:  http://$DOMAIN/faculty"
echo "  Admin Panel:      http://$DOMAIN/admin"
echo ""
echo "  ⚠️  Run SSL next:"
echo "  sudo apt install certbot python3-certbot-apache"
echo "  sudo certbot --apache -d $DOMAIN"
echo ""
echo "  ⚠️  Change admin password at first login!"
echo "      Default: admin / Admin@1234"
echo "═══════════════════════════════════════════════"
