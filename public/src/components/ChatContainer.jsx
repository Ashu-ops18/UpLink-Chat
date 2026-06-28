import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import Loader from "./Loader";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, receiveMessageRoute } from "../utils/APIRoutes";

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Refs to manage scroll state and prevent duplicate fetches without re-rendering the component
  const isFetchingRef = useRef(false);
  const isInitialMount = useRef(true);
  const blockScrollRef = useRef(true);
  const scrollRef = useRef();
  const chatBoxRef = useRef();

  const [isTyping, setIsTyping] = useState(false);
  const [currentUser] = useState(() =>
    JSON.parse(localStorage.getItem("chat-app-current-user")),
  );

  // Fetch the initial page of messages when the chat is selected
  useEffect(() => {
    const fetchInitialMessages = async () => {
      setIsLoading(true);
      isFetchingRef.current = true;
      blockScrollRef.current = true; // Lock scroll listener during initial load

      const response = await axios.post(receiveMessageRoute, {
        from: currentUser._id,
        to: currentChat._id,
      });
      setMessages(response.data);

      setHasMore(response.data.length === 50);
      isFetchingRef.current = false;
      setIsLoading(false);

      // Give the DOM a moment to paint before re-enabling scroll pagination
      setTimeout(() => {
        blockScrollRef.current = false;
      }, 500);
    };

    if (currentChat && currentUser) fetchInitialMessages();
  }, [currentChat, currentUser]);

  // Setup and teardown for real-time socket events
  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-receive", (msg) => {
        const actualText = msg.message ? msg.message : msg;
        setMessages((prev) => [
          ...prev,
          { fromSelf: false, message: actualText },
        ]);
      });

      socket.current.on("typing", () => setIsTyping(true));
      socket.current.on("stop-typing", () => setIsTyping(false));

      return () => {
        socket.current.off("msg-receive");
        socket.current.off("typing");
        socket.current.off("stop-typing");
      };
    }
  }, [socket]);

  // Handle auto-scrolling behaviors synchronously before the browser paints
  useLayoutEffect(() => {
    if (!isFetchingRef.current && !isLoading && chatBoxRef.current) {
      if (isInitialMount.current) {
        // Snap to the bottom immediately on first load
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        isInitialMount.current = false;
      } else {
        // Smooth scroll for new incoming/outgoing messages
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, isTyping, isLoading]);

  // Paginate older messages when the user scrolls near the top
  const handleScroll = async (e) => {
    if (blockScrollRef.current) return;
    if (e.target.scrollHeight <= e.target.clientHeight) return;

    // Threshold of 10px from the top to trigger fetch
    if (
      e.target.scrollTop <= 10 &&
      hasMore &&
      messages.length > 0 &&
      !isFetchingRef.current
    ) {
      isFetchingRef.current = true;

      // Save current scroll height so we can adjust position after new elements render
      const previousScrollHeight = e.target.scrollHeight;
      const oldestMessageId = messages[0].id;

      const response = await axios.post(receiveMessageRoute, {
        from: currentUser._id,
        to: currentChat._id,
        cursor: oldestMessageId,
      });

      if (response.data.length > 0) {
        const olderMessages = [...response.data].reverse();

        setMessages((prev) => {
          const combined = [...olderMessages, ...prev];
          // Ensure no duplicate messages sneak in from race conditions
          return Array.from(
            new Map(combined.map((msg) => [msg.id, msg])).values(),
          );
        });

        // Wait for render, then offset the scroll position to prevent UI jumping
        setTimeout(() => {
          const newScrollHeight = e.target.scrollHeight;
          e.target.scrollTop = newScrollHeight - previousScrollHeight;
        }, 50);
      }

      if (response.data.length < 50) {
        setHasMore(false); // Reached the end of chat history
      }

      // Debounce the next fetch
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 500);
    }
  };

  // Optimistically render the message while syncing with backend/socket
  const handleSendMsg = async (msg) => {
    await axios.post(sendMessageRoute, {
      from: currentUser._id,
      to: currentChat._id,
      message: msg,
    });

    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: currentUser._id,
      msg,
    });

    const msgs = [...messages];
    msgs.push({ fromSelf: true, message: msg });
    setMessages(msgs);
  };

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <div className="initials-avatar">
              {currentChat?.username
                ? currentChat.username.charAt(0).toUpperCase()
                : "?"}
            </div>
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
          </div>
        </div>
        <Logout />
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="chat-messages" ref={chatBoxRef} onScroll={handleScroll}>
          {messages.map((message) => {
            return (
              <div key={message.id || uuidv4()}>
                <div
                  className={`message ${
                    message.fromSelf ? "sended" : "received"
                  }`}
                >
                  <div className="content">
                    <p>{message.message}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="message received typing-indicator">
              <div className="content">
                <p>Typing...</p>
              </div>
            </div>
          )}

          {/* Anchor div used for auto-scrolling to the bottom */}
          <div ref={scrollRef}></div>
        </div>
      )}

      <ChatInput
        handleSendMsg={handleSendMsg}
        socket={socket}
        currentChat={currentChat}
        currentUser={currentUser}
      />
    </Container>
  );
}

const Container = styled.div`
  background-color: #ffffff;
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    border-bottom: 1px solid #e2e8f0;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .initials-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #dbeafe;
        color: #1e3a8a;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 1.2rem;
        font-weight: bold;
      }
      .username {
        h3 {
          color: #1e293b;
        }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #1e293b;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: #2563eb;
        color: white;
      }
    }
    .received {
      justify-content: flex-start;
      .content {
        background-color: #f1f5f9;
        color: #1e293b;
        border: 1px solid #e2e8f0;
      }
    }
    .typing-indicator {
      .content {
        padding: 0.5rem 1rem;
        font-style: italic;
        opacity: 0.7;
      }
    }
  }
`;
