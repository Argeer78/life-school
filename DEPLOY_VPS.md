# Lifeschool VPS Deployment

This runbook deploys Lifeschool from the repository root to an Ubuntu VPS. It
changes only the deployment environment; the certified Steward pipeline and
learner experience remain unchanged.

## Deployment configuration

| Setting | Value |
| --- | --- |
| Repository | `git@github.com:Argeer78/life-school.git` |
| Branch | `main` |
| Deployment root | Repository root |
| Application user | `lifeschool` |
| Application path | `/home/lifeschool/apps/lifeschool` |
| Node.js | `22.x` |
| Application command | `npm start` |
| Internal address | `127.0.0.1:3048` |
| PM2 process | `lifeschool` |
| Domains | `lifesh.app`, `www.lifesh.app` |

Run system-administration commands from an existing Ubuntu user with `sudo`
access. Run repository, npm, and PM2 commands as `lifeschool`.

## 1. Configure DNS

At the authoritative DNS provider, create:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | The VPS public IPv4 address |
| `CNAME` | `www` | `lifesh.app` |

If the VPS has configured public IPv6, also create an `AAAA` record for `@`.
Either add a corresponding `AAAA` record for `www` or keep the `www` CNAME.
Remove conflicting records and wait for DNS propagation before requesting the
TLS certificate.

Verify both names:

```bash
dig +short lifesh.app
dig +short www.lifesh.app
```

## 2. Prepare Ubuntu and Node.js 22

Install the operating-system dependencies:

```bash
sudo apt update
sudo apt install -y curl git nginx
```

Install Node.js 22 from the NodeSource Ubuntu repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
rm /tmp/nodesource_setup.sh
node --version
npm --version
```

`node --version` must report Node.js `v22.x`.

Install PM2:

```bash
sudo npm install --global pm2@latest
pm2 --version
```

If UFW is enabled, expose SSH and Nginx, not port `3048`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw status
```

## 3. Create the Linux user

Create a dedicated, non-root application user and application directory:

```bash
sudo adduser --disabled-password --gecos "" lifeschool
sudo install -d -o lifeschool -g lifeschool /home/lifeschool/apps
```

Do not run the Node.js application as `root`.

## 4. Add GitHub deploy access

Open a shell as the application user:

```bash
sudo -iu lifeschool
```

Create a repository-specific SSH key:

```bash
install -d -m 700 ~/.ssh
ssh-keygen -t ed25519 -C "lifesh.app deploy" \
  -f ~/.ssh/lifeschool_github -N ""
cat ~/.ssh/lifeschool_github.pub
```

In GitHub, open `Argeer78/life-school`, then:

1. Go to **Settings → Deploy keys → Add deploy key**.
2. Name it `lifesh.app VPS`.
3. Paste the displayed public key.
4. Leave **Allow write access** disabled.

Configure SSH to use that key:

```bash
cat > ~/.ssh/config <<'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/lifeschool_github
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
```

Test the connection:

```bash
ssh -T git@github.com
```

On the first connection, compare the displayed host-key fingerprint with
GitHub's published SSH fingerprints before accepting it. GitHub normally
responds that authentication succeeded but shell access is unavailable.

## 5. Clone the repository

Still operating as `lifeschool`:

```bash
cd /home/lifeschool/apps
git clone git@github.com:Argeer78/life-school.git lifeschool
cd /home/lifeschool/apps/lifeschool
git checkout main
git status --short
```

The working tree should be clean.

## 6. Create the production environment

Create the root production environment from the tracked example:

```bash
cd /home/lifeschool/apps/lifeschool
cp platform/steward-app/.env.example .env
chmod 600 .env
nano .env
```

