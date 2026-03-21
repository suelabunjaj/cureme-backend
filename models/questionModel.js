const db = require("../db");

const createQuestion = async (userId, questionText, aiResponse) => {
  const result = await db.query(
    `INSERT INTO questions (user_id, question_text, ai_response)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, questionText, aiResponse]
  );
  return result.rows[0];
};

const getQuestionsByUser = async (userId) => {
  const result = await db.query(
    `SELECT * FROM questions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

module.exports = {
  createQuestion,
  getQuestionsByUser,
};