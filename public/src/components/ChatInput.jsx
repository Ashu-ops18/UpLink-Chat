import React, { useState, useRef } from "react";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import styled from "styled-components";
import Picker from "emoji-picker-react";

export default function ChatInput({
  handleSendMsg,
  socket,
  currentChat,
  currentUser,
}) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Track the timeout instance so we can clear it dynamically
  const typingTimeoutRef = useRef(null);

  // Network Optimization: Local ref to throttle socket emits.
  // Prevents spamming the server with 'typing' events on every single keystroke.
  const isTypingLocalRef = useRef(false);

  const handleEmojiPickerhideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (event, emojiObject) => {
    let message = msg;
    message += emojiObject.emoji;
    setMsg(message);
  };

  const sendChat = (event) => {
    event.preventDefault();
    if (msg.length > 0) {
      handleSendMsg(msg);
      setMsg("");

      // Immediately terminate the typing state upon sending the message
      isTypingLocalRef.current = false;
      socket.current.emit("stop-typing", {
        to: currentChat._id,
        from: currentUser._id,
      });
    }
  };

  const handleChange = (e) => {
    setMsg(e.target.value);

    // Throttle: Only ping the server if we aren't already actively marked as typing
    if (!isTypingLocalRef.current) {
      isTypingLocalRef.current = true;
      socket.current.emit("typing", {
        to: currentChat._id,
        from: currentUser._id,
      });
    }

    // Reset the debounce timer if the user continues typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Debounce the stop-typing event. A 3-second grace period prevents
    // the UI indicator from flickering if the user pauses briefly to think.
    typingTimeoutRef.current = setTimeout(() => {
      isTypingLocalRef.current = false;

      socket.current.emit("stop-typing", {
        to: currentChat._id,
        from: currentUser._id,
      });
    }, 3000);
  };

  return (
    <Container>
      <div className="button-container">
        <div className="emoji">
          <BsEmojiSmileFill onClick={handleEmojiPickerhideShow} />
          {showEmojiPicker && (
            <Picker theme="light" onEmojiClick={handleEmojiClick} />
          )}
        </div>
      </div>
      <form className="input-container" onSubmit={(event) => sendChat(event)}>
        <input
          type="text"
          placeholder="type your message here"
          onChange={handleChange}
          value={msg}
        />
        <button type="submit">
          <IoMdSend />
        </button>
      </form>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: 5% 95%;
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0; /* Divider above the input */
  padding: 0 2rem;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0 1rem;
    gap: 1rem;
  }
  .button-container {
    display: flex;
    align-items: center;
    color: white;
    gap: 1rem;
    .emoji {
      position: relative;
      svg {
        font-size: 1.5rem;
        color: #94a3b8; /* Muted slate grey so it shows clearly on white */
        cursor: pointer;
        transition: 0.2s ease-in-out;
        &:hover {
          color: #2563eb; /* Turns Cobalt Blue when hovered */
        }
      }
      .emoji-picker-react {
        position: absolute;
        top: -350px;
        background-color: #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border-color: #2563eb;
        .emoji-scroll-wrapper::-webkit-scrollbar {
          background-color: #ffffff;
          width: 5px;
          &-thumb {
            background-color: #2563eb;
          }
        }
        .emoji-categories {
          button {
            filter: contrast(0);
          }
        }
        .emoji-search {
          background-color: transparent;
          border-color: #2563eb;
          color: #1e293b;
        }
        .emoji-group:before {
          background-color: #ffffff;
          color: #1e293b;
        }
      }
    }
  }
  .input-container {
    width: 100%;
    border-radius: 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    background-color: #f8fafc; /* Slightly offset the input box */
    border: 1px solid #e2e8f0;
    border-radius: 2rem;

    input {
      width: 90%;
      height: 60%;
      background-color: transparent;
      color: #1e293b; /* Dark slate typing text */
      &::placeholder {
        color: #94a3b8; /* Muted grey for placeholder */
      }
      border: none;
      padding-left: 1rem;
      font-size: 1.2rem;
      &::selection {
        background-color: #9a86f3;
      }
      &:focus {
        outline: none;
      }
    }
    button {
      padding: 0.3rem 2rem;
      border-radius: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #2563eb; /* Cobalt Blue Accent */
      border: none;
      @media screen and (min-width: 720px) and (max-width: 1080px) {
        padding: 0.3rem 1rem;
        svg {
          font-size: 1rem;
        }
      }
      svg {
        font-size: 2rem;
        color: white;
      }
    }
  }
`;
