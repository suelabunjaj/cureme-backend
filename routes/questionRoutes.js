const express = require("express");
const router = express.Router();
const {
  askQuestion,
  getHistory,
  askGuestQuestion
} = require("../controllers/questionController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, askQuestion);
router.post("/guest", askGuestQuestion);
router.get("/history", authMiddleware, getHistory);

module.exports = router;