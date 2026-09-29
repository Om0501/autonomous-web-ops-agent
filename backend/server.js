require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

// Fixture "target sites" — stand-ins for the real competitor/partner/own
// domains this would monitor in production (see README for the swap-over).
app.use("/fixtures", express.static(path.join(__dirname, "..", "fixtures")));

app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/plans", require("./routes/plans"));
app.use("/api/runs", require("./routes/runs"));
app.use("/api/extract", require("./routes/extract"));
app.use("/api/compare", require("./routes/compare"));
app.use("/api/complete", require("./routes/complete"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/dashboard", require("./routes/dashboard"));

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Web Ops Agent backend listening on :${PORT}`));
