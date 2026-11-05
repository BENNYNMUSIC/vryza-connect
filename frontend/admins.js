const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ================= MODELS =================
const User = require("../models/user");

// ================= MIDDLEWARE =================
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/adminmiddleware");

// Helper function to extract user ID safely
const getUserId = (user) => {
  if (!user) return null;
  return (user._id || user.id || user).toString();
};

// ============================================================
// GET ALL USERS
// GET /api/admin/users
// ============================================================
router.get("/users", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select("_id username email profilePic role bannedUntil createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();

    const formattedUsers = users.map((user) => {
      const isBanned =
        user.bannedUntil &&
        new Date(user.bannedUntil).getTime() > now.getTime();

      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        role: user.role,
        bannedUntil: user.bannedUntil,
        isBanned: Boolean(isBanned),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    });

    return res.json({
      success: true,
      users: formattedUsers,
      count: formattedUsers.length
    });

  } catch (err) {
    console.error("❌ ADMIN FETCH USERS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server processing error"
    });
  }
});

// ============================================================
// BAN USER
// POST /api/admin/ban-user
// ============================================================
router.post("/ban-user", auth, isAdmin, async (req, res) => {
  try {
    const { userId, durationMinutes } = req.body;
    const currentUserId = getUserId(req.user);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format provided."
      });
    }

    if (String(userId) === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot ban your own administrator account."
      });
    }

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target account profile not found."
      });
    }

    if (targetUser.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Action forbidden: You cannot ban accounts with administrative permissions."
      });
    }

    const minutes = Number(durationMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isInteger(minutes)) {
      return res.status(400).json({
        success: false,
        message: "Please specify a valid whole number of minutes greater than 0."
      });
    }

    const bannedUntil = new Date(Date.now() + minutes * 60 * 1000);
    targetUser.bannedUntil = bannedUntil;

    await targetUser.save();

    return res.json({
      success: true,
      message: `${targetUser.username} has been banned for ${minutes} minute(s).`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        bannedUntil: targetUser.bannedUntil,
        isBanned: true
      }
    });

  } catch (err) {
    console.error("❌ ADMIN BAN ACCOUNT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server processing error"
    });
  }
});

// ============================================================
// UNBAN USER
// POST /api/admin/unban-user
// ============================================================
router.post("/unban-user", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format provided."
      });
    }

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target account profile not found."
      });
    }

    const stillBanned =
      targetUser.bannedUntil &&
      new Date(targetUser.bannedUntil).getTime() > Date.now();

    if (!stillBanned) {
      return res.status(400).json({
        success: false,
        message: `${targetUser.username} is not currently banned.`
      });
    }

    targetUser.bannedUntil = null;
    await targetUser.save();

    return res.json({
      success: true,
      message: `${targetUser.username}'s ban has been lifted.`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        bannedUntil: null,
        isBanned: false
      }
    });

  } catch (err) {
    console.error("❌ ADMIN UNBAN ACCOUNT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server processing error"
    });
  }
});

// ============================================================
// MAKE USER ADMIN
// POST /api/admin/make-admin
// ============================================================
router.post("/make-admin", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = getUserId(req.user);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user ID format."
      });
    }

    if (String(userId) === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Your account is already an administrator."
      });
    }

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target profile account not found."
      });
    }

    if (targetUser.role === "admin") {
      return res.status(400).json({
        success: false,
        message: `${targetUser.username} is already an administrator.`
      });
    }

    targetUser.role = "admin";
    await targetUser.save();

    return res.json({
      success: true,
      message: `${targetUser.username} is now an administrator.`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role
      }
    });

  } catch (err) {
    console.error("❌ ADMIN PROMOTION ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server processing error"
    });
  }
});

module.exports = router;