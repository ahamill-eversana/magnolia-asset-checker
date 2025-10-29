#!/usr/bin/env node

/**
 * Magnolia Asset Extractor - Extract asset files and UUIDs from Magnolia XML exports
 * Filters for actual asset files only, ignoring metadata and other JCR properties.
 */

const fs = require('fs').promises;
const path = require('path');
const { DOMParser } = require('xmldom');
const { program } = require('commander');

class MagnoliaAssetExtractor {
    constructor() {
        this.supportedFormats = ['.xml', '.json'];
    }

    /**
     * Extract asset files from Magnolia XML export
     * Only extracts UUIDs from nodes with jcr:primaryType = "mgnl:asset"
     */
    async extractAssetsFromXml(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/xml');
            
            const assets = [];
            
            // Find all sv:property elements with sv:name="jcr:primaryType" and sv:value="mgnl:asset"
            const allElements = this._getAllElements(doc);
            
            for (const element of allElements) {
                if (element.tagName === 'sv:property' && 
                    element.getAttribute('sv:name') === 'jcr:primaryType') {
                    
                    // Use getElementsByTagName instead of querySelector for better XML namespace support
                    const valueElements = element.getElementsByTagName('sv:value');
                    if (valueElements.length > 0 && 
                        valueElements[0].textContent.trim() === 'mgnl:asset') {
                        
                        // Get the parent node
                        const parentNode = element.parentNode;
                        if (parentNode && parentNode.tagName === 'sv:node') {
                            
                            // Look for the jcr:uuid property in sibling elements
                            const asset = this._extractAssetFromAssetNode(parentNode);
                            if (asset) {
                                assets.push(asset);
                            }
                        }
                    }
                }
            }
            
            return assets;
            
        } catch (error) {
            console.error(`Error reading XML file: ${error.message}`);
            return [];
        }
    }

    /**
     * Extract asset information from a node that has jcr:primaryType = "mgnl:asset"
     */
    _extractAssetFromAssetNode(assetNode) {
        let uuid = null;
        let fileName = null;
        let location = 'root';
        
        // Get the asset name from the node's sv:name attribute
        const assetName = assetNode.getAttribute('sv:name');
        
        // Get the complete folder path by traversing up the hierarchy
        let folderPath = [];
        let currentNode = assetNode.parentNode;
        
        while (currentNode && currentNode.tagName === 'sv:node') {
            const nodeName = currentNode.getAttribute('sv:name');
            if (nodeName) {
                folderPath.unshift(nodeName);
            }
            currentNode = currentNode.parentNode;
        }
        
        // Set the location as the path joined by '/'
        if (folderPath.length > 0) {
            location = folderPath.join('/');
        }
        
        // Look through all child properties to find jcr:uuid and fileName
        const childElements = assetNode.childNodes;
        for (let i = 0; i < childElements.length; i++) {
            const child = childElements[i];
            
            if (child.nodeType === 1 && child.tagName === 'sv:property') {
                const propName = child.getAttribute('sv:name');
                const propValue = this._getPropertyValue(child);
                
                if (propName === 'jcr:uuid' && propValue) {
                    uuid = propValue;
                }
                
                if (propName === 'fileName' && propValue) {
                    fileName = propValue;
                }
            }
            
            // Also check jcr:content child node for fileName
            if (child.nodeType === 1 && child.tagName === 'sv:node' && 
                child.getAttribute('sv:name') === 'jcr:content') {
                
                const contentProps = this._extractContentProperties(child);
                if (contentProps.fileName && !fileName) {
                    fileName = contentProps.fileName;
                }
            }
        }
        
        // Only return if we found both UUID and have a valid identifier
        if (uuid) {
            return {
                fileName: fileName || assetName,
                uuid: uuid,
                location: location
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
     * Generate output filename with timestamp in output directory
     */
    generateOutputFilename(baseName, extension = 'csv') {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[-:]/g, '')
            .replace(/\..+/, '')
            .replace('T', '_');
        return `output/${baseName}_${timestamp}.${extension}`;
    }

    /**
     * Write results to output file
     */
    async writeResults(results, outputFile, formatType = 'csv') {
        if (!results || results.length === 0) {
            console.log('No asset files found.');
            return;
        }

        // Ensure output directory exists
        const dir = path.dirname(outputFile);
        await fs.mkdir(dir, { recursive: true });

        switch (formatType.toLowerCase()) {
            case 'csv':
                await this._writeCsv(results, outputFile);
                break;
            case 'json':
                await this._writeJson(results, outputFile);
                break;
            default:
                await this._writeText(results, outputFile);
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
        console.log(`Asset results written to: ${outputFile}`);
    }

    /**
     * Write results as JSON
     */
    async _writeJson(results, outputFile) {
        const jsonContent = JSON.stringify(results, null, 2);
        await fs.writeFile(outputFile, jsonContent, 'utf8');
        console.log(`Asset results written to: ${outputFile}`);
    }

    /**
     * Write results as formatted text
     */
    async _writeText(results, outputFile) {
        let textContent = '';
        results.forEach((result, index) => {
            textContent += `Asset ${index + 1}:\n`;
            Object.entries(result).forEach(([key, value]) => {
                textContent += `  ${key}: ${value}\n`;
            });
            textContent += '\n';
        });

        await fs.writeFile(outputFile, textContent, 'utf8');
        console.log(`Asset results written to: ${outputFile}`);
    }
}

async function main() {
    program
        .name('magnolia-asset-extractor')
        .description('Extract asset files and UUIDs from Magnolia XML exports')
        .version('1.0.0')
        .requiredOption('-i, --input <file>', 'Input Magnolia XML export file')
        .requiredOption('-o, --output <name>', 'Output file base name (timestamp will be added)')
        .option('-f, --format <type>', 'Output format: csv, json, txt', 'csv')
        .addHelpText('after', `
            Examples:
            node magnolia_asset_extractor.js -i magnolia_export.xml -o assets
            node magnolia_asset_extractor.js -i export.xml -o my_assets -f json
        `);

    program.parse();
    const options = program.opts();

    // Validate input file
    const inputPath = path.resolve(options.input);
    
    try {
        await fs.access(inputPath);
    } catch (error) {
        console.error(`Error: Input file '${options.input}' not found.`);
        process.exit(1);
    }

    const ext = path.extname(inputPath).toLowerCase();
    if (ext !== '.xml') {
        console.error(`Error: This tool only supports Magnolia XML exports. Provided: ${ext}`);
        process.exit(1);
    }

    // Validate format option
    if (!['csv', 'json', 'txt'].includes(options.format.toLowerCase())) {
        console.error(`Error: Unsupported output format '${options.format}'. Supported: csv, json, txt`);
        process.exit(1);
    }

    // Extract assets
    const extractor = new MagnoliaAssetExtractor();
    const assets = await extractor.extractAssetsFromXml(inputPath);

    if (!assets || assets.length === 0) {
        console.log('No asset files found in the XML export.');
        process.exit(1);
    }

    // Generate output filename and write results
    const outputFile = extractor.generateOutputFilename(options.output, options.format);
    await extractor.writeResults(assets, outputFile, options.format);

    console.log(`Extracted ${assets.length} asset files from Magnolia export`);
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

module.exports = MagnoliaAssetExtractor;