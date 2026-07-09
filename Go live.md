# Go Live Deployment Guide

This guide assumes you are starting from zero. Follow it step by step. Do not take real user money until SSL, backups, logs, and a test payment flow are verified.

## 0. What You Need

You need:

- A VPS server with Ubuntu.
- A domain name.
- This project code on GitHub or another Git server.
- Docker and Docker Compose on the VPS.
- Strong production secrets in `backend/.env`.
- SSL certificate before real public launch.

Recommended minimum for serious launch:

- Starting/staging: 4 vCPU, 8 GB RAM, 100 GB NVMe.
- Better production base: 8 vCPU, 16 GB RAM, 200 GB NVMe.
- Bigger growth target: 16 vCPU, 32 GB RAM, 300 GB+ NVMe.

## 1. Where To Buy VPS

Pick one VPS provider. For beginners, Hostinger or DigitalOcean is usually easier. Hetzner is often cost-effective but may feel more technical. AWS Lightsail is also simple but AWS billing/account setup can feel heavier.

Examples:

- Hostinger VPS: https://www.hostinger.com/vps-hosting
- DigitalOcean Droplets: https://www.digitalocean.com/pricing/droplets
- Hetzner Cloud: https://www.hetzner.com/cloud
- AWS Lightsail: https://aws.amazon.com/lightsail/

When buying:

- Choose Ubuntu 24.04 LTS or Ubuntu 22.04 LTS.
- Choose a region close to your users.
- Save the VPS IP address.
- Save the root password or SSH key safely.

## 2. Where To Buy Domain

Buy a domain from any registrar:

- Hostinger
- Namecheap
- GoDaddy
- Cloudflare Registrar

After buying, keep these ready:

- Domain name, example: `yourdomain.com`
- Registrar login
- DNS management access

## 3. Open VPS Terminal

You can access VPS in two ways:

### Option A: Provider Browser Terminal

Most VPS dashboards have a browser terminal/console. Open it from the provider panel.

### Option B: Your Computer Terminal

On Windows, open PowerShell. Run:

```bash
ssh root@YOUR_VPS_IP
```

Example:

```bash
ssh root@123.45.67.89
```

Accept fingerprint by typing `yes`, then enter password.

## 4. First Server Security

Update server:

```bash
apt update && apt upgrade -y
```

Create app directory:

```bash
mkdir -p /var/www
cd /var/www
```

Install basic tools:

```bash
apt install -y git curl nano ufw ca-certificates
```

Enable firewall for HTTP staging:

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw enable
```

When SSL is added later, allow 443:

```bash
ufw allow 443/tcp
```

## 5. Install Docker

Install using Docker official Ubuntu method:

```bash
apt remove -y docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc || true
apt update
apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Check:

```bash
docker --version
docker compose version
```

## 6. Upload Project To VPS

### Option A: Clone From Git

Recommended.

```bash
cd /var/www
git clone YOUR_GIT_REPOSITORY_URL arbitrum
cd arbitrum
```

Example:

```bash
git clone https://github.com/your-user/your-repo.git arbitrum
cd arbitrum
```

### Option B: Upload ZIP

If you do not use Git:

1. Zip project on your computer.
2. Upload using provider file manager or `scp`.
3. Extract into `/var/www/arbitrum`.

Example from Windows PowerShell:

```bash
scp .\project.zip root@YOUR_VPS_IP:/var/www/
```

On VPS:

```bash
cd /var/www
apt install -y unzip
unzip project.zip -d arbitrum
cd arbitrum
```

## 7. Create Production Env File

Create env file:

```bash
cd /var/www/arbitrum
cp backend/.env.production.example backend/.env
nano backend/.env
```

Fill values carefully.

### Required Values

Use HTTP until SSL is ready:

```env
FRONTEND_URL=http://yourdomain.com
COOKIE_SECURE=false
```

After SSL:

```env
FRONTEND_URL=https://yourdomain.com
COOKIE_SECURE=true
```

Generate random secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Use those outputs for:

