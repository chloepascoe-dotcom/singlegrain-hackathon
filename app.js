// Single Grain Hackathon - Real-time sync with tabs
(function() {
    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            localStorage.setItem('sg-hackathon-tab', tabId);
        });
    });

    // Restore last tab
    const savedTab = localStorage.getItem('sg-hackathon-tab');
    if (savedTab) {
        const btn = document.querySelector(`[data-tab="${savedTab}"]`);
        if (btn) btn.click();
    }
    const STORAGE_KEY = 'sg-hackathon-data';
    const API_URL = '/api/sync';
    const SLACK_API = '/api/slack';
    const saveStatus = document.getElementById('saveStatus');
    let saveTimeout, lastData = '{}';
    let previousSignups = {};

    // Map field names to readable project names
    const projectNames = {
        'seo-tigerclaw-lead': 'Tiger Claw (SEO Brain) - Lead',
        'seo-project-1': 'AI Content Brief Generator',
        'seo-project-2': 'Technical SEO Audit Workflow',
        'seo-project-3': 'Competitor Gap Analyzer',
        'paid-creative-claw-lead': 'Paid/Creative Claw (Brain) - Lead',
        'paid-project-1': 'AI Media Mix Planner',
        'paid-project-2': 'Audience Research Accelerator',
        'paid-project-3': 'AI Competitor Ad Intelligence',
        'creative-project-1': 'AI Ad Storyboard Generator',
        'creative-project-2': 'Landing Page Copy & Wireframe Generator',
        'creative-project-3': 'UGC Script & Brief Generator',
        'crossteam-project-1': 'AI Sales Pitch Generator',
        'crossteam-project-2': 'QBR Prep Assistant',
        'crossteam-project-3': 'Open Slot Project'
    };

    async function notifySlack(project, person) {
        try {
            await fetch(SLACK_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project, person })
            });
        } catch (e) {
            console.log('Slack notification failed:', e);
        }
    }

    function checkForNewSignups(oldData, newData) {
        Object.keys(projectNames).forEach(field => {
            const oldValue = (oldData[field] || '').trim();
            const newValue = (newData[field] || '').trim();

            if (newValue && newValue !== oldValue) {
                // Find what was added
                const oldNames = oldValue.split(',').map(n => n.trim()).filter(n => n);
                const newNames = newValue.split(',').map(n => n.trim()).filter(n => n);

                newNames.forEach(name => {
                    if (!oldNames.includes(name)) {
                        notifySlack(projectNames[field], name);
                    }
                });
            }
        });
    }

    async function loadData() {
        try {
            const res = await fetch(API_URL);
            if (res.ok) {
                const { data } = await res.json();
                if (data && Object.keys(data).length > 0) {
                    applyData(data);
                    lastData = JSON.stringify(data);
                    localStorage.setItem(STORAGE_KEY, lastData);
                    showStatus('synced');
                    return;
                }
            }
        } catch (e) {}
        // Fallback to localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { applyData(JSON.parse(saved)); lastData = saved; }
    }

    function applyData(data) {
        document.querySelectorAll('input[data-field]').forEach(input => {
            const key = input.getAttribute('data-field');
            if (data[key] !== undefined && document.activeElement !== input) {
                input.type === 'checkbox' ? input.checked = data[key] : input.value = data[key];
            }
        });
        document.querySelectorAll('[contenteditable="true"][data-field]').forEach(el => {
            const key = el.getAttribute('data-field');
            if (data[key] !== undefined && document.activeElement !== el) el.textContent = data[key];
        });
    }

    function collectData() {
        const data = {};
        document.querySelectorAll('input[data-field]').forEach(input => {
            data[input.getAttribute('data-field')] = input.type === 'checkbox' ? input.checked : input.value;
        });
        document.querySelectorAll('[contenteditable="true"][data-field]').forEach(el => {
            data[el.getAttribute('data-field')] = el.textContent;
        });
        return data;
    }

    async function saveData() {
        const data = collectData();
        const dataStr = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY, dataStr);

        // Check for new sign-ups and notify Slack
        const oldData = JSON.parse(lastData || '{}');
        checkForNewSignups(oldData, data);

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dataStr
            });
            if (res.ok) {
                lastData = dataStr;
                showStatus('saved');
            } else {
                showStatus('local');
            }
        } catch (e) {
            showStatus('local');
        }
    }

    function showStatus(s) {
        saveStatus.className = 'save-status';
        switch(s) {
            case 'saving': saveStatus.textContent = 'Saving...'; saveStatus.classList.add('saving'); break;
            case 'saved': saveStatus.textContent = 'Synced'; saveStatus.classList.add('saved');
                setTimeout(() => { saveStatus.textContent = 'All synced'; saveStatus.classList.remove('saved'); }, 1500); break;
            case 'synced': saveStatus.textContent = 'All synced'; break;
            case 'local': saveStatus.textContent = 'Saved locally'; break;
        }
    }

    function debouncedSave() {
        showStatus('saving');
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveData, 500);
    }

    document.querySelectorAll('input[data-field]').forEach(i => {
        i.addEventListener('input', debouncedSave);
        i.addEventListener('change', debouncedSave);
    });
    document.querySelectorAll('[contenteditable="true"][data-field]').forEach(el => {
        el.addEventListener('input', debouncedSave);
    });

    // Submit button handlers
    document.querySelectorAll('.signup-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const button = e.target;
            const projectName = button.dataset.project;
            const input = button.previousElementSibling;
            const personName = input.value.trim();

            if (!personName) {
                input.focus();
                input.style.borderColor = '#ef4444';
                setTimeout(() => { input.style.borderColor = ''; }, 2000);
                return;
            }

            // Disable button while submitting
            button.disabled = true;
            button.textContent = 'Sending...';

            try {
                // Send to Slack
                const res = await fetch(SLACK_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project: projectName, person: personName })
                });

                if (res.ok) {
                    // Show success
                    button.classList.add('success');
                    button.textContent = 'Submitted!';

                    // Save data to sync
                    saveData();

                    // Reset after 3 seconds
                    setTimeout(() => {
                        button.classList.remove('success');
                        button.textContent = 'Submit';
                        button.disabled = false;
                    }, 3000);
                } else {
                    throw new Error('Failed to send');
                }
            } catch (err) {
                button.textContent = 'Error - Retry';
                button.disabled = false;
                console.error('Slack submission failed:', err);
            }
        });
    });

    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveData(); }
    });

    // Poll for changes every 3 seconds
    setInterval(async () => {
        try {
            const res = await fetch(API_URL);
            if (res.ok) {
                const { data } = await res.json();
                const dataStr = JSON.stringify(data);
                if (dataStr !== lastData && data && Object.keys(data).length > 0) {
                    applyData(data);
                    lastData = dataStr;
                    localStorage.setItem(STORAGE_KEY, dataStr);
                }
            }
        } catch(e) {}
    }, 3000);

    loadData();
})();
