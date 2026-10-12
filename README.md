# 🧹 ADHDo — "Tinder for Cleaning"
> **Virtual body-doubling and accountability web app tailored for people with ADHD.**

Users upload photos of rooms/spaces they need to clean, swipe through cleaning challenges, match on mutual likes, and motivate each other with a synchronized body-doubling sprint timer and live 1-on-1 chat.

---

## 🌐 Live Production Deployment

- **Application URL:** [https://adhdo.167-86-68-161.sslip.io](https://adhdo.167-86-68-161.sslip.io)
- **Interactive API Documentation:** [https://adhdo.167-86-68-161.sslip.io/docs](https://adhdo.167-86-68-161.sslip.io/docs)
- **Health Check:** [https://adhdo.167-86-68-161.sslip.io/health](https://adhdo.167-86-68-161.sslip.io/health)

---

## 🏗️ Architecture & Server Isolation

The application runs in completely isolated Docker containers on the Contabo VPS alongside existing workloads (e.g. `ai-backoffice`):

| Component | Existing App (`ai-backoffice`) | ADHDo (`adhdo`) |
| :--- | :--- | :--- |
| **Directory** | `/root/app` | `/root/adhdo` |
| **Database** | `app-postgres-1` (port 5432/5433) | `adhdo-postgres` (isolated network) |
| **Backend** | `app-backend-1` (port 8000) | `adhdo-backend` (internal port 8010) |
| **Frontend** | `app-frontend-1` (port 3000) | `adhdo-frontend` (internal port 3010) |
| **SSL / Domain** | `https://167-86-68-161.sslip.io` | `https://adhdo.167-86-68-161.sslip.io` |

---

## 🚀 GitHub Actions CI/CD Automation

Automated pipeline configured in [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

### Enabling Automated Deployments:
In GitHub, navigate to **Settings > Secrets and variables > Actions** in the `DomcaStarek/ADHDo` repository and add:
- **`SSH_PRIVATE_KEY`**: The content of your `~/.ssh/id_ed25519` private key.
- **`SERVER_HOST`**: `167.86.68.161` *(Optional, defaults to this host)*.
- **`SERVER_USER`**: `root` *(Optional, defaults to root)*.

Every `git push origin main` will:
1. Run backend tests (`pytest`).
2. Verify frontend compilation (`npm run build`).
3. Deploy updates zero-downtime to the server via `/root/adhdo/scripts/deploy.sh`.

---

## 📱 Quick Demo Testing

- **Email:** `test@adhdo.app`
- **Password:** `Password123!`
- Or click **"Quick Demo Login"** on the login screen.
- Swiping right on Maya's *"Studio Glitter Bomb"* triggers an immediate **Mutual Match & Confetti Celebration**!
