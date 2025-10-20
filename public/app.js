// Global variables
let analysisResults = null;

// DOM elements
const uploadForm = document.getElementById('uploadForm');
const assetFileInput = document.getElementById('assetFile');
const pageFileInput = document.getElementById('pageFile');
const analyzeButton = document.getElementById('analyzeButton');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const results = document.getElementById('results');

// File upload handling
function setupFileHandlers() {
    // Asset file handler
    assetFileInput.addEventListener('change', function(e) {
        handleFileSelect(e.target, 'assetFileInfo', 'DAM Asset Export');
        checkFormValidity();
    });
    
    // Page file handler
    pageFileInput.addEventListener('change', function(e) {
        handleFileSelect(e.target, 'pageFileInfo', 'Page Export');
        checkFormValidity();
    });
    
    // Drag and drop handlers
    setupDragAndDrop('assetUploadArea', assetFileInput);
    setupDragAndDrop('pageUploadArea', pageFileInput);
}

function handleFileSelect(input, infoId, label) {
    const file = input.files[0];
    const infoDiv = document.getElementById(infoId);
    
    if (file) {
        const maxSize = 200 * 1024 * 1024; // 200MB
        const sizeWarning = file.size > maxSize ? 
            '<br><small style="color: #dc3545;">⚠️ File exceeds 200MB limit</small>' : '';
        
        const sizeDisplay = file.size > maxSize ? 
            `<span style="color: #dc3545;">${formatFileSize(file.size)}</span>` : 
            formatFileSize(file.size);
            
        infoDiv.innerHTML = `
            <strong>${label}:</strong> ${file.name}<br>
            <small>Size: ${sizeDisplay} | Type: ${file.type || 'Unknown'}</small>
            ${sizeWarning}
        `;
        infoDiv.classList.add('show');
    } else {
        infoDiv.classList.remove('show');
    }
}

function setupDragAndDrop(areaId, input) {
    const area = document.getElementById(areaId);
    
    area.addEventListener('dragover', function(e) {
        e.preventDefault();
        area.classList.add('dragover');
    });
    
    area.addEventListener('dragleave', function(e) {
        e.preventDefault();
        area.classList.remove('dragover');
    });
    
    area.addEventListener('drop', function(e) {
        e.preventDefault();
        area.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    });
}

function checkFormValidity() {
    const hasAssetFile = assetFileInput.files.length > 0;
    const hasPageFile = pageFileInput.files.length > 0;
    
    const maxSize = 200 * 1024 * 1024; // 200MB
    const assetFileValid = !hasAssetFile || assetFileInput.files[0].size <= maxSize;
    const pageFileValid = !hasPageFile || pageFileInput.files[0].size <= maxSize;
    
    const allValid = hasAssetFile && hasPageFile && assetFileValid && pageFileValid;
    analyzeButton.disabled = !allValid;
    
    if (hasAssetFile && hasPageFile && (!assetFileValid || !pageFileValid)) {
        analyzeButton.textContent = '❌ Files too large (max 200MB each)';
        analyzeButton.style.background = '#dc3545';
    } else if (allValid) {
        analyzeButton.textContent = '🚀 Analyze Assets';
        analyzeButton.style.background = '#28a745';
    } else {
        analyzeButton.textContent = '🚀 Analyze Assets';
        analyzeButton.style.background = '#6c757d';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Form submission
uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    hideError();
    showLoading();
    hideResults();
    
    const formData = new FormData();
    formData.append('assetFile', assetFileInput.files[0]);
    formData.append('pageFile', pageFileInput.files[0]);
    
    try {
        // Add timeout for large files (10 minutes)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
        
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const result = await response.json();
        
        if (!response.ok) {
            if (response.status === 413) {
                throw new Error('File too large. Please use files smaller than 200MB.');
            }
            throw new Error(result.error || 'Analysis failed');
        }
        
        analysisResults = result;
        displayResults(result);
        
    } catch (err) {
        if (err.name === 'AbortError') {
            showError('Request timed out. Please try with smaller files or check your connection.');
        } else {
            showError(err.message);
        }
    } finally {
        hideLoading();
    }
});

// Display functions
function showLoading() {
    loading.classList.add('show');
}

function hideLoading() {
    loading.classList.remove('show');
}

function showError(message) {
    error.textContent = message;
    error.classList.add('show');
}

function hideError() {
    error.classList.remove('show');
}

function showResults() {
    results.classList.add('show');
}

function hideResults() {
    results.classList.remove('show');
}

function displayResults(data) {
    // Display summary
    const summary = document.getElementById('summary');
    summary.innerHTML = `
        <div class="summary-item">
            <div class="summary-number">${data.results.totalAssets}</div>
            <div class="summary-label">Total Assets</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">${data.results.referencedAssets}</div>
            <div class="summary-label">Referenced Assets</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">${data.results.unusedAssets}</div>
            <div class="summary-label">Unused Assets</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">${Math.round((data.results.referencedAssets / data.results.totalAssets) * 100)}%</div>
            <div class="summary-label">Usage Rate</div>
        </div>
    `;
    
    // Display asset lists
    displayAssetList('allAssets', data.assets.all);
    displayAssetList('unusedAssets', data.assets.unused);
    displayAssetList('referencedAssets', data.assets.referenced);
    
    showResults();
    
    // Scroll to results
    results.scrollIntoView({ behavior: 'smooth' });
}

function displayAssetList(containerId, assets) {
    const container = document.getElementById(containerId);
    
    if (!assets || assets.length === 0) {
        container.innerHTML = '<div class="asset-item">No assets found</div>';
        return;
    }
    
    container.innerHTML = assets.map(asset => `
        <div class="asset-item">
            <div>
                <div class="asset-name">${escapeHtml(asset.fileName || asset.assetName || 'Unknown')}</div>
                <div class="asset-uuid">${escapeHtml(asset.uuid || 'N/A')}</div>
            </div>
            <div class="asset-info">
                <div>Type: ${escapeHtml(asset.mimeType || 'Unknown')}</div>
                <div>Size: ${asset.size !== 'N/A' ? formatFileSize(parseInt(asset.size) || 0) : 'Unknown'}</div>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Tab functionality
function showTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    event.target.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Download functionality
function downloadResults(type, format) {
    if (!analysisResults) {
        alert('No analysis results available');
        return;
    }
    
    let data;
    let filename;
    
    switch (type) {
        case 'all':
            data = analysisResults.assets.all;
            filename = `all-assets.${format}`;
            break;
        case 'unused':
            data = analysisResults.assets.unused;
            filename = `unused-assets.${format}`;
            break;
        case 'referenced':
            data = analysisResults.assets.referenced;
            filename = `referenced-assets.${format}`;
            break;
        default:
            alert('Invalid download type');
            return;
    }
    
    let content;
    let mimeType;
    
    if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
    } else if (format === 'csv') {
        content = convertToCSV(data);
        mimeType = 'text/csv';
    } else {
        alert('Invalid format');
        return;
    }
    
    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function convertToCSV(data) {
    if (!data || data.length === 0) {
        return 'No data available';
    }
    
    // Get all unique keys
    const keys = [...new Set(data.flatMap(item => Object.keys(item)))];
    
    // Create CSV header
    const header = keys.join(',');
    
    // Create CSV rows
    const rows = data.map(item => {
        return keys.map(key => {
            const value = item[key] || '';
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    });
    
    return [header, ...rows].join('\n');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setupFileHandlers();
    
    console.log('🚀 Magnolia Asset Checker Web Interface loaded');
    console.log('📁 Upload your DAM export and page export files to get started');
});