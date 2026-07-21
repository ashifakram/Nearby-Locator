import React from 'react';
/**
 * Dashboard view – re‑exports the existing chat App component.
 * The original App component contains the smart chat interface.
 */
import ChatApp from '../App'; // default export is the chat UI
export default function Dashboard() {
  return <ChatApp />;
}
