# Folder Structure Architecture � NinaivuNet AI

NinaivuNet AI uses a clean Separation of Concerns (SoC) layout.

```text
ninaivunet-meeting/
+-- backend/                  # Mongo Gateway API Server (Port 4000)
�   +-- config/               # database connections
�   +-- controllers/          # authentications, projects control rules
�   +-- middleware/           # auth protect, errorMiddleware
�   +-- models/               # MongoDB models
�   +-- repositories/         # mongoRepository operations mapping
�   +-- routes/               # Express auth / projects router paths
�   +-- services/             # authService, projectService, translation
�   +-- validators/           # Zod parameter check schemas
�   +-- server.js             # API Express application launcher
�
+-- src/                      # Root Signaling & Meeting Server (Port 3000)
�   +-- config/               # config.js, databaseSetup.js
�   +-- controllers/          # meetingController
�   +-- middlewares/          # errorMiddleware, localization
�   +-- repositories/         # sqliteRepository
�   +-- routes/               # meetingRoutes
�   +-- services/             # meetingService, redisCache
�   +-- utils/                # logger, geminiHelper
�   +-- validators/           # request validator schemas
�   +-- workers/              # taskQueue background workers
�
+-- frontend/                 # Client SPA Vite (Port 5173)
�   +-- src/                  # App components, layout pages
�   �   +-- i18n.js           # zero-dependency local translation config
�   �   +-- main.jsx          # client bootstrapper
�   +-- package.json
�
+-- db.js                     # Backwards-compatible proxy to sqliteRepository.js
+-- server.js                 # Unified Meeting server launcher (Port 3000)
+-- package.json              # Main Node project configurations
```
