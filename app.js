// Single Grain Hackathon - Real-time sync
(function() {
    const STORAGE_KEY = 'sg-hackathon-data';
    const API_URL = '/api/sync';
    const saveStatus = document.getElementById('saveStatus');
    let saveTimeout, lastData = '{}';

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
