/**
 * High School Management System API
 *
 * A super simple Express application that allows students to view and sign up
 * for extracurricular activities at Mergington High School.
 */

import express, { Request, Response } from "express";
import path from "path";

export const app = express();

app.use(express.json());

// Serve static files from the static directory
const staticDir = path.join(__dirname, "static");
app.use("/static", express.static(staticDir));

// In-memory activity database
export interface Activity {
  description: string;
  schedule: string;
  max_participants: number;
  participants: string[];
}

export const activities: Record<string, Activity> = {
  "Chess Club": {
    description: "Learn strategies and compete in chess tournaments",
    schedule: "Fridays, 3:30 PM - 5:00 PM",
    max_participants: 12,
    participants: ["michael@mergington.edu", "daniel@mergington.edu"],
  },
  "Programming Class": {
    description: "Learn programming fundamentals and build software projects",
    schedule: "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
    max_participants: 20,
    participants: ["emma@mergington.edu", "sophia@mergington.edu"],
  },
  "Gym Class": {
    description: "Physical education and sports activities",
    schedule: "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
    max_participants: 30,
    participants: ["john@mergington.edu", "olivia@mergington.edu"],
  },
  "Basketball Team": {
    description: "Competitive basketball league and practice",
    schedule: "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
    max_participants: 15,
    participants: ["alex@mergington.edu"],
  },
  "Tennis Club": {
    description: "Learn tennis skills and participate in tournaments",
    schedule: "Mondays and Wednesdays, 3:30 PM - 4:30 PM",
    max_participants: 10,
    participants: ["lucas@mergington.edu", "grace@mergington.edu"],
  },
  "Drama Club": {
    description: "Act in plays and develop theatrical performance skills",
    schedule: "Wednesdays, 3:30 PM - 5:00 PM",
    max_participants: 20,
    participants: ["mia@mergington.edu"],
  },
  "Art Studio": {
    description: "Explore painting, drawing, and sculpture techniques",
    schedule: "Thursdays, 3:30 PM - 5:00 PM",
    max_participants: 18,
    participants: ["noah@mergington.edu", "ava@mergington.edu"],
  },
  "Debate Team": {
    description: "Develop public speaking and argumentation skills",
    schedule: "Mondays, 4:00 PM - 5:30 PM",
    max_participants: 16,
    participants: ["liam@mergington.edu"],
  },
  "Science Club": {
    description: "Conduct experiments and explore STEM topics",
    schedule: "Fridays, 3:30 PM - 4:30 PM",
    max_participants: 25,
    participants: ["zoe@mergington.edu", "ethan@mergington.edu"],
  },
};

app.get("/", (_req: Request, res: Response) => {
  res.redirect("/static/index.html");
});

app.get("/activities", (_req: Request, res: Response) => {
  res.json(activities);
});

app.post(
  "/activities/:activity_name/signup",
  (req: Request, res: Response) => {
    /** Sign up a student for an activity */
    const { activity_name } = req.params;
    const email = req.query.email as string;

    // Validate activity exists
    if (!(activity_name in activities)) {
      res.status(404).json({ detail: "Activity not found" });
      return;
    }

    const activity = activities[activity_name];

    // Validate student is not already signed up
    if (activity.participants.includes(email)) {
      res.status(400).json({ detail: "Student already signed up" });
      return;
    }

    // Add student
    activity.participants.push(email);
    res.json({ message: `Signed up ${email} for ${activity_name}` });
  }
);

app.delete(
  "/activities/:activity_name/participants",
  (req: Request, res: Response) => {
    /** Remove a student from an activity */
    const { activity_name } = req.params;
    const email = req.query.email as string;

    // Validate activity exists
    if (!(activity_name in activities)) {
      res.status(404).json({ detail: "Activity not found" });
      return;
    }

    const activity = activities[activity_name];

    // Validate student is signed up
    if (!activity.participants.includes(email)) {
      res
        .status(400)
        .json({ detail: "Student is not signed up for this activity" });
      return;
    }

    // Remove student
    activity.participants = activity.participants.filter((p) => p !== email);
    res.json({ message: `Removed ${email} from ${activity_name}` });
  }
);

// Start server only when running directly (not when imported for tests)
if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
