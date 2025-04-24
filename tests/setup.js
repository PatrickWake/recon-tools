// Mock fetch API
global.fetch = jest.fn();

// Mock DOM elements
document.body.innerHTML = `
    <form id="analysis-form">
        <input type="url" id="target-url" value="https://example.com">
    </form>
    <div id="results" class="hidden">
        <div id="results-content">
            <pre></pre>
        </div>
    </div>
    <div id="error" class="hidden">
        <p id="error-message"></p>
    </div>
    <div id="loading" class="hidden"></div>
`;

// Mock tool buttons
const toolButtons = ['cms-detect', 'header-check', 'dns-lookup', 'robots-check', 'email-finder'].map(tool => {
    const button = document.createElement('button');
    button.className = 'tool-btn';
    button.dataset.tool = tool;
    return button;
});

document.body.append(...toolButtons); 