# VigilNet - Mobile Field Intelligence for Supply Chain Compliance

VigilNet is a mobile-first compliance platform designed to bring transparency and ethical sourcing to the point of inspection. Auditors and customs officers can scan paperwork, run entity resolution, visualize relationship paths to sanctioned targets in real-time, and translate worker testimonies on-site.

---

## 🚀 Key Features

* **Mobile Document Scanning**: Instantly capture Bills of Lading, invoices, and shipping documents using the device camera (integrated via Expo Camera).
* **Gemini AI Document Parsing**: Extracts structured JSON metadata (Supplier Name, Signatory, cargo, registration number) from document scans.
* **Neo4j AuraDB Path Tracing**: Queries our global graph database to discover if a supplier is linked to a sanctioned entity through multi-hop ownership or trading relationships.
* **Sarvam AI Voice Translation**: Records on-site worker interviews, transcribes them, and translates them to English to act as secure compliance verification.

---

## 🛠️ Monorepo Structure

```
vigilnet/
├── backend/                   # NestJS API gateway
├── expo-client/               # React Native Expo mobile application
├── database/                  # Schema definition scripts
│   ├── neo4j-schema.cypher    # Cypher constraints and indices
│   └── postgres-init.sql      # PostgreSQL relational schema
└── README.md                  # Project documentation
```

---

## ⚙️ Local Setup and Configuration

### 1. Database Configuration

* **Neo4j AuraDB**:
  * Set up a free graph database instance at [Neo4j Aura](https://neo4j.com/product/auradb/).
  * Apply the Cypher constraints located in `database/neo4j-schema.cypher`.
* **PostgreSQL**:
  * Run a local PostgreSQL instance or host it on Render.
  * Initialize the tables by running the queries in `database/postgres-init.sql`.

### 2. Backend Environment Variables (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```env
PORT=3000

# Databases
NEO4J_URI=neo4j+s://<YOUR_AURA_DB_ID>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<YOUR_AURA_DB_PASSWORD>

DATABASE_URL=postgresql://<USER>:<PASS>@<HOST>:<PORT>/vigilnet

# AI Credentials
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
SARVAM_API_KEY=<YOUR_SARVAM_API_KEY>
```

### 3. Running the Backend Server

```bash
cd backend
npm install
npm run build
npm run start
```
The server will boot on `http://localhost:3000`.

### 4. Running the Expo Mobile Client

```bash
cd expo-client
npm install
npx expo start
```
* Press `a` to run on Android emulator or `i` to run on iOS simulator.
* To test on a physical device, scan the QR code using the **Expo Go** app.
* *Note: Go to the settings screen in the mobile app to set the server IP (e.g. `http://192.168.1.50:3000`) so it can connect to your local NestJS backend.*

---

## 💰 Sponsor Credit Redemption

* **Render Credits**: Claim $50 USD in Render credits via [GitHub portal](https://credits-portal-mmdm.onrender.com/claim/hackhazards).
* **Sarvam AI Credits**: Claim 1,000 free credits per team from the [NAMESPACE Hackathon Dashboard](https://www.namespace.world/hackathon-dashboard/29fe1a24-ef95-4a24-bba2-388b4b2cc89f).
