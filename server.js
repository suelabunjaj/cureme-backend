
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.json({ message: "cureME backend is running" });
});

app.post("/ask", async (req, res) => {
  try {
    const { user_id, question } = req.body;

    if (!user_id || !question) {
      return res.status(400).json({
        error: "user_id and question are required",
      });
    }

    const questionResult = await pool.query(
      `
      INSERT INTO questions (user_id, question_text, status)
      VALUES ($1, $2, $3)
      RETURNING id, question_text, created_at
      `,
      [user_id, question, "pending"]
    );

    const questionRow = questionResult.rows[0];
    const questionId = questionRow.id;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful health assistant for general wellness information only. Do not diagnose. Recommend seeing a doctor for severe or emergency symptoms.",
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    const aiAnswer =
      completion.choices?.[0]?.message?.content ||
      "I'm sorry, I could not generate an answer.";

    const answerResult = await pool.query(
      `
      INSERT INTO answers (question_id, answer_text, source)
      VALUES ($1, $2, $3)
      RETURNING id, answer_text, created_at
      `,
      [questionId, aiAnswer, "openai"]
    );

    await pool.query(
      `
      UPDATE questions
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      ["answered", questionId]
    );

    res.status(200).json({
      success: true,
      question: questionRow,
      answer: answerResult.rows[0],
    });
  } catch (error) {
    console.error("Error in /ask:", error);
    res.status(500).json({
      error: "Something went wrong while processing the question.",
    });
  }
});

app.get("/questions", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.id AS question_id,
        q.question_text,
        q.status,
        q.created_at AS question_created_at,
        a.id AS answer_id,
        a.answer_text,
        a.source,
        a.created_at AS answer_created_at
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      ORDER BY q.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error in /questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
      `,
      [name, email, hashedPassword]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("Error in /register:", error);
    res.status(500).json({
      message: "Registration failed",
    });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `
      SELECT id, name, email, password_hash
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in /login:", error);
    res.status(500).json({
      message: "Login failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});