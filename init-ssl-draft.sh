#!/bin/bash

# 1. Download recommended TLS parameters
if [ ! -e "certbot/conf/options-ssl-nginx.conf" ] || [ ! -e "certbot/conf/ssl-dhparams.pem" ]; then
  mkdir -p certbot/conf
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
fi

# 2. Request Certificate (Dry Run first recommended, remove --dry-run for actual)
# This uses the webroot method, placing the challenge in ./certbot/www
# Nginx serves it via the volume mapping
echo "Running Certbot..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email your-email@example.com \
    -d api.polyagents.tech \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" nginx
    # Note: Using nginx image here won't have certbot installed. 
    # We need a certbot container.

# Wait, the user asked for steps.
# I should add a certbot service to docker-compose so they can just run it.
