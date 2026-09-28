#!/usr/bin/env bash

# ==============================================================================
# GroupTrust VPS Domain & SSL Configuration Script
# Automated Nginx reverse proxy setup and Let's Encrypt SSL certificate installer
# ==============================================================================

set -e

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}   GroupTrust Domain & SSL Configuration Script       ${NC}"
echo -e "${CYAN}======================================================${NC}"

# 1. Require root or sudo privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script with sudo or as root:${NC}"
  echo -e "  sudo bash setup-vps-domain.sh"
  exit 1
fi

# 2. Get Domain & Admin Email
DOMAIN="${1:-group-trust.work.gd}"
echo -e "${YELLOW}Configuring domain:${NC} ${GREEN}${DOMAIN}${NC}"

if [ -n "$2" ]; then
  EMAIL="$2"
else
  read -rp "Enter admin email for Let's Encrypt SSL notifications: " EMAIL
  while [ -z "$EMAIL" ]; do
    echo -e "${RED}Email cannot be empty (required for Let's Encrypt SSL).${NC}"
    read -rp "Enter admin email: " EMAIL
  done
fi

# 3. Update repositories and install required packages
echo -e "\n${YELLOW}[1/6] Installing Nginx, Certbot, and Python Certbot plugin...${NC}"
apt update -y
apt install -y nginx certbot python3-certbot-nginx curl ufw

# 4. Configure firewall (if UFW is active)
echo -e "\n${YELLOW}[2/6] Configuring firewall rules for HTTP/HTTPS...${NC}"
if ufw status | grep -qw "active"; then
  ufw allow 'Nginx Full'
  echo -e "${GREEN}Allowed 'Nginx Full' (ports 80 & 443) in UFW.${NC}"
else
  echo -e "UFW is not currently active, skipping firewall adjustment."
fi

# 5. Create Nginx Server Configuration
NGINX_CONF_PATH="/etc/nginx/sites-available/grouptrust"
echo -e "\n${YELLOW}[3/6] Generating Nginx reverse-proxy configuration at ${NGINX_CONF_PATH}...${NC}"

cat > "$NGINX_CONF_PATH" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Increase maximum payload size for transaction attachments and receipts
    client_max_body_size 25M;

    # 1. API Route - Proxy to Express Backend (Port 5001)
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # 2. Frontend Route - Proxy to Next.js App (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site and disable conflicting default if present
ln -sf "$NGINX_CONF_PATH" /etc/nginx/sites-enabled/grouptrust
if [ -f /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
fi

# 6. Test and Reload Nginx
echo -e "\n${YELLOW}[4/6] Testing Nginx configuration...${NC}"
nginx -t
systemctl reload nginx
echo -e "${GREEN}Nginx successfully reloaded!${NC}"

# 7. Request and Install SSL Certificate with Certbot
echo -e "\n${YELLOW}[5/6] Requesting Let's Encrypt SSL certificate for ${DOMAIN}...${NC}"

certbot --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL" \
  --redirect

# 8. Test Automatic Renewal
echo -e "\n${YELLOW}[6/6] Verifying SSL auto-renewal timer...${NC}"
certbot renew --dry-run

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}   SSL & Domain Configuration Completed Successfully! ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "Your website is now secure and live with HTTPS at:"
echo -e "  ${CYAN}https://${DOMAIN}${NC}"
echo -e "API endpoints routed at:"
echo -e "  ${CYAN}https://${DOMAIN}/api${NC}"
echo -e "\nMake sure your PM2 services are running:"
echo -e "  pm2 status"
echo -e "======================================================"
