require("dotenv").config();
const app = require("../app");
const request = require("supertest");
const { sequelize, HealthCheck } = require("../models");

beforeAll(async () => {
  // Set up a test database if needed, or use an in-memory database like SQLite
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // Close the database connection after tests
  await sequelize.close();
});

describe("/healthz endpoint", () => {
  beforeAll(async () => {
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.info.mockRestore();
    console.error.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 OK when health check succeeds", async () => {
    // Insert a health check record directly into the database
    await HealthCheck.create({ status: "OK" });

    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
  });

  it("should return 503 when database insert fails", async () => {
    // Simulate a database failure by causing an error on create
    jest.spyOn(HealthCheck, 'create').mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/healthz");
    expect(res.status).toBe(503);
  });

  it("should return 405 for disallowed methods (POST)", async () => {
    const res = await request(app).post("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 405 for disallowed methods (PUT)", async () => {
    const res = await request(app).put("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 405 for disallowed methods (PATCH)", async () => {
    const res = await request(app).patch("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 405 for disallowed methods (DELETE)", async () => {
    const res = await request(app).delete("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 400 if GET /healthz is called with a payload", async () => {
    const res = await request(app)
      .get("/healthz")
      .send({ unexpected: "data" });
    expect(res.status).toBe(400);
  });

  it("should return 400 if GET /healthz is called with query parameters", async () => {
    const res = await request(app)
      .get("/healthz?unexpected=data");
    expect(res.status).toBe(400);
  });

  it("should return 400 if GET /healthz is called with a broken body", async () => {
    const res = await request(app)
      .get("/healthz")
      .set("Content-Type", "application/json")
      .send("{ broken_json: true"); // Malformed JSON
    expect(res.status).toBe(400);
  });
});
