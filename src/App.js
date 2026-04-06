function App() {
  return (
    <div style={{ padding: "40px", fontFamily: "Arial", maxWidth: "600px", margin: "0 auto" }}>
      <h1>✍️ GhostwriterMe</h1>
      <p>Your AI writing assistant is coming soon!</p>
      <textarea
        rows="5"
        style={{ width: "100%", padding: "10px", fontSize: "16px" }}
        placeholder="Type what you want to write about..."
      />
      <br /><br />
      <button style={{ padding: "10px 20px", fontSize: "16px", backgroundColor: "#000", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
        Generate ✨
      </button>
    </div>
  );
}

export default App;