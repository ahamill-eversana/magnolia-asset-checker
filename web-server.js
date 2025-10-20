#!/usr/bin/env node

/**
 * Web interface for Magnolia Asset Checker
 * Provides file upload capabilities and HTML results display
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const MagnoliaAssetChecker = require('./magnolia_asset_checker');

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await fs.mkdir('uploads', { recursive: true });
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.xml', '.yaml', '.yml'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (file.fieldname === 'assetFile' && ext !== '.xml') {
            return cb(new Error('Asset file must be XML'), false);
        }
        
        if (file.fieldname === 'pageFile' && !allowedTypes.includes(ext)) {
            return cb(new Error('Page file must be XML or YAML'), false);
        }
        
        cb(null, true);
    },
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit
        files: 2, // Maximum 2 files
        fields: 10 // Maximum 10 fields
    }
});

// Increase body size limits and timeout
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Set server timeout to 10 minutes for large file processing
app.use((req, res, next) => {
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000); // 10 minutes
    next();
});

// Serve static files
app.use(express.static('public'));

// Error handling middleware for multer
function handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: `File too large. Maximum size is 200MB. Your file: ${Math.round(err.field?.size / 1024 / 1024) || 'unknown'}MB`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files. Please upload only one asset file and one page file.'
            });
        }
        return res.status(400).json({
            error: `Upload error: ${err.message}`
        });
    }
    
    if (err.message.includes('File too large') || err.message.includes('LIMIT_FILE_SIZE')) {
        return res.status(413).json({
            error: 'File too large. Maximum size is 200MB per file.'
        });
    }
    
    next(err);
}

// Main upload route
app.post('/analyze', upload.fields([
    { name: 'assetFile', maxCount: 1 },
    { name: 'pageFile', maxCount: 1 }
]), handleMulterError, async (req, res) => {
    try {
        const assetFile = req.files['assetFile']?.[0];
        const pageFile = req.files['pageFile']?.[0];
        
        if (!assetFile || !pageFile) {
            return res.status(400).json({
                error: 'Both asset file and page file are required'
            });
        }
        
        console.log(`Processing files: ${assetFile.originalname} and ${pageFile.originalname}`);
        
        // Run the asset checker
        const checker = new MagnoliaAssetChecker();
        
        // Extract assets
        const assets = await checker.extractAssetsFromXml(assetFile.path);
        
        // Find referenced UUIDs
        const assetUUIDs = assets.map(asset => asset.uuid);
        const referencedUUIDs = await checker.findReferencedAssetUUIDs(pageFile.path, assetUUIDs);
        
        // Analyze results
        const analysis = checker.analyzeAssets(assets, referencedUUIDs);
        
        // Clean up uploaded files
        await fs.unlink(assetFile.path).catch(console.error);
        await fs.unlink(pageFile.path).catch(console.error);
        
        // Generate timestamp for results
        const timestamp = new Date().toISOString();
        
        // Send results
        res.json({
            success: true,
            timestamp: timestamp,
            files: {
                assetFile: assetFile.originalname,
                pageFile: pageFile.originalname
            },
            results: {
                totalAssets: analysis.allAssets.length,
                referencedAssets: analysis.referencedAssets.length,
                unusedAssets: analysis.unusedAssets.length,
                assetUUIDsSearched: assetUUIDs.length
            },
            assets: {
                all: analysis.allAssets,
                referenced: analysis.referencedAssets,
                unused: analysis.unusedAssets
            }
        });
        
    } catch (error) {
        console.error('Analysis error:', error);
        
        // Clean up any uploaded files on error
        if (req.files) {
            for (const fieldFiles of Object.values(req.files)) {
                for (const file of fieldFiles) {
                    await fs.unlink(file.path).catch(() => {});
                }
            }
        }
        
        res.status(500).json({
            error: error.message || 'Analysis failed'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create public directory for static files
async function ensurePublicDir() {
    await fs.mkdir('public', { recursive: true });
}

// Start server
async function startServer() {
    await ensurePublicDir();
    
    app.listen(port, () => {
        console.log(`🌐 Magnolia Asset Checker Web Interface`);
        console.log(`🚀 Server running at http://localhost:${port}`);
        console.log(`📁 Upload files to analyze asset usage`);
        console.log(`💡 Press Ctrl+C to stop`);
    });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

if (require.main === module) {
    startServer().catch(error => {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    });
}

module.exports = app;