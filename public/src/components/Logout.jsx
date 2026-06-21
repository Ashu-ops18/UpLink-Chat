import React from "react";
import { useNavigate } from "react-router-dom";
import { BiPowerOff } from "react-icons/bi";
import styled from "styled-components";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";

export default function Logout() {
  const navigate = useNavigate();

  const handleClick = async () => {
    // Parse synchronous local storage (No await needed here)
    const id = JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY),
    )._id;

    // Hit the backend to clear this user from the global Socket Map.
    // If we don't do this, the server keeps trying to route messages to a dead connection.
    const data = await axios.get(`${logoutRoute}/${id}`);

    if (data.status === 200) {
      // Standard client-side cleanup
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <Button onClick={handleClick}>
      <BiPowerOff />
    </Button>
  );
}

const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: #f1f5f9; /* Very light grey background */
  border: 1px solid #e2e8f0; /* Subtle border */
  cursor: pointer;
  transition: 0.2s ease-in-out;

  svg {
    font-size: 1.3rem;
    color: #64748b; /* Medium slate icon */
    transition: 0.2s ease-in-out;
  }

  &:hover {
    background-color: #fee2e2; /* Faint red background on hover */
    border-color: #fca5a5;

    svg {
      color: #dc2626; /* Bright red icon on hover to warn the user */
    }
  }
`;
