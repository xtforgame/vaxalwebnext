const demos = [
  { name: "Drop Scanner", file: "drop_scanner (2).html" },
  { name: "Drop Materialize Animus", file: "drop_materialize_animus (1).html" },
  { name: "Scanner", file: "scanner (4).html" },
  { name: "Scanner White", file: "scanner-white (1).html" },
  { name: "Scanner Step 3", file: "scanner_step3 (1).html" },
  { name: "Scanner White Animus", file: "scanner-white-animus (1).html" },
  { name: "Chatbot Builder", file: "chatbot_builder (1).html" },
  { name: "Chatbot Automation", file: "chatbot_automation (1).html" },
  { name: "Governance", file: "governance (4).html" },
];

export default function DemoPage() {
  return (
    <section style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem", textAlign: "center" }}>
        Demos
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 600px)",
          gap: "2rem",
          justifyContent: "center",
        }}
      >
        {demos.map((demo) => (
          <div key={demo.file} style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{demo.name}</h2>
            <iframe
              src={`/demo/${encodeURIComponent(demo.file)}`}
              width={600}
              height={600}
              style={{ border: "1px solid #333", borderRadius: 8, background: "#000" }}
              title={demo.name}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
