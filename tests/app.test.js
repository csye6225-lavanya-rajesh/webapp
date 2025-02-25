require("dotenv").config();
const app = require("../app");
const request = require("supertest");

// Mock the sequelize and HealthCheck model correctly
jest.mock("../models", () => {
  const mockHealthCheck = {
    create: jest.fn(),
  };

  return {
    sequelize: {
      sync: jest.fn().mockResolvedValue(),
    },
    Sequelize: { DataTypes: {} },
    HealthCheck: mockHealthCheck,
  };
});

describe("/healthz endpoint", () => {
  beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 OK when health check succeeds", async () => {
    const { HealthCheck } = require("../models"); // Import HealthCheck here
    HealthCheck.create.mockResolvedValueOnce({});

    const res = await request(app).get("/healthz");
    expect(res.status).toBe(300);
    expect(HealthCheck.create).toHaveBeenCalledTimes(1);
  });

  it("should return 503 when database insert fails", async () => {
    const { HealthCheck } = require("../models"); // Import HealthCheck here
    HealthCheck.create.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/healthz");
    expect(res.status).toBe(503);
    expect(HealthCheck.create).toHaveBeenCalledTimes(1);
  });

  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).post("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).put("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).patch("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).delete("/healthz");
    expect(res.status).toBe(405);
  });
  
   // GET request with a payload should return 400 Bad Request
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