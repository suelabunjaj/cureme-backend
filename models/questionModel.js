const db = require("../db");

const createQuestion = async (userId, questionText, aiResponse) => {
  const questionResult = await db.query(
    `
    INSERT INTO questions (user_id, question_text, status)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, question_text, status, created_at
    `,
    [userId, questionText, "answered"]
  );

  const savedQuestion = questionResult.rows[0];

  await db.query(
    `
    INSERT INTO answers (question_id, answer_text, source)
    VALUES ($1, $2, $3)
    `,
    [savedQuestion.id, aiResponse, "openai"]
  );

  return {
    ...savedQuestion,
    ai_response: aiResponse,
  };
};

const getQuestionsByUser = async (userId) => {
  const result = await db.query(
    `
    SELECT 
      q.id,
      q.question_text,
      q.status,
      q.created_at,
      a.answer_text AS ai_response
    FROM questions q
    LEFT JOIN answers a ON q.id = a.question_id
    WHERE q.user_id = $1
    ORDER BY q.created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

module.exports = {
  createQuestion,
  getQuestionsByUser,
};