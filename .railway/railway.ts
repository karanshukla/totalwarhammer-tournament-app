import { database, defineRailway, github, image, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const RedisSessionStatsDB = database("Redis Session + Stats DB", "redis", {
    image: "railwayapp/redis:7.2.5",
    defaultMountPath: "/bitnami",
    region: "europe-west4-drams3a",
  });
  RedisSessionStatsDB.deploy = { limitOverride: { containers: { memoryBytes: 4000000000 } } };
  const MongoDB = database("MongoDB", "mongo", {
    image: "mongo:7",
    defaultMountPath: "/data/db",
    region: "europe-west4-drams3a",
  });
  MongoDB.deploy = { sleepApplication: true, limitOverride: { containers: { cpu: 2, memoryBytes: 4000000000 } }, startCommand: "docker-entrypoint.sh mongod --ipv6 --bind_ip ::,0.0.0.0 --setParameter diagnosticDataCollectionEnabled=false" };
  // mongo-express admin UI. Kept as a database node so the resource is not
  // recreated; only the image is corrected (the importer assumed mongo:8).
  const MongoDBAdmin = database("Mongo DB Admin", "mongo", {
    image: "mongo-express",
    region: "europe-west4-drams3a",
  });
  MongoDBAdmin.deploy = { sleepApplication: true };
  const jellyfishVolume = volume("jellyfish-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "europe-west4-drams3a", sizeMB: 5000 });
  const sailVolume = volume("sail-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "europe-west4-drams3a", sizeMB: 5000 });
  const CaddyProxy = service("Caddy Proxy", {
    source: github("karanshukla/totalwarhammer-tournament-app", { checkSuites: true, rootDirectory: "/caddy" }),
    build: { builder: "RAILPACK", watchPatterns: ["/caddy/**"] },
    replicas: { "europe-west4-drams3a": 1 },
    domains: ["twtournament.app"],
    networking: { privateNetworkEndpoint: "caddy-proxy" },
    env: {
      BACKEND_DOMAIN: preserve(),
      BACKEND_PORT: preserve(),
      FRONTEND_DOMAIN: preserve(),
      FRONTEND_PORT: preserve(),
    },
  });
  const TWTAppClient = service("TWT App Client", {
    source: github("karanshukla/totalwarhammer-tournament-app", { checkSuites: true, rootDirectory: "client-app" }),
    build: { builder: "RAILPACK", buildCommand: "npm run build", watchPatterns: ["client-app/*"] },
    replicas: { "europe-west4-drams3a": 1 },
    deploy: {
      startCommand: "npm run start",
      healthcheckPath: "/",
      healthcheckTimeout: 100,
      limitOverride: { containers: { cpu: 1, memoryBytes: 4000000000 } },
    },
    networking: { privateNetworkEndpoint: "twtournament-client" },
    env: {
      VITE_API_URL: preserve(),
    },
  });
  const AxiomLoggingSidecar = service("Axiom Logging Sidecar", {
    source: image("ghcr.io/brody192/locomotive:latest"),
    replicas: { "europe-west4-drams3a": 1 },
    networking: { privateNetworkEndpoint: "locomotive" },
    env: {
      LOCOMOTIVE_ADDITIONAL_HEADERS: preserve(),
      LOCOMOTIVE_ENABLE_DEPLOY_LOGS: preserve(),
      LOCOMOTIVE_ENABLE_HTTP_LOGS: preserve(),
      LOCOMOTIVE_ENVIRONMENT_ID: preserve(),
      LOCOMOTIVE_RAILWAY_API_KEY: preserve(),
      LOCOMOTIVE_REPORT_STATUS_EVERY: preserve(),
      LOCOMOTIVE_SERVICE_IDS: preserve(),
      LOCOMOTIVE_WEBHOOK_MODE: preserve(),
      LOCOMOTIVE_WEBHOOK_URL: preserve(),
    },
  });
  const TWTAppServer = service("TWT App Server", {
    source: github("karanshukla/totalwarhammer-tournament-app", { checkSuites: true, rootDirectory: "/server-app" }),
    build: { builder: "RAILPACK", watchPatterns: ["server-app/*"] },
    replicas: { "europe-west4-drams3a": 1 },
    deploy: {
      startCommand: "npm run start",
      healthcheckPath: "/health",
      healthcheckTimeout: 100,
      // server-app/railway.toml also set restartPolicyType ON_FAILURE / maxRetries 10,
      // which is Railway's default. Railway stores the default as null, so declaring
      // it here leaves a permanent no-op diff in every plan. Omitted deliberately.
      sleepApplication: true,
      limitOverride: { containers: { cpu: 2, memoryBytes: 4000000000 } },
    },
    networking: { privateNetworkEndpoint: "twtournament-server" },
    env: {
      AXIOM_DATASET: preserve(),
      AXIOM_TOKEN: preserve(),
      CLIENT_URL: preserve(),
      CSRF_SECRET: preserve(),
      MONGO_URI: preserve(),
      REDIS_URL: preserve(),
      RESEND_API_KEY: preserve(),
      SESSION_SECRET: preserve(),
      USE_MONGO_SESSION: preserve(),
    },
  });

  return project("TW Tournament App", {
    resources: [CaddyProxy, TWTAppClient, AxiomLoggingSidecar, TWTAppServer, RedisSessionStatsDB, MongoDB, MongoDBAdmin, jellyfishVolume, sailVolume],
  });
});
