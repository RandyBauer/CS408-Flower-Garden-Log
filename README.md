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

Open <http://localhost:3000>.

`start.sh` checks for Node.js 22, installs dependencies, creates `.env` with a random session
secret, builds the application, and starts it on port 3000. It is safe to run again. Set `PORT` to
use another port: `PORT=3001 ./start.sh`.

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

3. Open `http://<public-ip>/`.

## Scripts

| File | Runs on | Purpose |
| --- | --- | --- |
| `start.sh` | Any Linux machine | Installs dependencies, builds, and starts the application on port 3000. |
| `deploy/setup-ec2.sh` | Server, once, with sudo | Updates Ubuntu, adds a 2 GB swap file, installs Node.js 22, nginx, rsync, and sqlite3, creates `/opt/gardenlog` and its `.env`, installs the nginx site and systemd service, and allows ports 22 and 80 in `ufw`. |
| `deploy/gardenlog.service` | Server | systemd unit. Runs `npm start` in `/opt/gardenlog`, starts on boot, and restarts after a crash. |
| `deploy/nginx-gardenlog.conf` | Server | Forwards port 80 to port 3000 and allows 10 MB uploads. |
| `deploy/deploy.sh` | Laptop | Runs the unit tests, copies the code to `/opt/gardenlog`, installs dependencies, builds, restarts the service, and checks `/api/health`. Copies with rsync, or with tar over ssh where rsync is not installed. |

The server keeps `.env`, `data/`, and `uploads/` in `/opt/gardenlog` between deploys.

## Health check

`GET /api/health` returns `200` with `{"status":"ok"}` while the application is running.

## Tech stack

TypeScript, Next.js 16 (App Router), React 19, and Tailwind CSS 4 on Node.js 22. In production the
application runs under systemd behind nginx on AWS EC2.

## License

MIT. See [LICENSE](LICENSE).
