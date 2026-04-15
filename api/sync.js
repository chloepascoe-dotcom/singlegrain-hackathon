const GIST_ID = '19d903906578b50b617f18e2e7e840d9';
const FILENAME = 'hackathon-data.json';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: 'No token configured' });

    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };

    try {
        if (req.method === 'GET') {
            const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
            const gist = await response.json();
            const content = gist.files?.[FILENAME]?.content || '{}';
            return res.status(200).json({ data: JSON.parse(content), timestamp: Date.now() });
        }

        if (req.method === 'POST') {
            const data = req.body;
            await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    files: { [FILENAME]: { content: JSON.stringify(data, null, 2) } }
                })
            });
            return res.status(200).json({ success: true, timestamp: Date.now() });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
