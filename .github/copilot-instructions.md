# Copilot Instructions for Magnolia Asset Checker

## Project Overview
This is a Node.js application for analyzing Magnolia CMS exports to identify unused assets. It features both a command-line interface and a web-based interface with drag-and-drop file upload. The tool compares DAM (Digital Asset Management) exports against page exports to determine which assets are not being used and could potentially be cleaned up.

## Architecture Patterns

### Actual Project Structure
```
magnolia-asset-checker/
├── magnolia_asset_checker.js    # Main CLI application
├── magnolia_asset_extractor.js  # Asset extraction engine
├── web-server.js                # Express.js web server
├── package.json                 # Node.js dependencies and scripts
├── public/                      # Web interface static files
│   ├── index.html              # Main web interface
│   ├── styles.css              # CSS styling
│   └── app.js                  # Frontend JavaScript
├── .github/
│   └── copilot-instructions.md # This file
├── .gitignore                  # Git ignore patterns
└── README.md                   # Comprehensive documentation
```

## Development Workflows

### Core Technologies
- **Node.js** with Express.js for web server
- **xmldom** for XML parsing and manipulation
- **js-yaml** for YAML parsing
- **Multer** for file upload handling
- **Vanilla JavaScript** for frontend (no frameworks)

### Key Components

#### 1. Asset Extraction (`magnolia_asset_extractor.js`)
- Parses Magnolia DAM XML exports
- Extracts asset UUIDs, filenames, and metadata
- Handles both `mgnl:asset` and `mgnl:resource` node types
- Uses JCR repository structure understanding

#### 2. Main CLI Tool (`magnolia_asset_checker.js`)
- Command-line interface with argument parsing
- Compares asset exports against page exports
- Generates three types of reports: all assets, referenced assets, unused assets
- Supports multiple output formats: CSV, JSON, TXT

#### 3. Web Server (`web-server.js`)
- Express.js server with file upload capabilities
- Handles files up to 200MB with 10-minute timeout
- REST API endpoints for analysis and health checks
- Static file serving for web interface

#### 4. Web Interface (`public/`)
- Responsive HTML/CSS interface
- Drag-and-drop file upload
- Real-time progress tracking
- Tabbed results display with download options

## Magnolia CMS Integration Considerations

### Key Integration Points
- **REST API**: Magnolia's REST API for asset retrieval
- **JCR Queries**: Direct repository queries for asset metadata
- **Asset Types**: Images, documents, videos, and custom asset types
- **Workspace Handling**: Different Magnolia workspaces (website, dam, etc.)

### Authentication Patterns
- API key authentication for REST endpoints
- Session-based authentication for administrative access
- Role-based permissions for asset access

## Configuration Management

### Current Implementation
The application currently operates on exported XML/YAML files without direct CMS connection, but future configurations might include:

```yaml
magnolia:
  instances:
    - name: "development"
      url: "http://localhost:8080"
      auth: "api_key"
    - name: "staging"
      url: "https://staging.example.com"
      auth: "session"
      
checks:
  - type: "broken_links"
    enabled: true
  - type: "missing_alt_text"
    enabled: true
  - type: "file_size_validation"
    max_size: "10MB"
```

## Asset Validation Patterns

### Current Check Types
- **UUID Matching**: Direct string search for asset UUIDs in page content
- **Asset Type Detection**: Handles both `mgnl:asset` and `mgnl:resource` nodes
- **Metadata Extraction**: Extracts fileName, assetName, mimeType, size, and UUID
- **Export Format Support**: Handles XML and YAML page exports

### Future Check Types
- **Accessibility**: Alt text, proper markup, contrast ratios
- **Performance**: File sizes, image optimization, compression
- **SEO**: Meta descriptions, title tags, structured data
- **Security**: File type validation, malware scanning
- **Content Quality**: Broken links, duplicate content

### Reporting Formats
- JSON for programmatic consumption
- CSV for spreadsheet analysis
- TXT for human-readable reports
- HTML for web interface display

## Error Handling Conventions

### File Processing Errors
- Graceful handling of malformed XML/YAML
- Clear error messages for unsupported file types
- File size validation (200MB limit in web interface)
- Timeout handling for large file processing

### Asset Processing Errors
- Continue processing other assets when one fails
- Detailed logging of failure reasons
- Recovery suggestions in error messages

## Performance Considerations

### Batch Processing
- Process assets in configurable batch sizes
- Implement rate limiting to avoid overwhelming Magnolia
- Use connection pooling for multiple concurrent checks

### Caching Strategies
- Cache asset metadata to avoid repeated API calls
- Implement cache invalidation based on asset modification dates
- Consider using Redis or similar for distributed caching

## Contributing Guidelines

### Code Organization
- Follow single responsibility principle for checkers
- Use dependency injection for Magnolia connectors
- Implement plugin architecture for extensible checks

### Documentation Requirements
- Document each checker's purpose and configuration
- Provide examples for custom check implementations
- Maintain API documentation for integration points

---

**Note**: This file will be updated as the codebase develops. Please update these instructions when implementing new patterns or discovering project-specific conventions.

### Documentation Requirements
- Document each checker's purpose and configuration
- Provide examples for custom check implementations
- Maintain API documentation for integration points

---

**Note**: This file will be updated as the codebase develops. Please update these instructions when implementing new patterns or discovering project-specific conventions.