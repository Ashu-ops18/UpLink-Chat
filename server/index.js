const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const app = express();
const socket = require("socket.io");
require("dotenv").config();

const allowedOrigins = [
  "http://localhost:3000",
  "https://up-link-chat.vercel.app", // Add your actual Vercel URL here
];

// ARCHITECTURE: Open CORS gateway for the Vercel production frontend
app.use(
  cors({
    origin: allowedOrigins, 
    credentials: true,
  }),
);

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log(err.message);
  });

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ARCHITECTURE: Dynamic port binding for Render cloud deployment
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server started on ${PORT}`));

const io = socket(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// SYSTEM DESIGN: Global Map used as a high-speed O(1) caching layer
// to instantly map MongoDB ObjectIDs to active Socket Session IDs.
global.onlineUsers = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      // ✅ BUG FIXED: Spelled correctly and passing the sender's ID (data.from)
      // so the frontend Splay Tree can establish Temporal Locality routing.
      socket.to(sendUserSocket).emit("msg-receive", {
        message: data.msg,
        senderId: data.from, // Ensure your frontend emit passes 'from' in the payload!
      });
    }
  });

  socket.on("typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("typing");
    }
  });

  socket.on("stop-typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("stop-typing");
    }
  });
});
