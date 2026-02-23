import request from "supertest";
import { app, activities, Activity } from "../src/app";

// Store initial state of activities for reset
const initialActivities: Record<string, Activity> = Object.fromEntries(
  Object.entries(activities).map(([name, activity]) => [
    name,
    { ...activity, participants: [...activity.participants] },
  ])
);

// Reset activities before each test
beforeEach(() => {
  for (const name of Object.keys(activities)) {
    activities[name].participants = [
      ...initialActivities[name].participants,
    ];
  }
});

describe("Root Endpoint", () => {
  describe("GET /", () => {
    it("redirects to /static/index.html", async () => {
      const response = await request(app).get("/").redirects(0);
      expect(response.status).toBe(302);
      expect(response.headers["location"]).toBe("/static/index.html");
    });
  });
});

describe("Get Activities", () => {
  describe("GET /activities", () => {
    it("returns all activities as an object", async () => {
      const expectedActivityCount = 9;
      const response = await request(app).get("/activities");

      expect(response.status).toBe(200);
      expect(typeof response.body).toBe("object");
      expect(Array.isArray(response.body)).toBe(false);
      expect(Object.keys(response.body).length).toBe(expectedActivityCount);
    });

    it("each activity has required fields", async () => {
      const requiredFields = new Set([
        "description",
        "schedule",
        "max_participants",
        "participants",
      ]);
      const response = await request(app).get("/activities");
      const firstActivity = Object.values(response.body)[0] as Activity;

      expect(response.status).toBe(200);
      expect(new Set(Object.keys(firstActivity))).toEqual(requiredFields);
    });

    it("participants is a list of emails", async () => {
      const expectedEmailFormat = "@mergington.edu";
      const response = await request(app).get("/activities");

      expect(response.status).toBe(200);
      for (const activity of Object.values(response.body) as Activity[]) {
        expect(Array.isArray(activity.participants)).toBe(true);
        for (const participant of activity.participants) {
          expect(typeof participant).toBe("string");
          expect(participant).toContain(expectedEmailFormat);
        }
      }
    });
  });
});

