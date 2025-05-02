# totalwarhammer-tournament-app
An app used for organizing tournaments for the Total War Warhammer games.

# Backend
The backend uses NodeJS with Express and MongoDB. I recommend using Mongo Atlas for the database to avoid having to set up a local MongoDB instance. You can run the backend locally with NPM, but you will need to set up a `.env` file to connect to the MongoDB database. There is an example provided. 

# Frontend
The frontend uses Vite + React + TypeScript. You can self host it, or use a free application like Render, Railway or VErcel.

# Authentication
The app uses an OAuth2 style authentication system. While this isn't exactly OAuth2, it does use similar principles. PKCE is also implemented at a rudimentary level.
