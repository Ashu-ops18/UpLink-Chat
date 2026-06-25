import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [incomingMessageSender, setIncomingMessageSender] = useState(null);

  useEffect(() => {
    const checkUser = () => {
      const localData = localStorage.getItem(
        process.env.REACT_APP_LOCALHOST_KEY,
      );
      if (!localData) {
        navigate("/login");
      } else {
        // Read synchronously from local storage
        setCurrentUser(JSON.parse(localData));
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      socket.current = io(host, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });
      socket.current.emit("add-user", currentUser._id);

      // Listen for incoming messages at the top level so we can
      // capture the sender's ID and pass it down to the Contacts sidebar
      socket.current.on("msg-receive", (data) => {
        const senderId = data.from || data.senderId || data.sender;
        setIncomingMessageSender(senderId);
      });

      // Memory Management: Explicitly disconnect the socket when the component unmounts
      // to prevent zombie connections from draining server resources.
      return () => {
        if (socket.current) {
          socket.current.disconnect();
        }
      };
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchContacts = async () => {
      if (currentUser) {
        const data = await axios.get(`${allUsersRoute}/${currentUser._id}`);
        setContacts(data.data);
      }
    };
    fetchContacts();
  }, [currentUser]);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  return (
    <>
      <Container>
        <div className="container">
          {/* Pass the incoming message sender ID down to trigger the Splay Tree routing */}
          <Contacts
            contacts={contacts}
            changeChat={handleChatChange}
            incomingMessageSender={incomingMessageSender}
          />
          {currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer currentChat={currentChat} socket={socket} />
          )}
        </div>
      </Container>
    </>
  );
}

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: #f8fafc; /* Light gray background */
  color: #1e293b; /* Primary Text */
  .container {
    height: 85vh;
    width: 85vw;
    background-color: #f8fafc;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0; /* Light grey border */
    display: grid;
    grid-template-columns: 25% 75%;

    @media screen and (max-width: 768px) {
      grid-template-columns: 35% 65%; 
      width: 100vw; /* Takes up the whole phone screen */
      height: 100vh;
    }
  }
`;
