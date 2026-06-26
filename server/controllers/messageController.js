const Messages = require("../models/messageModel");
const messageCache = require("../utils/messageCache");

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to, cursor } = req.body;

    // Sort IDs to guarantee the exact same cache key regardless of who sent the message
    const cacheKey = [from, to].sort().join("-");

    // Hit the cache for the initial load to keep the UI snappy.
    // Ignore the cache if we're paginating deep into the history.
    if (!cursor) {
      const cachedMessages = messageCache.get(cacheKey);
      if (cachedMessages) {
        return res.json(cachedMessages);
      }
    }

    // Cursor-based pagination. skip/limit gets way too slow on massive collections,
    // so we use the indexed _id to fetch older messages.
    let query = { users: { $all: [from, to] } };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    // Grab the newest 50 messages. Sorting by _id is basically free since it's an index.
    const messages = await Messages.find(query).sort({ _id: -1 }).limit(50);

    // Flip the array so the UI renders them chronologically (oldest at top, newest at bottom)
    messages.reverse();

    const projectedMessages = messages.map((msg) => {
      return {
        id: msg._id, // Pass the ID back so the frontend can use it as the cursor for the next fetch
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
      };
    });

    // Only cache page 1. No point in eating up RAM for deep message history.
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

    // Bust the cache for this chat thread so the next initial load gets the new message
    const cacheKey = [from, to].sort().join("-");
    messageCache.invalidate(cacheKey);

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};
