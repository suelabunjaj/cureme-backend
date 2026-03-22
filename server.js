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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});