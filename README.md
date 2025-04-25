# totalwarhammer-tournament-app
An app used for organizing tournaments for the Total War Warhammer games.

# Backend
The backend uses NodeJS with Express and MongoDB. I recommend using Mongo Atlas for the database to avoid having to set up a local MongoDB instance. You can run the backend locally with NPM, but you will need to set up a `.env` file to connect to the MongoDB database. There is an example provided. I tried hosting it using Render.com and found it slow but useful for testing.

# Frontend
The frontend uses Vite + React + TypeScript. It is hosted on Vercel, but you can also host it locally if you prefer.

# Authentication
The app uses JWT for authentication. You can use the `/auth` endpoints to register and login. The JWT is stored in local storage and used to authenticate requests to the backend. The JWT is set to expire after 1 hour, but you can change this in the backend code.