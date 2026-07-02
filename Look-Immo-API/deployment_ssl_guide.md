# Look Immo — HTTPS & SSL Deployment Guide
This guide details how to configure **Nginx** as a reverse proxy, obtain free SSL/TLS certificates via **Let's Encrypt (Certbot)**, and enforce **1-Year HSTS** to comply with Organic Law 2004-63 on data privacy.

---

## 📋 Prerequisites
1. A Linux VPS (Ubuntu 20.04/22.04 recommended).
2. Domain names (e.g., `look-immo.tn` and `www.look-immo.tn`) pointing to your server's public IP address (DNS A/AAAA records).
3. The platform built and running on the VPS under PM2 (`pm2 start ecosystem.config.js`).

---

## 🛠️ Step-by-Step Setup

### Step 1: Install Nginx & Certbot
On your server terminal, update packages and install Nginx alongside Certbot:
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

### Step 2: Configure a Temporary HTTP Site (for Let's Encrypt challenge)
1. Create a configuration file `/etc/nginx/sites-available/look-immo.conf`:
   ```bash
   sudo nano /etc/nginx/sites-available/look-immo.conf
   ```
2. Paste the HTTP server block (Port 80 redirect only):
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name look-immo.tn www.look-immo.tn;

       location /.well-known/acme-challenge/ {
           root /var/www/html;
       }

       location / {
           return 301 https://$host$request_uri;
       }
   }
   ```
3. Enable the configuration and test Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/look-immo.conf /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   ```
4. Restart Nginx to apply:
   ```bash
   sudo systemctl restart nginx
   ```

---

### Step 3: Obtain Let's Encrypt Certificates
Run Certbot to fetch SSL certificates for both domains. Certbot will complete the HTTP challenge, verify ownership, and download the certificates into `/etc/letsencrypt/live/look-immo.tn/`:
```bash
sudo certbot certonly --webroot -w /var/www/html -d look-immo.tn -d www.look-immo.tn --agree-tos --email contact@look-immo.tn --no-eff-email
```

---

### Step 4: Apply the Full HTTPS & HSTS Nginx Configuration
1. Open the configuration file again:
   ```bash
   sudo nano /etc/nginx/sites-available/look-immo.conf
   ```
2. Replace its entire contents with the production-ready template provided in [`nginx.conf`](./nginx.conf).
   * Ensure directory paths under `root /var/www/look-immo-front/dist;` and `alias /var/www/look-immo-api/uploads/;` accurately match the absolute paths of your files on the server.
3. Verify the Nginx syntax is correct:
   ```bash
   sudo nginx -t
   ```
4. Reload Nginx configuration:
   ```bash
   sudo systemctl reload nginx
   ```

---

## 🔄 SSL Certificate Auto-Renewal
Let's Encrypt certificates are valid for 90 days. Certbot automatically adds a cron job to renew them. 
To test that auto-renewal works, run:
```bash
sudo certbot renew --dry-run
```
To ensure Nginx automatically loads the renewed certificate, configure a deploy hook. Add a hook script or edit `/etc/letsencrypt/cli.ini` to include:
```ini
deploy-hook = systemctl reload nginx
```

---

## 🔒 Verification
1. Open your browser and navigate to `http://look-immo.tn`. It should immediately redirect to `https://look-immo.tn`.
2. Inspect the HTTP headers to confirm that HSTS is enforced:
   ```bash
   curl -I https://look-immo.tn
   ```
   **Expected Response Header:**
   ```http
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```
   *(This forces browsers to only connect over HTTPS, preventing SSL-stripping attacks).*
