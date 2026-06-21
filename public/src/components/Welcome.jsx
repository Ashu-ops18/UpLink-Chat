import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Robot from "../assets/robot.gif";

export default function Welcome() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Read synchronously from local storage on mount.
    // Added a safety check in case the storage key is missing or corrupted.
    const storedData = localStorage.getItem(
      process.env.REACT_APP_LOCALHOST_KEY,
    );
    if (storedData) {
      setUserName(JSON.parse(storedData).username);
    }
  }, []);

  return (
    <Container>
      <img src={Robot} alt="Welcome Robot" />
      <h1>
        Welcome, <span>{userName}!</span>
      </h1>
      <h3>Please select a chat to start messaging.</h3>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
  color: #1e293b; /* Dark slate text */
  flex-direction: column;
  img {
    height: 20rem;
  }
  span {
    /* Highlight their name in Cobalt Blue */
    color: #2563eb;
  }
`;
