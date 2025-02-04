const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const XLSX = require("xlsx");
const jwt = require("jsonwebtoken");


const PORT = process.env.PORT || 5000;
const app = express();

// Allow requests from your frontend's domain
const corsOptions = {
  origin: 'https://aarambh2k25.vercel.app', // Corrected URL (no trailing slash)
  methods: 'GET, POST, PUT, DELETE',
  allowedHeaders: 'Content-Type, Authorization',
};

app.use(cors(corsOptions)); // Keep this CORS configuration
// Middlewares

app.use(bodyParser.json());
// Secret key for JWT
const JWT_SECRET = "your-jwt-secret-key";  // Change this key for more security


// SQLite Database File
const DB_PATH = path.join(__dirname, "db2.sqlite");

// Connect to SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("✅ Connected to SQLite database");

    // Create the registrations table if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        branch TEXT,
        phone TEXT,
        performance_type TEXT,
        other_performance TEXT,
        solo_or_group TEXT,
        group_size INTEGER,
        group_member_names_and_branch TEXT,
        any_additional_comments_or_requirements TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) {
          console.error("Error creating table:", err);
        } else {
          console.log("✅ Table 'registrations' is ready.");
        }
      }
    );
  }
});

              
 

app.post("/api/forms/submit", (req, res) => {
  const { fullName, email, branch, phone, performanceType, otherPerformance, soloOrGroup, groupSize, groupMembers, additionalComments } = req.body;

  console.log("Received form data:", req.body); // Log the form data received by the server

  // Ensure that all required fields are present
  if (!fullName || !email || !branch || !phone) {
    return res.status(400).json({ success: false, error: "Please fill in all required fields." });
  }

  // Insert form data into the database
  db.run(
    `INSERT INTO registrations (full_name, email, branch, phone, performance_type, other_performance, solo_or_group, group_size, group_member_names_and_branch,any_additional_comments_or_requirements) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [fullName, email, branch, phone, performanceType, otherPerformance, soloOrGroup, groupSize, groupMembers, additionalComments],
    function (err) {
      if (err) {
        console.error("Error inserting into database:", err); // Log any database error
        return res.status(500).json({ success: false, error: "Failed to save the form data." });
      }
      console.log("Form data saved successfully!"); // Log success if the data is saved to the database
      res.json({ success: true, message: "Form submitted successfully!" });
    }
  );
});

// 📌 **Admin Login Route** (for generating JWT token)


app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  // Check if username and password match
  if (username === "admin" && password === "password123") {
    // Generate a JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
  } else {
    res.json({ success: false, error: "Invalid credentials" });
  }
});

// 📌 JWT Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers["authorization"];
  
  if (!token) {
    return res.status(403).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], JWT_SECRET); // Use the same secret key here
    req.admin = decoded; // Add the admin details to the request
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// 📥 **Download Data as Excel** (Admin Only)
app.get('/api/forms/download', authenticateAdmin, (req, res) => {
  // Query all form submissions from the database
  db.all("SELECT * FROM registrations", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve data" });
    }

    // Convert the rows to an Excel sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");

    // Set response headers for file download
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=registrations.xlsx");

    // Write the Excel file and send it directly as a buffer
    res.send(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }));
  });
});
app.get("/api/forms/data", authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM registrations", (err, rows) => {
    if (err) {
      console.error("Error fetching submitted data:", err);
      return res.status(500).json({ success: false, error: "Failed to retrieve data" });
    }
    res.json({ success: true, data: rows });
  });
});
// 🚀 **Start Server**
const server = app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
