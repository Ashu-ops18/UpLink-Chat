import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import Logo from "../assets/uplink_lightlogo.png";
import SplayTree from "../utils/SplayTree"; // Custom Splay Tree engine for routing

export default function Contacts({
  contacts,
  changeChat,
  incomingMessageSender,
}) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);

  // Persist the tree instance across React re-renders
  const treeRef = useRef(new SplayTree());

  // Decoupled UI state to manage the visual LRU (Least Recently Used) list sorting
  const [uiContacts, setUiContacts] = useState([]);

  useEffect(() => {
    const fetchUserNameAndImage = async () => {
      const storedData = localStorage.getItem("chat-app-current-user");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setCurrentUserName(parsedData.username);
        setCurrentUserImage(parsedData.avatarImage);
      }
    };
    fetchUserNameAndImage();
  }, []);

  useEffect(() => {
    if (contacts.length > 0) {
      // Re-initialize tree if the base contacts list changes completely
      treeRef.current = new SplayTree();

      contacts.forEach((contact) => {
        treeRef.current.insert(contact);
      });

      // Set the initial visual list order
      setUiContacts([...contacts]);
    }
  }, [contacts]);

  // WebSocket listener bridge
  useEffect(() => {
    if (incomingMessageSender && treeRef.current) {
      // Active chat optimization: pull the sender to the root of the tree
      // to speed up routing for subsequent messages.
      treeRef.current.access(incomingMessageSender);

      // Visually bump the sender to the top of the sidebar list
      setUiContacts((prevContacts) => {
        const activeContact = prevContacts.find(
          (c) => c._id === incomingMessageSender,
        );

        if (!activeContact) return prevContacts;

        const filtered = prevContacts.filter(
          (c) => c._id !== incomingMessageSender,
        );

        return [activeContact, ...filtered];
      });
    }
  }, [incomingMessageSender]);

  const changeCurrentChat = (contact) => {
    setCurrentSelected(contact._id);
    changeChat(contact);

    // Keep the data layer synced: splay the clicked user to the root
    treeRef.current.access(contact._id);

    // Slide the clicked user to the top of the visual list
    setUiContacts((prevContacts) => {
      const filtered = prevContacts.filter((c) => c._id !== contact._id);
      return [contact, ...filtered];
    });
  };

  return (
    <>
      {currentUserName && (
        <Container>
          <div className="brand">
            <img src={Logo} alt="uplink logo" />
            <h3>UpLink</h3>
          </div>
          <div className="contacts">
            {uiContacts.map((contact) => {
              return (
                <div
                  key={contact._id}
                  className={`contact ${
                    contact._id === currentSelected ? "selected" : ""
                  }`}
                  onClick={() => changeCurrentChat(contact)}
                >
                  <div className="avatar">
                    <div className="initials-avatar">
                      {contact.username
                        ? contact.username.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                  </div>
                  <div className="username">
                    <h3>{contact.username}</h3>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="current-user">
            <div className="avatar">
              <div className="initials-avatar">
                {currentUserName
                  ? currentUserName.charAt(0).toUpperCase()
                  : "?"}
              </div>
            </div>
            <div className="username">
              <h2>{currentUserName}</h2>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 75% 15%;
  overflow: hidden;
  background-color: #f8fafc;
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
    img {
      height: 3.5rem;
    }
    h3 {
      color: #1e293b;
      font-weight: bold;
      font-size: 1.3rem;
    }
  }
  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    gap: 0.8rem;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .contact {
      background-color: transparent;
      border-bottom: 1px solid #e2e8f0;
      min-height: 5rem;
      cursor: pointer;
      width: 90%;
      border-radius: 0.2rem;
      padding: 0.4rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: 0.2s ease-in-out;
      .avatar {
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
      }
      .username {
        h3 {
          color: #1e293b;
        }
      }
    }
    .selected {
      background-color: #eff6ff;
      border-left: 4px solid #2563eb;
    }
  }

  .current-user {
    background-color: #ffffff;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    .avatar {
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
    }
    .username {
      h2 {
        color: #1e293b;
      }
    }
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.5rem;
      .username {
        h2 {
          font-size: 1rem;
        }
      }
    }
  }
`;
