// Dev-adapter-only lead capture: in-memory, ephemeral (lost on serverless restart),
// capped at 100 entries. NOT a production PII store — do not use this for
// real buyer data, and do not re-add a GET readback route here.
const capturedLeads = [];

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const lead = req.body;
    capturedLeads.unshift(lead);
    if (capturedLeads.length > 100) capturedLeads.pop();
    return res.status(200).json({ status: 'success', count: capturedLeads.length });
  }

  res.setHeader('Allow', 'POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
