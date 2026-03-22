const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  askQuestion,
  getHistory,
  askGuestQuestion,
} = require("../controllers/questionController");

router.post("/", authMiddleware, askQuestion);
router.get("/history", authMiddleware, getHistory);
router.post("/guest", askGuestQuestion);

module.exports = router;