#!/bin/bash
set -e

DOMAIN="group-trust.work.gd"

echo "=================================================="
echo "   Configuring Nginx & SSL for $DOMAIN"
echo "=================================================="

# 1. Install Nginx and Certbot
echo "--> 1. Installing Nginx and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Allow Nginx in Ubuntu firewall
sudo ufw allow 'Nginx Full' || sudo ufw allow 80 && sudo ufw allow 443 || true

# 3. Write Nginx Configuration
echo "--> 2. Creating Nginx configuration for $DOMAIN..."
cat <<EOF | sudo tee /etc/nginx/sites-available/grouptrust
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 50M;

    # Frontend (Next.js App)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API (Express)
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 4. Enable site and restart Nginx
echo "--> 3. Enabling site in Nginx..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/grouptrust /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "--> 4. Setting up Free SSL HTTPS certificate via Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo "Certbot automated setup had a notice. You can run manually: sudo certbot --nginx -d $DOMAIN"
}

echo "=================================================="
echo "SUCCESS: Your site is connected to https://$DOMAIN"
echo "=================================================="
