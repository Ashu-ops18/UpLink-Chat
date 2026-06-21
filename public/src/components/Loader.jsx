import React from "react";
import styled from "styled-components";

export default function Loader() {
  return (
    <Container>
      <div className="spinner"></div>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;

  .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #e2e8f0; /* Light grey background track */
    border-top-color: #2563eb; /* Cobalt blue spinning accent */
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