describe("Signup For Activity", () => {
  describe("POST /activities/:activity_name/signup", () => {
    it("successful signup adds participant", async () => {
      const activityName = "Chess Club";
      const email = "newstudent@mergington.edu";

      const response = await request(app)
        .post(`/activities/${activityName}/signup?email=${email}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Signed up");

      // Verify participant was added
      const activitiesResponse = await request(app).get("/activities");
      expect(activitiesResponse.body[activityName].participants).toContain(
        email
      );
    });

    it("prevents duplicate registration", async () => {
      const activityName = "Chess Club";
      const existingEmail = "michael@mergington.edu"; // Already signed up

      const response = await request(app)
        .post(`/activities/${activityName}/signup?email=${existingEmail}`);

      expect(response.status).toBe(400);
      expect(response.body.detail).toContain("already signed up");
    });

    it("fails for nonexistent activity", async () => {
      const activityName = "Nonexistent Activity";
      const email = "student@mergington.edu";

      const response = await request(app)
        .post(`/activities/${activityName}/signup?email=${email}`);

      expect(response.status).toBe(404);
      expect(response.body.detail).toContain("not found");
    });

    it("decreases available spots after signup", async () => {
      const activityName = "Basketball Team";
      const email = "newplayer@mergington.edu";

      // Get initial available spots
      const initialResponse = await request(app).get("/activities");
      const initialSpots =
        initialResponse.body[activityName].max_participants -
        initialResponse.body[activityName].participants.length;

      // Sign up
      await request(app).post(
        `/activities/${activityName}/signup?email=${email}`
      );

      // Get new available spots
      const finalResponse = await request(app).get("/activities");
      const finalSpots =
        finalResponse.body[activityName].max_participants -
        finalResponse.body[activityName].participants.length;

      expect(finalSpots).toBe(initialSpots - 1);
    });
  });
});

describe("Remove Participant", () => {
  describe("DELETE /activities/:activity_name/participants", () => {
    it("successful removal deletes participant", async () => {
      const activityName = "Chess Club";
      const email = "michael@mergington.edu"; // Already signed up

      const response = await request(app)
        .delete(`/activities/${activityName}/participants?email=${email}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Removed");

      // Verify participant was removed
      const activitiesResponse = await request(app).get("/activities");
      expect(activitiesResponse.body[activityName].participants).not.toContain(
        email
      );
    });

    it("fails for nonexistent participant", async () => {
      const activityName = "Chess Club";
      const email = "notregistered@mergington.edu";

      const response = await request(app)
        .delete(`/activities/${activityName}/participants?email=${email}`);

      expect(response.status).toBe(400);
      expect(response.body.detail).toContain("not signed up");
    });

    it("fails for nonexistent activity", async () => {
      const activityName = "Nonexistent Activity";
      const email = "student@mergington.edu";

      const response = await request(app)
        .delete(`/activities/${activityName}/participants?email=${email}`);

      expect(response.status).toBe(404);
      expect(response.body.detail).toContain("not found");
    });

    it("increases available spots after removal", async () => {
      const activityName = "Chess Club";
      const email = "michael@mergington.edu";

      // Get initial available spots
      const initialResponse = await request(app).get("/activities");
      const initialSpots =
        initialResponse.body[activityName].max_participants -
        initialResponse.body[activityName].participants.length;

      // Remove participant
      await request(app).delete(
        `/activities/${activityName}/participants?email=${email}`
      );

      // Get new available spots
      const finalResponse = await request(app).get("/activities");
      const finalSpots =
        finalResponse.body[activityName].max_participants -
        finalResponse.body[activityName].participants.length;

      expect(finalSpots).toBe(initialSpots + 1);
    });
  });
});

describe("Email Validation", () => {
  it("accepts valid email format", async () => {
    const activityName = "Chess Club";
    const email = "valid.student@mergington.edu";

    const response = await request(app)
      .post(`/activities/${activityName}/signup?email=${email}`);

    expect(response.status).toBe(200);
  });

  it("accepts different email formats", async () => {
    const activityName = "Chess Club";
    const emails = [
      "student1@mergington.edu",
      "student.name@mergington.edu",
      "student+tag@mergington.edu",
    ];

    for (const email of emails) {
      const response = await request(app)
        .post(`/activities/${activityName}/signup?email=${email}`);
      expect(response.status).toBe(200);
    }
  });
});

describe("Activity Name Handling", () => {
  it("signup with exact activity name succeeds", async () => {
    const activityName = "Chess Club";
    const email = "player@mergington.edu";

    const response = await request(app)
      .post(`/activities/${activityName}/signup?email=${email}`);

    expect(response.status).toBe(200);
  });

  it("signup fails with incorrect case", async () => {
    const activityName = "chess club"; // Lowercase
    const email = "player@mergington.edu";

    const response = await request(app)
      .post(`/activities/${activityName}/signup?email=${email}`);

    expect(response.status).toBe(404);
  });
});

describe("Empty and Boundary Conditions", () => {
  it("at least one activity has participants", async () => {
    const response = await request(app).get("/activities");
    const activitiesData = response.body as Record<string, Activity>;

    const hasParticipants = Object.values(activitiesData).some(
      (activity) => activity.participants.length > 0
    );
    expect(hasParticipants).toBe(true);
  });

  it("remove all participants one by one", async () => {
    const activityName = "Chess Club";

    // Get all current participants
    const initialResponse = await request(app).get("/activities");
    const participants: string[] = [
      ...initialResponse.body[activityName].participants,
    ];

    // Remove each one
    for (const email of participants) {
      const response = await request(app).delete(
        `/activities/${activityName}/participants?email=${email}`
      );
      expect(response.status).toBe(200);
    }

    // Activity should have no participants
    const finalResponse = await request(app).get("/activities");
    expect(
      finalResponse.body[activityName].participants.length
    ).toBe(0);
  });

  it("signup and removal sequence works correctly", async () => {
    const activityName = "Drama Club";
    const email = "actor@mergington.edu";

    // Sign up
    const signupResponse = await request(app)
      .post(`/activities/${activityName}/signup?email=${email}`);
    expect(signupResponse.status).toBe(200);

    // Verify participant is in list
    const verifyResponse = await request(app).get("/activities");
    expect(verifyResponse.body[activityName].participants).toContain(email);

    // Remove participant
    const removalResponse = await request(app).delete(
      `/activities/${activityName}/participants?email=${email}`
    );
    expect(removalResponse.status).toBe(200);

    // Participant should be gone
    const finalResponse = await request(app).get("/activities");
    expect(finalResponse.body[activityName].participants).not.toContain(email);
  });
});