```env
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
PAYMENT_WALLET_ENCRYPTION_KEY=...
```

Set Mongo password:

```env
MONGO_INITDB_ROOT_USERNAME=arbitrum_admin
MONGO_INITDB_ROOT_PASSWORD=YOUR_STRONG_MONGO_PASSWORD
MONGODB_URI=mongodb://arbitrum_admin:YOUR_STRONG_MONGO_PASSWORD@mongo:27017/arbitrum?authSource=admin
```

Set Redis password:

```env
REDIS_ENABLED=true
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD
REDIS_URL=redis://:YOUR_STRONG_REDIS_PASSWORD@redis:6379
```

Keep auto withdrawal disabled until fully tested:

```env
WITHDRAWAL_ADMIN_PRIVATE_KEY=
```

Enable file logs:

```env
LOG_TO_FILE=true
LOG_DIR=logs
LOG_MAX_SIZE_BYTES=10485760
LOG_MAX_FILES=10
API_ACTIVITY_TRACKING_ENABLED=true
API_ACTIVITY_RETENTION_DAYS=30
```

Save in nano:

- Press `CTRL + O`
- Press `Enter`
- Press `CTRL + X`

Lock env file:

```bash
chmod 600 backend/.env
```

## 8. Start Production Containers

Start basic production:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml up -d --build
```

This production compose is designed for:

- Host Nginx on the VPS for domain + SSL
- Docker frontend bound to `127.0.0.1:8080`
- Two backend API containers by default for a 4-core style base
- One single worker container
- Docker backend/worker/mongo/redis on the internal Docker network

Default `up -d --build` now starts:

- `backend`
- `backend-2`
- `worker`
- `mongo`
- `redis`
- `mongo-backup`
- `frontend`

For a bigger VPS, increase beyond the default two API containers only after load testing:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml up -d --build
```

Do not add extra worker containers. Worker must stay single.

Check running containers:

```bash
docker ps
```

You should see:

- frontend container
- `backend`
- `backend-2`
- `arbitrum-worker-prod`
- `arbitrum-mongo-prod`
- `arbitrum-redis-prod`
- `arbitrum-mongo-backup-prod`

## 9. Sync Database Indexes

Run after containers start:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml exec backend npm run db:indexes
```

This helps MongoDB queries stay fast.

## 10. Create Admin Or Super Admin

Use existing scripts from backend container.

Create admin:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml exec backend npm run admin:create
```

Create super admin:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml exec backend npm run super-admin:create
```

If script asks email/password, enter carefully and save credentials.

## 11. Check Website

Open:

```text
http://YOUR_VPS_IP
```

If domain DNS is ready:

```text
http://yourdomain.com
```

Check API:

```text
http://yourdomain.com/api/v1/health
```

## 12. Check Logs

Live Docker logs:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml logs -f backend
docker logs -f arbitrum-worker-prod
docker logs -f arbitrum-mongo-backup-prod
```

File logs on VPS:

```bash
ls -lh logs/backend
tail -f logs/backend/app.log
tail -f logs/backend/error.log
```

## 13. Check Backups

Backup service runs automatically.

Check backup logs:

```bash
docker logs -f arbitrum-mongo-backup-prod
```

List backup files:

```bash
docker exec -it arbitrum-mongo-backup-prod ls -lh /backups
```

Important: current backup is on the same VPS. Later copy backups to another VPS or S3-like storage.

## 14. Domain DNS Setup

In your domain DNS panel:

Create A record:

```text
Type: A
Name: @
Value: YOUR_VPS_IP
Proxy: DNS only or proxied if using Cloudflare
```

Optional www:

```text
Type: A
Name: www
Value: YOUR_VPS_IP
```

Wait 5 minutes to 24 hours depending on DNS propagation.

Check from your computer:

```bash
ping yourdomain.com
```

## 15. SSL Setup Before Real Public Launch

Do not launch real money/users without SSL.

When domain points to VPS, install host Nginx and Certbot:

```bash
apt install -y nginx
apt install -y snapd
snap install core
snap refresh core
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot
```

