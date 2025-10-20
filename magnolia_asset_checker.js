#!/usr/bin/env node

/**
 * Magnolia Asset Checker - Compare page exports against asset exports to find unused assets
 * Identifies assets that are not referenced in any page content.
 */

const fs = require('fs').promises;
const path = require('path');
const { DOMParser } = require('xmldom');
const yaml = require('js-yaml');
const { program } = require('commander');
const MagnoliaAssetExtractor = require('./magnolia_asset_extractor');

class MagnoliaAssetChecker {
    constructor() {
        this.supportedFormats = ['.xml', '.yaml', '.yml'];
    }

    /**
     * Find which asset UUIDs are referenced in page content (simple indexOf search)
     */
    async findReferencedAssetUUIDs(pageFilePath, assetUUIDs) {
        try {
            const pageContent = await fs.readFile(pageFilePath, 'utf8');
            const referencedUUIDs = new Set();
            
            console.log(`Searching for ${assetUUIDs.length} asset UUIDs in page content...`);
            console.log(`Page content length: ${pageContent.length} characters`);
            
            // Search for each asset UUID using indexOf
            let foundCount = 0;
            for (let i = 0; i < assetUUIDs.length; i++) {
                const uuid = assetUUIDs[i];
                const position = pageContent.indexOf(uuid);
                
                if (position !== -1) {
                    referencedUUIDs.add(uuid);
                    foundCount++;
                    console.log(`✓ Found UUID: ${uuid} at position ${position}`);
                } else {
                    // Show first few not found for debugging
                    if (i < 3) {
                        console.log(`✗ UUID not found: ${uuid}`);
                    }
                }
            }
            
            console.log(`Found ${referencedUUIDs.size} asset UUIDs referenced in page export`);
            return referencedUUIDs;
        } catch (error) {
            console.error(`Error reading page file: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract all UUIDs referenced in XML page content
     */
    async extractPageUUIDsFromXML(pageXmlPath) {
        try {
            const data = await fs.readFile(pageXmlPath, 'utf8');
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/xml');
            
            const referencedUUIDs = new Set();
            
            // Find all UUID references in the page export
            // Look for sv:value elements that contain UUIDs
            const allElements = this._getAllElements(doc);
            
            for (const element of allElements) {
                if (element.tagName === 'sv:value' && element.textContent) {
                    const text = element.textContent.trim();
                    
                    // Check if this looks like a UUID (36 characters with hyphens)
                    if (this._isUUID(text)) {
                        referencedUUIDs.add(text);
                    }
                    
                    // Look for DAM asset references in the format /dam/jcr:UUID or /dam/jcr:UUID/filename
                    const damMatches = text.match(/\/dam\/jcr:([a-f0-9-]{36})/gi);
                    if (damMatches) {
                        for (const match of damMatches) {
                            const uuid = match.replace('/dam/jcr:', '');
                            if (this._isUUID(uuid)) {
                                referencedUUIDs.add(uuid);
                            }
                        }
                    }
                }
                
                // Also check attributes for UUID references
                if (element.attributes) {
                    for (let i = 0; i < element.attributes.length; i++) {
                        const attr = element.attributes[i];
                        if (attr.value && this._isUUID(attr.value)) {
                            referencedUUIDs.add(attr.value);
                        }
                        // Check for DAM references in attributes too
                        if (attr.value) {
                            const damMatches = attr.value.match(/\/dam\/jcr:([a-f0-9-]{36})/gi);
                            if (damMatches) {
                                for (const match of damMatches) {
                                    const uuid = match.replace('/dam/jcr:', '');
                                    if (this._isUUID(uuid)) {
                                        referencedUUIDs.add(uuid);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            console.log(`Found ${referencedUUIDs.size} UUID references in XML page export`);
            return Array.from(referencedUUIDs);
            
        } catch (error) {
            console.error(`Error reading XML page file: ${error.message}`);
            return [];
        }
    }

    /**
     * Extract all UUIDs referenced in YAML page content
     */
    async extractPageUUIDsFromYAML(pageYamlPath) {
        try {
            const data = await fs.readFile(pageYamlPath, 'utf8');
            const yamlData = yaml.load(data);
            
            const referencedUUIDs = new Set();
            
            // Recursively search for UUIDs in the YAML structure
            this._findUUIDsInObject(yamlData, referencedUUIDs);
            
            console.log(`Found ${referencedUUIDs.size} UUID references in YAML page export`);
            return Array.from(referencedUUIDs);
            
        } catch (error) {
            console.error(`Error reading YAML page file: ${error.message}`);
            return [];
        }
    }

    /**
     * Recursively search for UUIDs in a JavaScript object/array
     */
    _findUUIDsInObject(obj, uuidSet) {
        if (typeof obj === 'string') {
            // Look for standalone UUIDs
            if (this._isUUID(obj)) {
                uuidSet.add(obj);
            }
            // Look for DAM asset references in the format /dam/jcr:UUID or /dam/jcr:UUID/filename
            const damMatches = obj.match(/\/dam\/jcr:([a-f0-9-]{36})/gi);
            if (damMatches) {
                for (const match of damMatches) {
                    const uuid = match.replace('/dam/jcr:', '');
                    if (this._isUUID(uuid)) {
                        uuidSet.add(uuid);
                    }
                }
            }
        } else if (Array.isArray(obj)) {
            for (const item of obj) {
                this._findUUIDsInObject(item, uuidSet);
            }
        } else if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                if (this._isUUID(key)) {
                    uuidSet.add(key);
                }
                this._findUUIDsInObject(value, uuidSet);
            }
        }
    }

    /**
     * Extract assets from asset export (using working magnolia_asset_extractor)
     */
    async extractAssetsFromXml(assetXmlPath) {
        try {
            const extractor = new MagnoliaAssetExtractor();
            const assets = await extractor.extractAssetsFromXml(assetXmlPath);
            
            console.log(`Found ${assets.length} assets in asset export`);
            return assets;
            
        } catch (error) {
            console.error(`Error reading asset XML file: ${error.message}`);
            return [];
        }
    }

    /**
     * Extract asset information from a Magnolia node
     */
    _extractAssetFromNode(node) {
        // Get the asset name from sv:name attribute
        const assetName = node.getAttribute('sv:name');
        if (!assetName) return null;
        
        // Look for properties that indicate this is an asset
        const properties = {};
        let hasAssetProperties = false;
        
        // Get all child property elements
        const children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1 && child.tagName === 'sv:property') {
                const propName = child.getAttribute('sv:name');
                const propValue = this._getPropertyValue(child);
                
                if (propName && propValue) {
                    properties[propName] = propValue;
                    
                    // Check if this looks like an asset
                    if (propName === 'jcr:primaryType' && (propValue === 'mgnl:asset' || propValue === 'mgnl:resource')) {
                        hasAssetProperties = true;
                    }
                }
            }
        }
        
        // Also check for jcr:content nodes (asset data)
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1 && child.tagName === 'sv:node' && 
                child.getAttribute('sv:name') === 'jcr:content') {
                
                const contentProps = this._extractContentProperties(child);
                Object.assign(properties, contentProps);
                
                // If we have fileName or mimeType, it's definitely an asset
                if (contentProps.fileName || contentProps['jcr:mimeType']) {
                    hasAssetProperties = true;
                }
            }
        }
        
        // Only return if this is actually an asset
        if (hasAssetProperties && (properties.fileName || properties['jcr:mimeType'] || 
            properties['jcr:primaryType'] === 'mgnl:asset' || properties['jcr:primaryType'] === 'mgnl:resource')) {
            
            // Get the JCR node UUID from the properties (this is what pages reference)
            const jcrNodeUuid = properties['jcr:uuid'];
            
            return {
                fileName: properties.fileName || assetName,
                uuid: jcrNodeUuid || 'N/A',  // Use JCR node UUID for matching with page references
                assetName: assetName,
                mimeType: properties['jcr:mimeType'] || 'N/A',
                size: properties.size || 'N/A'
            };
        }
        
        return null;
    }

    /**
     * Extract properties from jcr:content node
     */
    _extractContentProperties(contentNode) {
        const properties = {};
        const children = contentNode.childNodes;
        
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1 && child.tagName === 'sv:property') {
                const propName = child.getAttribute('sv:name');
                const propValue = this._getPropertyValue(child);
                
                if (propName && propValue) {
                    properties[propName] = propValue;
                }
            }
        }
        
        return properties;
    }

    /**
     * Get the value from a property element
     */
    _getPropertyValue(propertyNode) {
        const valueNodes = propertyNode.getElementsByTagName('sv:value');
        if (valueNodes && valueNodes.length > 0) {
            const valueNode = valueNodes[0];
            if (valueNode && valueNode.textContent) {
                return valueNode.textContent.trim();
            }
        }
        return null;
    }

    /**
     * Check if a string looks like a UUID
     */
    _isUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    /**
     * Get all elements from XML document recursively
     */
    _getAllElements(node, elements = []) {
        if (node.nodeType === 1) { // Element node
            elements.push(node);
        }
        
        if (node.childNodes) {
            for (let i = 0; i < node.childNodes.length; i++) {
                this._getAllElements(node.childNodes[i], elements);
            }
        }
        
        return elements;
    }

    /**
     * Find unused assets and get referenced assets by comparing asset UUIDs against page references
     */
    analyzeAssets(assets, referencedUUIDs) {
        const referencedUUIDSet = new Set(referencedUUIDs);
        const unusedAssets = [];
        const referencedAssets = [];
        
        // Create unique asset list (remove duplicates by UUID)
        const uniqueAssets = [];
        const seenUUIDs = new Set();
        
        for (const asset of assets) {
            if (asset.uuid !== 'N/A' && !seenUUIDs.has(asset.uuid)) {
                seenUUIDs.add(asset.uuid);
                uniqueAssets.push(asset);
                
                if (referencedUUIDSet.has(asset.uuid)) {
                    referencedAssets.push(asset);
                } else {
                    unusedAssets.push(asset);
                }
            }
        }
        
        return {
            allAssets: uniqueAssets,
            referencedAssets: referencedAssets,
            unusedAssets: unusedAssets
        };
    }

    /**
     * Generate output filename with timestamp in output directory
     */
    generateOutputFilename(baseName, suffix, extension = 'csv') {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[-:]/g, '')
            .replace(/\..+/, '')
            .replace('T', '_');
        return `output/${baseName}_${suffix}_${timestamp}.${extension}`;
    }

    /**
     * Write results to output file
     */
    async writeResults(results, outputFile, formatType = 'csv', title = 'Assets') {
        // Ensure output directory exists
        const dir = path.dirname(outputFile);
        await fs.mkdir(dir, { recursive: true });

        if (!results || results.length === 0) {
            // Create empty file with header for CSV, empty array for JSON, or descriptive message for TXT
            switch (formatType.toLowerCase()) {
                case 'csv':
                    await fs.writeFile(outputFile, 'No assets found,\n');
                    break;
                case 'json':
                    await fs.writeFile(outputFile, '[]');
                    break;
                case 'txt':
                    const timestamp = new Date().toISOString();
                    await fs.writeFile(outputFile, `${title} Report\nGenerated: ${timestamp}\nTotal ${title.toLowerCase()}: 0\n\nNo ${title.toLowerCase()} found.`);
                    break;
            }
            console.log(`No ${title.toLowerCase()} found - empty file created: ${outputFile}`);
            return;
        }

        switch (formatType.toLowerCase()) {
            case 'csv':
                await this._writeCsv(results, outputFile);
                break;
            case 'json':
                await this._writeJson(results, outputFile);
                break;
            default:
                await this._writeText(results, outputFile, title);
                break;
        }
    }

    /**
     * Write results as CSV
     */
    async _writeCsv(results, outputFile) {
        if (!results || results.length === 0) return;

        // Get all unique keys from all results
        const allKeys = new Set();
        results.forEach(result => {
            Object.keys(result).forEach(key => allKeys.add(key));
        });
        const sortedKeys = Array.from(allKeys).sort();

        // Create CSV content
        let csvContent = sortedKeys.join(',') + '\n';
        
        results.forEach(result => {
            const row = sortedKeys.map(key => {
                const value = result[key];
                if (value === null || value === undefined) return '';
                
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                let stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
                }
                return stringValue;
            });
            csvContent += row.join(',') + '\n';
        });

        await fs.writeFile(outputFile, csvContent, 'utf8');
        console.log(`Results written to: ${outputFile}`);
    }

    /**
     * Write results as JSON
     */
    async _writeJson(results, outputFile) {
        const jsonContent = JSON.stringify(results, null, 2);
        await fs.writeFile(outputFile, jsonContent, 'utf8');
        console.log(`Results written to: ${outputFile}`);
    }

    /**
     * Write results as formatted text
     */
    async _writeText(results, outputFile, title = 'Assets') {
        let textContent = `${title} Report\n`;
        textContent += `Generated: ${new Date().toISOString()}\n`;
        textContent += `Total ${title.toLowerCase()}: ${results.length}\n\n`;
        
        results.forEach((result, index) => {
            textContent += `${title.slice(0, -1)} ${index + 1}:\n`;
            Object.entries(result).forEach(([key, value]) => {
                textContent += `  ${key}: ${value}\n`;
            });
            textContent += '\n';
        });

        await fs.writeFile(outputFile, textContent, 'utf8');
        console.log(`Results written to: ${outputFile}`);
    }
}

async function main() {
    program
        .name('magnolia-asset-checker')
        .description('Compare page exports against asset exports to find unused assets')
        .version('1.0.0')
        .requiredOption('-a, --assets <file>', 'Magnolia asset export XML file')
        .requiredOption('-p, --pages <file>', 'Magnolia page export file (XML or YAML)')
        .requiredOption('-o, --output <name>', 'Output file base name (timestamp will be added)')
        .option('-f, --format <type>', 'Output format: csv, json, txt', 'csv')
        .addHelpText('after', `
Examples:
  node magnolia_asset_checker.js -a assets.xml -p pages.xml -o unused_assets
  node magnolia_asset_checker.js -a dam_export.xml -p website_export.yaml -o cleanup_list -f json
        `);

    program.parse();
    const options = program.opts();

    // Validate input files
    const assetPath = path.resolve(options.assets);
    const pagePath = path.resolve(options.pages);
    
    try {
        await fs.access(assetPath);
    } catch (error) {
        console.error(`Error: Asset file '${options.assets}' not found.`);
        process.exit(1);
    }

    try {
        await fs.access(pagePath);
    } catch (error) {
        console.error(`Error: Page file '${options.pages}' not found.`);
        process.exit(1);
    }

    // Validate file extensions
    if (path.extname(assetPath).toLowerCase() !== '.xml') {
        console.error(`Error: Asset file must be XML. Provided: ${path.extname(assetPath)}`);
        process.exit(1);
    }

    const pageExt = path.extname(pagePath).toLowerCase();
    if (!['.xml', '.yaml', '.yml'].includes(pageExt)) {
        console.error(`Error: Page file must be XML or YAML. Provided: ${pageExt}`);
        process.exit(1);
    }

    // Validate format option
    if (!['csv', 'json', 'txt'].includes(options.format.toLowerCase())) {
        console.error(`Error: Unsupported output format '${options.format}'. Supported: csv, json, txt`);
        process.exit(1);
    }

    console.log('Analyzing Magnolia exports...\n');

    // Extract data
    const checker = new MagnoliaAssetChecker();
    
    console.log('1. Extracting assets from asset export...');
    const assets = await checker.extractAssetsFromXml(assetPath);
    
    console.log('2. Searching for asset UUIDs in page export...');
    const assetUUIDs = assets.map(asset => asset.uuid);
    const referencedUUIDs = await checker.findReferencedAssetUUIDs(pagePath, assetUUIDs);
    
    console.log('3. Comparing assets against page references...');
    const analysis = checker.analyzeAssets(assets, referencedUUIDs);

    console.log(`\nResults:`);
    console.log(`- Total unique assets: ${analysis.allAssets.length}`);
    console.log(`- Asset UUIDs searched: ${assetUUIDs.length}`);
    console.log(`- Assets used in pages: ${analysis.referencedAssets.length}`);
    console.log(`- Unused assets: ${analysis.unusedAssets.length}`);

    // Generate output filenames and write all three reports
    const unusedFile = checker.generateOutputFilename(options.output, 'unused', options.format);
    const allAssetsFile = checker.generateOutputFilename(options.output, 'all_assets', options.format);
    const referencedFile = checker.generateOutputFilename(options.output, 'referenced', options.format);

    console.log(`\nGenerating reports...`);
    
    // Write unused assets report
    await checker.writeResults(analysis.unusedAssets, unusedFile, options.format, 'Unused Assets');
    
    // Write all assets report
    await checker.writeResults(analysis.allAssets, allAssetsFile, options.format, 'All Assets');
    
    // Write referenced assets report
    await checker.writeResults(analysis.referencedAssets, referencedFile, options.format, 'Referenced Assets');

    if (analysis.unusedAssets.length === 0) {
        console.log('\n✅ Great! All assets are being used.');
    } else {
        console.log(`\n🧹 Found ${analysis.unusedAssets.length} unused assets that could potentially be cleaned up.`);
    }
    
    console.log(`\n📊 Reports generated:`);
    console.log(`   - All assets: ${allAssetsFile}`);
    console.log(`   - Referenced assets: ${referencedFile}`);
    console.log(`   - Unused assets: ${unusedFile}`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}

module.exports = MagnoliaAssetChecker;