const Messages = require("../models/messageModel");
const messageCache = require("../utils/messageCache");

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to, cursor } = req.body;

    // Generate a consistent cache key for this specific conversation (e.g., 'userA-userB')
    const cacheKey = [from, to].sort().join("-");

    // Check the in-memory cache first for the initial load so the UI feels instant.
    // We bypass this if the user is scrolling up (using a cursor).
    if (!cursor) {
      const cachedMessages = messageCache.get(cacheKey);
      if (cachedMessages) {
        return res.json(cachedMessages);
      }
    }

    // Using cursor pagination (by _id) instead of skip/limit to avoid
    // heavy collection scans as the database grows.
    let query = { users: { $all: [from, to] } };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    // Sort by _id (which is auto-indexed) for faster, stable pagination
    const messages = await Messages.find(query).sort({ _id: -1 }).limit(50);

    // Reverse the array so messages render bottom-to-top in the UI
    messages.reverse();

    const projectedMessages = messages.map((msg) => {
      return {
        id: msg._id, // Expose the ID to serve as the cursor for the frontend's next fetch
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
      };
    });

    // Only cache the first page. No need to bloat server memory with older messages.
    if (!cursor) {
      messageCache.set(cacheKey, projectedMessages);
    }

    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;

    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    // Invalidate the cache for this conversation so the next fetch pulls the fresh data
    const cacheKey = [from, to].sort().join("-");
    messageCache.invalidate(cacheKey);

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};
