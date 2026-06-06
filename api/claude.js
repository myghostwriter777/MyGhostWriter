export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  // CORS — required for mobile browsers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server config error: ANTHROPIC_API_KEY environment variable is not set on Vercel."
    });
  }

  // Parse body safely
  let body = req.body;
  if (!body) {
    return res.status(400).json({ error: "Request body is empty" });
  }
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch(e) {
      return res.status(400).json({ error: "Could not parse request body as JSON" });
    }
  }

  // Call Anthropic
  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch(e) {
    return res.status(500).json({ error: "Failed to reach Anthropic: " + e.message });
  }

  let data;
  try {
    data = await response.json();
  } catch(e) {
    return res.status(500).json({ error: "Bad response from Anthropic" });
  }

  return res.status(response.status).json(data);
}
