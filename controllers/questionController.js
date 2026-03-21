const { createQuestion, getQuestionsByUser } = require("../models/questionModel");
const { getAIResponse } = require("../utils/aiService");

const askQuestion = async (req, res) => {
  try {
    const { question_text } = req.body;
    const userId = req.user.id;

    if (!question_text) {
      return res.status(400).json({ message: "Question text is required" });
    }

    const aiResponse = await getAIResponse(question_text);
    const savedQuestion = await createQuestion(userId, question_text, aiResponse);

    res.status(201).json({
      message: "Question submitted successfully",
      data: savedQuestion,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await getQuestionsByUser(userId);

    res.json({
      message: "Question history retrieved successfully",
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
const askGuestQuestion = async (req, res) => {
  try {
    const { question_text } = req.body;

    if (!question_text) {
      return res.status(400).json({ message: "Question text is required" });
    }

    const aiResponse = await getAIResponse(question_text);

    res.status(200).json({
      message: "Guest question answered successfully",
      data: {
        question_text,
        ai_response: aiResponse
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

module.exports = {
  askQuestion,
  getHistory,
  askGuestQuestion,
};