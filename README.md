# 🔍 Magnolia Asset Checker

A powerful tool for analyzing Magnolia CMS exports to identify unused assets. Features both command-line interface and web-based interface with drag-and-drop file upload.

## ✨ Features

- **🎯 Accurate Asset Detection**: Identifies unused assets by comparing DAM exports against page exports
- **🌐 Web Interface**: Beautiful, responsive web UI with drag-and-drop file upload
- **⚡ Command Line Tool**: Scriptable CLI for automation and batch processing
- **📊 Multiple Output Formats**: Export results as JSON, CSV, or TXT
- **🔍 UUID-Based Matching**: Uses direct string search for reliable asset reference detection
- **📁 Large File Support**: Handles files up to 200MB with 10-minute processing timeout
- **📈 Detailed Reports**: Generates separate reports for all assets, referenced assets, and unused assets

## 🚀 Quick Start

### Web Interface

1. **Start the web server**:
   ```bash
   npm install
   npm run web
   ```

2. **Open your browser** to `http://localhost:3000`

3. **Upload your files**:
   - DAM Asset Export (XML file)
   - Page Export (XML or YAML file)

4. **View results** with interactive charts and download reports

### Command Line Interface

```bash
# Basic usage
node magnolia_asset_checker.js -a dam_export.xml -p website_export.yaml -o results -f json

# Generate CSV output
node magnolia_asset_checker.js -a assets.xml -p pages.xml -o cleanup_list -f csv

# Text format for readable reports
node magnolia_asset_checker.js -a dam.xml -p site.yaml -o analysis -f txt
```

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/magnolia-asset-checker.git
cd magnolia-asset-checker

# Install dependencies
npm install

# Run web interface
npm run web

# Or use command line directly
node magnolia_asset_checker.js --help
```

## 🛠️ Requirements

- **Node.js** 14+ 
- **npm** 6+
- **Magnolia CMS** export files (DAM XML + Page XML/YAML)

## 📖 Usage Examples

### Web Interface

The web interface provides:
- **File Upload Area**: Drag and drop your export files
- **Progress Tracking**: Real-time analysis feedback
- **Results Dashboard**: Visual summary with charts
- **Asset Browser**: Tabbed view of all, unused, and referenced assets
- **Export Options**: Download results in multiple formats

### Command Line Examples

```bash
# Analyze with JSON output
node magnolia_asset_checker.js \
  --assets dam_export.xml \
  --pages website_export.yaml \
  --output unused_assets \
  --format json

# Generate comprehensive CSV report
node magnolia_asset_checker.js \
  -a assets.xml \
  -p pages.xml \
  -o asset_audit \
  -f csv

# Create readable text report
node magnolia_asset_checker.js \
  -a dam.xml \
  -p site.yaml \
  -o cleanup_report \
  -f txt
```

## 📊 Output Formats

### JSON Output
```json
[
  {
    "fileName": "hero-image.jpg",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "assetName": "hero-image.jpg",
    "mimeType": "image/jpeg",
    "size": "245760"
  }
]
```

### CSV Output
```csv
fileName,uuid,assetName,mimeType,size
hero-image.jpg,a1b2c3d4-e5f6-7890-abcd-ef1234567890,hero-image.jpg,image/jpeg,245760
```

## 🏗️ Architecture

### Core Components

- **`magnolia_asset_checker.js`**: Main application with CLI interface
- **`magnolia_asset_extractor.js`**: Asset extraction engine
- **`web-server.js`**: Express.js web server
- **`public/`**: Web interface files (HTML, CSS, JS)

### Processing Flow

1. **Asset Extraction**: Parse DAM XML export to extract asset UUIDs and metadata
2. **Reference Detection**: Search page export content for asset UUID references
3. **Analysis**: Compare extracted assets against found references
4. **Reporting**: Generate categorized reports (all, referenced, unused)

## 🔧 Configuration

### File Size Limits
- **Maximum file size**: 200MB per file
- **Processing timeout**: 10 minutes
- **Upload limit**: 2 files (1 asset + 1 page export)

### Supported File Types
- **Asset exports**: XML format only
- **Page exports**: XML, YAML, YML formats

## 🚦 API Reference

### Web API Endpoints

#### `POST /analyze`
Upload and analyze export files.

**Request**: `multipart/form-data`
- `assetFile`: DAM export XML file
- `pageFile`: Page export XML/YAML file

**Response**: JSON with analysis results
```json
{
  "success": true,
  "results": {
    "totalAssets": 150,
    "referencedAssets": 98,
    "unusedAssets": 52
  },
  "assets": {
    "all": [...],
    "referenced": [...],
    "unused": [...]
  }
}
```

#### `GET /health`
Health check endpoint.

### Command Line Options

```
Options:
  -a, --assets <file>    Magnolia asset export XML file
  -p, --pages <file>     Magnolia page export file (XML or YAML)
  -o, --output <name>    Output file base name
  -f, --format <type>    Output format: csv, json, txt (default: csv)
  -h, --help            Display help information
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**"File too large" error**
- Files must be under 200MB
- Increase limits in `web-server.js` if needed

**"Analysis timeout" error**
- Large files may take up to 10 minutes to process
- Check file size and complexity

**No assets found**
- Ensure DAM export contains `mgnl:asset` or `mgnl:resource` nodes
- Verify XML structure and format

**No matches found**
- Exports must be from the same Magnolia environment
- UUIDs change between different environments/exports

### Getting Help

- Check the [Issues](https://github.com/yourusername/magnolia-asset-checker/issues) page
- Create a new issue with detailed error information
- Include sample files (with sensitive data removed)

## 🎯 Roadmap

- [ ] Support for multiple export formats
- [ ] Batch processing capabilities
- [ ] Integration with Magnolia REST API
- [ ] Asset usage analytics and trends
- [ ] Docker containerization
- [ ] CI/CD pipeline integration

## 🏆 Acknowledgments

- Built for Magnolia CMS asset management
- Uses Express.js for web interface
- Powered by Node.js ecosystem

---

**Made with ❤️ for the Magnolia CMS community**