Use:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3048
STEWARD_PROVIDER=openai
OPENAI_API_KEY=replace_with_the_production_key
OPENAI_MODEL=gpt-5.4-mini
OPENAI_TIMEOUT_MS=30000
ALPHA_ACCESS_CODE=replace_with_the_private_alpha_code
```

Never commit `.env` or print the API key. The repository root server reads
environment variables from the process; it does not load `.env` automatically.
Before starting or restarting the application, load the file into the current
shell:

```bash
set -a
source .env
set +a
```

Use `STEWARD_PROVIDER=fake` only when intentionally running the local fake
provider.

## 7. Install and build

From the repository root as `lifeschool`:

```bash
cd /home/lifeschool/apps/lifeschool
npm install
npm run build
```

The committed root `package-lock.json` provides the dependency lock. For later
fully reproducible deployments, `npm ci` may replace `npm install` when the
lockfile and `package.json` are synchronized.

## 8. Run the production smoke test

In the application shell:

```bash
cd /home/lifeschool/apps/lifeschool
set -a
source .env
set +a
npm start
```

In a second shell:

```bash
curl --fail --show-error http://localhost:3048/health
```

Expected response:

```json
{"status":"ok"}
```

Stop the foreground process with `Ctrl+C` after the check.

## 9. Start Lifeschool with PM2

Run PM2 as `lifeschool`, after loading the production environment:

```bash
cd /home/lifeschool/apps/lifeschool
set -a
source .env
set +a
pm2 start npm --name lifeschool -- start
pm2 status lifeschool
pm2 logs lifeschool --lines 50
```

Confirm health:

```bash
curl --fail --show-error http://localhost:3048/health
```

## 10. Enable PM2 startup and save the process list

As `lifeschool`, generate the systemd startup command:

```bash
pm2 startup systemd -u lifeschool --hp /home/lifeschool
```

PM2 prints a command beginning with `sudo env ...`. Copy and run that exact
command from a sudo-capable administrator shell. Then return to the
`lifeschool` shell and save the running process list:

```bash
pm2 save
```

Verify:

```bash
sudo systemctl status pm2-lifeschool
```

After upgrading Node.js or PM2, regenerate the PM2 startup configuration so its
systemd service uses the current executable paths.

## 11. Configure Nginx

Create `/etc/nginx/sites-available/lifesh.app`:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name lifesh.app www.lifesh.app;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:3048;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Enable and verify the site:

```bash
sudo ln -s /etc/nginx/sites-available/lifesh.app \
  /etc/nginx/sites-enabled/lifesh.app
sudo nginx -t
sudo systemctl reload nginx
```

If this VPS hosts no other default site, disable the packaged default:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Before adding TLS, verify:

```bash
curl --fail --show-error http://lifesh.app/health
```

## 12. Enable HTTPS with Certbot

After DNS resolves to the VPS and the HTTP health check works:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d lifesh.app -d www.lifesh.app
sudo certbot renew --dry-run
```

Choose HTTPS redirection when prompted.

## 13. Production health checks

Check the application directly:

```bash
curl http://localhost:3048/health
```

Check the public TLS endpoint:

```bash
curl -I https://lifesh.app
```

The second command verifies DNS, TLS, and Nginx reachability. The application
health assertion should use a `GET` request:

```bash
curl --fail --show-error https://lifesh.app/health
```

Operational checks:

```bash
pm2 status lifeschool
pm2 logs lifeschool --lines 100
sudo nginx -t
sudo systemctl status nginx
sudo systemctl status pm2-lifeschool
```

## 14. Roll back

Before each deployment, record the currently deployed commit:

```bash
cd /home/lifeschool/apps/lifeschool
git rev-parse HEAD
```

To roll back to a known-good commit:

```bash
sudo -iu lifeschool
cd /home/lifeschool/apps/lifeschool
git fetch origin
git checkout --detach KNOWN_GOOD_COMMIT_SHA
npm install
npm run build
set -a
source .env
set +a
pm2 restart lifeschool --update-env
curl --fail --show-error http://localhost:3048/health
```

Verify the public endpoint after the local health check:

```bash
curl --fail --show-error https://lifesh.app/health
```

To return to the release branch later:

```bash
git checkout main
git pull --ff-only origin main
```

This application currently has no deployment database or migration rollback.

## 15. Update deployment checklist

Use this checklist for each update:

- [ ] Confirm the target commit passed typecheck, automated tests, and the
      required evaluation process.
- [ ] Record the current production commit for rollback.
- [ ] Confirm the repository working tree is clean.
- [ ] Run `git fetch origin`.
- [ ] Run `git checkout main`.
- [ ] Run `git pull --ff-only origin main`.
- [ ] Run `npm install`.
- [ ] Run `npm run build`.
- [ ] Load `.env` with `set -a; source .env; set +a`.
- [ ] Run `pm2 restart lifeschool --update-env`.
- [ ] Run `pm2 save` if the PM2 process definition changed.
- [ ] Confirm `pm2 status lifeschool` is `online`.
- [ ] Confirm `curl --fail http://localhost:3048/health`.
- [ ] Confirm `curl --fail https://lifesh.app/health`.
- [ ] Check `pm2 logs lifeschool --lines 100`.
- [ ] Keep the previous commit SHA until production verification is complete.

## Package compatibility

The repository-root package is compatible with this VPS plan:

- `engines.node` requires Node.js `22.x`.
- `npm install` installs the root production and build dependencies.
- `npm run build` compiles the Steward application into
  `platform/steward-app/dist`.
- `npm start` runs the production entry point `app.js`.
- `app.js` reads `HOST` and `PORT`; the VPS configuration binds it to
  `127.0.0.1:3048`.
- `GET /health` returns HTTP `200` with `{"status":"ok"}`.

## References

- [GitHub deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
- [GitHub SSH host-key fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
- [NodeSource Node.js distributions](https://github.com/nodesource/distributions/blob/master/DEV_README.md)
- [PM2 startup scripts](https://pm2.keymetrics.io/docs/usage/startup/)
- [Nginx reverse proxy configuration](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Certbot instructions](https://certbot.eff.org/instructions)
