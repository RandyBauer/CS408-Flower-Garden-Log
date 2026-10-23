# Flower Garden Log

Flower Garden Log is a record-keeping web application for home flower gardens. It records what is
planted in each bed, where each plant came from, and how it performed, across seasons.

Semester project for CS 408 Full Stack Web Development.

## Requirements

1. Install Node.js 22 or later from <https://nodejs.org>. npm is included.
2. Use a bash shell: Linux, macOS, or Git Bash on Windows.

## Run locally

```bash
git clone https://github.com/RandyBauer/CS408-Flower-Garden-Log.git
cd CS408-Flower-Garden-Log
./start.sh
```

Open <http://localhost:3000> and sign in with the demo account:

- Email: `demo@gardenlog.local`
- Password: `plant-again-2026`

`start.sh` checks for Node.js 22, installs dependencies, creates `.env` with a random session
secret, creates the SQLite database at `data/gardenlog.db`, applies migrations, loads a sample
garden and the demo account on first run, builds the application, and starts it on port 3000. It is safe to run again.
Set `PORT` to use another port: `PORT=3001 ./start.sh`.

For development with hot reload, run `npm run dev`.

## Deploy to AWS EC2

The server is Ubuntu 24.04. Its security group allows inbound SSH (port 22) and HTTP (port 80).
The `.pem` key stays outside the repository.

1. Copy the `deploy` folder to the server and run the setup script once:

   ```bash
   scp -i <key.pem> -r deploy ubuntu@<public-ip>:~
   ssh -i <key.pem> ubuntu@<public-ip>
   sudo bash deploy/setup-ec2.sh
   exit
   ```

2. Deploy from the laptop each time the server needs the latest code:

   ```bash
   ./deploy/deploy.sh -h <public-ip> -i <key.pem>
   ```

3. Create the gardener account once. The command prompts for an email and a password of at
   least 10 characters. Run it again to set a new password, which also signs out every session.

   ```bash
   ssh -t -i <key.pem> ubuntu@<public-ip> "cd /opt/gardenlog && npm run gardener:create"
   ```

4. Load the sample garden once, if the server should show it:

   ```bash
   ssh -i <key.pem> ubuntu@<public-ip> "cd /opt/gardenlog && npm run seed"
   ```

5. Open `http://<public-ip>/` and sign in.

The demo account is not created on the server.

## Scripts

| File | Runs on | Purpose |
| --- | --- | --- |
| `start.sh` | Any Linux machine | Installs dependencies, builds, and starts the application on port 3000. |
| `deploy/setup-ec2.sh` | Server, once, with sudo | Updates Ubuntu, adds a 2 GB swap file, installs Node.js 22, nginx, rsync, and sqlite3, creates `/opt/gardenlog` and its `.env`, installs the nginx site and systemd service, and allows ports 22 and 80 in `ufw`. |
| `deploy/gardenlog.service` | Server | systemd unit. Runs `npm start` in `/opt/gardenlog`, starts on boot, and restarts after a crash. |
| `deploy/nginx-gardenlog.conf` | Server | Forwards port 80 to port 3000 and allows 10 MB uploads. |
| `deploy/deploy.sh` | Laptop | Runs the unit tests, copies the code to `/opt/gardenlog`, installs dependencies, builds, restarts the service, and checks `/api/health`. Copies with rsync, or with tar over ssh where rsync is not installed. |

The server keeps `.env`, `data/`, and `uploads/` in `/opt/gardenlog` between deploys.

## Database

SQLite through better-sqlite3, stored in `data/gardenlog.db`. Set `DATABASE_PATH` to use another
file.

| Command | Purpose |
| --- | --- |
| `npm run migrate` | Creates the database if needed and applies each pending file in `db/migrations/`, in name order. Applied files are recorded in `schema_migrations`. |
| `npm run seed` | Loads the sample garden from `lib/sample-garden.ts`. Does nothing if the database already has zones. |
| `npm run gardener:create` | Creates the gardener account, or sets a new password for it. Prompts for the email and password. |
| `npm run gardener:demo` | Creates the demo account if it does not exist. Run by `start.sh` for local use. |

## Tests

| Command | Tool | Covers |
| --- | --- | --- |
| `npm test` | Vitest | Unit tests: migrations, schema constraints, and the sample garden; planting, zone, and bed validation; ending versus deleting a planting; the plant library; zone and bed delete rules; passwords and sessions. Each test uses a temporary database. Component test (React Testing Library): the planting form rejects invalid entries in the browser and submits valid ones. |
| `npm run test:e2e` | Playwright | Sign-in, wrong password, sign-out, and signed-out redirects; creating, editing, ending, and deleting a planting; an invalid planting rejected; creating and deleting a zone and bed; home page links reach every section; zones, zone detail, and bed detail show the sample garden; unknown ids show Page not found; `/api/health`. |

`npm run test:e2e` builds the application and runs it on port 3100 against `data/e2e.db`, which is
reset to the sample garden and the demo account before each run. Install the browser once first:
`npx playwright install chromium`.

## Pages

| Path | Page |
| --- | --- |
| `/` | Home: recent plantings and links to every section |
| `/sign-in` | Gardener sign-in |
| `/zones` | Zones, with bed and active planting counts; add, edit, and delete zones |
| `/zones/<id>` | Zone detail: each bed and what is planted in it now; add, edit, and delete beds |
| `/zones/<id>/edit` | Edit a zone |
| `/beds/<id>` | Bed detail: current plantings and past plantings with verdicts |
| `/beds/<id>/edit` | Edit a bed or move it to another zone |
| `/plantings/new?bed=<id>` | Add a planting |
| `/plantings/<id>/edit` | Edit, end, or delete a planting |
| `/plants` | Plant library: each flower, variety, and color recorded, with seasons and verdicts |

Home and Sign in are public. Every other page requires sign-in; a signed-out visitor is redirected
to Sign in and returned to the page afterward.

## Sign-in

One deployment has one gardener account. Passwords are stored as bcrypt hashes. Signing in sets an
HTTP-only cookie holding a random token; the `sessions` table stores only its SHA-256 hash.
Sessions last 30 days. `proxy.ts` redirects requests without the cookie, and each page and server
action checks the token against the database.

## Health check

`GET /api/health` returns `200` with `{"status":"ok"}` while the application is running and the
migrated database opens, and `503` otherwise.

## Tech stack

TypeScript, Next.js 16 (App Router), React 19, Tailwind CSS 4, and SQLite (better-sqlite3) on
Node.js 22. Passwords use bcryptjs. Tests use Vitest, React Testing Library, and Playwright. In production the
application runs under systemd behind nginx on AWS EC2.

## License

MIT. See [LICENSE](LICENSE).
