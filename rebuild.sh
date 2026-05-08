#!/bin/bash

APP_DIR="/var/www/sti-cubao-paging-system"

echo "Building frontend..."
cd "$APP_DIR/client"

npm run build

echo "Deploying build..."
sudo rm -rf "$APP_DIR/client-dist"/*
sudo cp -r dist/. "$APP_DIR/client-dist/"

echo "Restarting Apache..."
sudo systemctl reload apache2

echo "Done."
