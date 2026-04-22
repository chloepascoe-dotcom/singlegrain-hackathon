const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { project, person, isOpenSlot } = req.body;

        const headerText = isOpenSlot ? "💡 New Project Proposal" : "🚀 Hackathon Sign-Up";
        const projectLabel = isOpenSlot ? "*Proposed Project:*" : "*Project:*";

        const message = {
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: headerText,
                        emoji: true
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `${projectLabel}\n${project}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Who:*\n${person}`
                        }
                    ]
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `<https://singlegrain-hackathon.vercel.app|View Hackathon Tracker>`
                        }
                    ]
                }
            ]
        };

        const response = await fetch(SLACK_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });

        if (response.ok) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(500).json({ error: 'Failed to send to Slack' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
