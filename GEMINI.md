# SKY REALM | SKY BOT S2 Dashboard

A comprehensive full-stack Discord bot and web dashboard for the SKY REALM community. This project provides tools for message scheduling, embed creation, Minecraft whitelist management, and server monitoring.

## Project Overview

*   **Architecture:** Express.js backend serving both a REST API and a vanilla JavaScript frontend dashboard. The bot component uses `discord.js` (v14) for Discord interactions and slash commands.
*   **Main Technologies:**
    *   **Backend:** Node.js, Express
    *   **Bot:** discord.js v14
    *   **Database:** MongoDB with Mongoose ODM
    *   **Authentication:** Discord OAuth2 with `express-session` and `connect-mongo` for persistent storage.
    *   **Frontend:** Vanilla JS, HTML, CSS (SaaS-style layout with clean URL routing).
*   **Key Features:**
    *   **Message Scheduler:** Cron-based and one-time message scheduling with mention support.
    *   **Hybrid Message Builder:** Tool for creating embeds and custom components.
    *   **Minecraft Integration:** Whitelist application management and server status monitoring.
    *   **Access Control:** Robust role-based access control (RBAC) (Owner, Admin, Moderator, Viewer) mapped to Discord roles and permissions.

## Building and Running

### Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB instance (local or Atlas)
*   Discord Application (with Bot and OAuth2 configured)

### Commands
*   **Install Dependencies:** `npm install`
*   **Run Development Mode:** `npm run dev` (uses `nodemon`)
*   **Run Production Mode:** `npm start`
*   **Test:** (TODO: Add testing framework and commands)

### Environment Setup
Create a `.env` file based on `.env.example`:
*   `DISCORD_TOKEN`: Bot token from Discord Developer Portal.
*   `CLIENT_ID` / `CLIENT_SECRET`: OAuth2 credentials.
*   `REDIRECT_URI`: OAuth2 callback URL (e.g., `http://localhost:3000/auth/callback`).
*   `MONGO_URI`: MongoDB connection string.
*   `SESSION_SECRET`: Secret string for session signing.

## Development Conventions

*   **Project Structure:**
    *   `bot/`: Contains Discord bot logic, event handlers, and slash command definitions.
    *   `controllers/`: Request handlers for API routes.
    *   `dashboard/`: Frontend assets (HTML, CSS, JS).
    *   `middlewares/`: Express middlewares for auth, RBAC, and error handling.
    *   `models/`: Mongoose schemas for data persistence.
    *   `routes/`: Express router definitions for API and Auth.
    *   `services/`: Business logic and core services (scheduler, whitelist, etc.).
*   **Naming:** CamelCase for variables and functions; PascalCase for Mongoose models and Services.
*   **Error Handling:** Centralized error handling via `middlewares/errorHandler.js`. Use `utils/logger.js` for logging.
*   **Access Control:** Use `middlewares/accessControl.js` to protect API routes based on user capabilities.
*   **Slash Commands:** Modular command registration in `bot/commands/`.