Copy [nginx-arbitrum.conf](/D:/arbitrum/arbitt/nginx-arbitrum.conf) to VPS Nginx sites config, update domain names, then issue certificate:

```bash
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Then follow exact SSL file changes in:

```text
FUTURE_SSL_SETUP.md
```

After SSL, update `backend/.env`:

```env
FRONTEND_URL=https://yourdomain.com
COOKIE_SECURE=true
```

Reload Nginx and restart Docker app:

```bash
nginx -t
systemctl reload nginx
docker compose --env-file backend/.env -f docker-compose.prod.yml up -d --build
```

Open:

```text
https://yourdomain.com
```

## 16. Cloudflare Optional Setup

Cloudflare helps hide VPS IP and reduce attack traffic.

Steps:

1. Add domain to Cloudflare.
2. Change nameservers at registrar.
3. Add A record to VPS IP.
4. Enable proxy orange cloud.
5. Set SSL/TLS mode to `Full (strict)` after VPS SSL is installed.
6. Enable Always Use HTTPS.

Do not use Cloudflare `Flexible` SSL for this app.

## 17. Production Wallet Setup

Inside admin panel:

1. Login as super admin/admin.
2. Set platform payment wallet address.
3. Test with tiny amount first.
4. Submit tx hash from user side.
5. Confirm system verifies on-chain and credits correctly.

Keep `WITHDRAWAL_ADMIN_PRIVATE_KEY` blank until manual withdrawals and accounting are tested.

## 18. Smoke Test Checklist

Before real users:

- Website opens.
- Login works.
- Register works.
- Admin login works.
- Health API works.
- Mongo backup file exists.
- Logs write to `logs/backend`.
- Redis is connected.
- `npm run db:indexes` ran successfully.
- Test deposit tx hash flow works.
- Test withdrawal request works.
- SSL works.
- Cookies are secure after SSL.

## 19. Update Deployment Later

When code changes:

```bash
cd /var/www/arbitrum
git pull
docker compose --env-file backend/.env -f docker-compose.prod.yml up -d --build
docker compose --env-file backend/.env -f docker-compose.prod.yml exec backend npm run db:indexes
```

Check logs:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml logs -f backend
```

## 20. Rollback If Something Breaks

If deploy breaks:

```bash
cd /var/www/arbitrum
git log --oneline -5
git checkout PREVIOUS_COMMIT_HASH
docker compose --env-file backend/.env -f docker-compose.prod.yml up -d --build
```

After rollback, check:

```bash
docker ps
docker compose --env-file backend/.env -f docker-compose.prod.yml logs -f backend
```

## 21. Commands You Will Use Most

Start:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml up -d --build
```

Stop:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml down
```

Restart:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml restart
```

Logs:

```bash
docker compose --env-file backend/.env -f docker-compose.prod.yml logs -f
```

Check containers:

```bash
docker ps
```

Check disk:

```bash
df -h
```

Check RAM:

```bash
free -h
```

## 22. What Is Already Implemented

Implemented in this repo:

- Docker production setup.
- Docker frontend Nginx for SPA + API proxy.
- Nginx upstream load balancing across `backend` and `backend-2`.
- Host Nginx config for domain + SSL termination.
- Backend API container.
- Separate BullMQ worker container.
- Redis with password.
- MongoDB with password.
- MongoDB automated backup container.
- File logs under `logs/backend`.
- Production env example.
- Future SSL guide.
- Health endpoint.
- Container healthchecks.
- Rate limits.
- Secure HTTP-only auth cookies.

Still must be done on real VPS:

- Fill real `backend/.env`.
- Configure domain DNS.
- Configure SSL.
- Run database indexes.
- Create admin.
- Test backups.
- Test payment flow.
- Add offsite backups.

## 23. Official References

- Docker Engine Ubuntu install: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose plugin: https://docs.docker.com/compose/install/linux/
- Certbot Nginx instructions: https://certbot.eff.org/instructions
- Cloudflare SSL modes: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/
- Cloudflare Full Strict: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
