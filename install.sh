#!/bin/bash

echo "======================================================"
echo "       Tingle Live Streaming - Backend Installer      "
echo "======================================================"
echo ""

# 1. Dependency Checks
if ! command -v node &> /dev/null; then
    echo "[!] Node.js could not be found. Please install Node.js v14+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "[!] NPM could not be found. Please install NPM first."
    exit 1
fi

echo "[*] Node.js & NPM found. Installing packages..."
npm install

echo ""
echo "======================================================"
echo "      Step 2: Database Server Installation            "
echo "======================================================"

if ! command -v mongod &> /dev/null; then
    echo "[*] MongoDB not found on this Droplet."
    read -p "Do you want to install MongoDB Community Server natively now? (y/n) [y]: " INSTALL_MONGO
    INSTALL_MONGO=${INSTALL_MONGO:-y}
    
    if [[ "$INSTALL_MONGO" == "y" || "$INSTALL_MONGO" == "Y" ]]; then
        echo "[*] Installing MongoDB... (This may take a minute)"
        sudo apt-get install gnupg -y
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
           sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        sudo apt-get update
        sudo apt-get install -y mongodb-org
        sudo systemctl start mongod
        sudo systemctl enable mongod
        echo "[+] MongoDB installed and is now running on port 27017."
    fi
else
    echo "[+] MongoDB is already installed on this machine."
fi

echo ""
echo "======================================================"
echo "      Step 3: Database and Environment Setup          "
echo "======================================================"

if [ ! -f .env ]; then
    echo "[*] Copying .env.example to .env..."
    cp .env.example .env
else
    echo "[*] .env file already exists. Updating configurations..."
fi

# Prompt for Database
read -p "Enter your MongoDB Connection String [mongodb://localhost:27017/tingle]: " MONGODB_URI
MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017/tingle}

# Prompt for Port
read -p "Enter Server Port [3000]: " SERVER_PORT
SERVER_PORT=${SERVER_PORT:-3000}

# Prompt for Base URL
read -p "Enter your Base URL (e.g. https://api.mydomain.com) [http://localhost:3000]: " BASE_URL
BASE_URL=${BASE_URL:-http://localhost:3000}

# Update the .env file
# Works cross-platform for Linux/Windows Git Bash
sed -i.bak -e "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|g" .env
sed -i.bak -e "s|^PORT=.*|PORT=$SERVER_PORT|g" .env
sed -i.bak -e "s|^BASE_URL=.*|BASE_URL=$BASE_URL|g" .env
rm -f .env.bak

echo "[+] Environment variables successfully injected."

echo ""
echo "======================================================"
echo "      Step 4: Database Seeding (Optional)             "
echo "======================================================"

read -p "Do you want to seed the database with initial Admin & App Settings? (y/n) [n]: " SEED_DB
if [[ "$SEED_DB" == "y" || "$SEED_DB" == "Y" ]]; then
    echo "[*] Running automatic database seed sequence..."
    npm run seed
    echo "[+] Database seeded successfully."
else
    echo "[-] Skipping database seeding."
fi

echo ""
echo "======================================================"
echo "      Step 5: Launch Backend Server                   "
echo "======================================================"

read -p "Do you want to start the server now? (y/n) [y]: " START_SERVER
START_SERVER=${START_SERVER:-y}

if [[ "$START_SERVER" == "y" || "$START_SERVER" == "Y" ]]; then
    read -p "Use PM2 to run permanently in background? (Recommended for Production) (y/n) [n]: " USE_PM2
    if [[ "$USE_PM2" == "y" || "$USE_PM2" == "Y" ]]; then
        if ! command -v pm2 &> /dev/null; then
            echo "[*] PM2 not found. Installing PM2 globally via NPM..."
            npm install -g pm2
        fi
        echo "[*] Starting server through PM2 orchestrator..."
        pm2 start src/server.js --name "tingle-api"
        pm2 save
        echo "[+] Server is now running in the background."
        pm2 logs tingle-api --lines 10
    else
        echo "[*] Starting server natively in current terminal pane..."
        echo "[!] Do not close this terminal or the server will stop."
        npm start
    fi
else
    echo "Installation complete! You can start your backend anytime by typing:"
    echo "  -> npm start"
    echo "  -> npm run dev (for live reloading)"
    echo "  -> pm2 start src/server.js (for background daemon)"
fi

echo ""
echo "======================================================"
echo "    Finished! Backend is fully configured & ready.    "
echo "======================================================"
