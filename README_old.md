# 🔍 Magnolia Asset Checker

A powerful tool for analyzing Magnolia CMS exports to identify unused assets. Features both command-line interface and web-based interface with drag-and-drop file upload.

## Tools Overview

### 1. Magnolia Asset Checker (`magnolia_asset_checker.js`)

**Purpose**: Compare Magnolia page exports against Digital Asset Management (DAM) exports to identify unused assets that could potentially be cleaned up.

**Features**:
- Compare Magnolia page exports (XML/YAML) against asset exports (XML)
- Generate three comprehensive reports per analysis:
  - **All Assets**: Complete list of all unique assets from DAM export
  - **Referenced Assets**: Assets that are actively used in page content
  - **Unused Assets**: Assets not referenced in any page content (potential cleanup candidates)
- Support for multiple output formats (CSV, JSON, TXT)
- Automatic timestamped output files with descriptive suffixes
- Configurable output directory
- Deduplication of assets across all reports

**Usage**:
```bash
node magnolia_asset_checker.js -a assets.xml -p pages.xml -o output_name
node magnolia_asset_checker.js -a dam_export.xml -p website_export.yaml -o cleanup_list -f json
```

**Output Files**: Each run generates three timestamped files:
- `{output_name}_all_assets_{timestamp}.{format}` - Complete asset inventory
- `{output_name}_referenced_{timestamp}.{format}` - Assets used in pages
- `{output_name}_unused_{timestamp}.{format}` - Potential cleanup candidates

**Options**:
- `-a, --assets <file>` - Magnolia asset export XML file (required)
- `-p, --pages <file>` - Magnolia page export file (XML or YAML) (required)  
- `-o, --output <name>` - Output file base name (required)
- `-f, --format <type>` - Output format: csv, json, txt (default: csv)

---

### 2. General Asset Extractor (`asset_extractor.js`)

**Purpose**: A general-purpose tool for extracting parameters from XML or JSON files and outputting them to dynamically named files. Perfect for processing Magnolia CMS exports and other structured data.

## Features

- **Dual Format Support**: Parse both XML and JSON files
- **Parameter Extraction**: Extract any 2 specified parameters from nodes/objects
- **Dynamic Output**: Generate timestamped output files
- **Multiple Output Formats**: CSV, JSON, or plain text
- **Deep Search**: Recursively search nested structures
- **CLI Interface**: Easy-to-use command-line interface

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd magnolia-asset-checker

# Install dependencies
npm install

# Make the script executable (optional)
chmod +x asset_extractor.js
```

## Usage

### Basic Syntax

```bash
node asset_extractor.js -i <input-file> -p1 <param1> -p2 <param2> -o <output-name> [-f <format>]
```

### Parameters

- `-i, --input <file>`: Input file (XML or JSON) - **Required**
- `-p1, --param1 <name>`: First parameter to extract - **Required**
- `-p2, --param2 <name>`: Second parameter to extract - **Required**
- `-o, --output <name>`: Output file base name (timestamp will be added) - **Required**
- `-f, --format <type>`: Output format: csv, json, txt (default: csv) - **Optional**

### Examples

#### Extract from JSON file
```bash
# Extract 'name' and 'url' parameters, output as CSV
node asset_extractor.js -i examples/sample_assets.json -p1 name -p2 url -o assets

# Extract 'id' and 'type' parameters, output as JSON
node asset_extractor.js -i examples/sample_assets.json -p1 id -p2 type -o asset_types -f json
```

#### Extract from XML file
```bash
# Extract 'id' and 'name' parameters from XML
node asset_extractor.js -i examples/sample_assets.xml -p1 id -p2 name -o xml_extract

# Extract custom parameters, output as text
node asset_extractor.js -i config.xml -p1 setting -p2 value -o config_dump -f txt
```

## Output Files

Output files are automatically named with timestamps:
- `{output-name}_{YYYYMMDD_HHMMSS}.{format}`
- Example: `assets_20241016_143052.csv`

### Output Formats

#### CSV Format
```csv
id,name,url
asset_001,hero-image.jpg,/dam/assets/images/hero-image.jpg
asset_002,product-guide.pdf,/dam/assets/documents/product-guide.pdf
```

#### JSON Format
```json
[
  {
    "id": "asset_001",
    "name": "hero-image.jpg",
    "url": "/dam/assets/images/hero-image.jpg"
  }
]
```

#### Text Format
```
Record 1:
  id: asset_001
  name: hero-image.jpg
  url: /dam/assets/images/hero-image.jpg

Record 2:
  id: asset_002
  name: product-guide.pdf
  url: /dam/assets/documents/product-guide.pdf
```

## Input File Formats

### JSON Structure
The tool can handle various JSON structures:

```json
{
  "assets": [
    {
      "id": "asset_001",
      "name": "hero-image.jpg",
      "url": "/dam/assets/images/hero-image.jpg"
    }
  ]
}
```

### XML Structure
The tool searches XML elements, attributes, and text content:

```xml
<assets>
  <asset id="asset_001">
    <name>hero-image.jpg</name>
    <url>/dam/assets/images/hero-image.jpg</url>
  </asset>
</assets>
```

## How It Works

### JSON Processing
- Searches object keys directly
- Recursively searches nested objects and arrays
- Handles both single objects and arrays of objects

### XML Processing
- Searches element attributes
- Searches element text content when tag name matches parameter
- Searches child element text content
- Includes context information (_element_tag, _attributes)

## Error Handling

- **File Not Found**: Clear error message if input file doesn't exist
- **Invalid Format**: Validation for supported file extensions (.xml, .json)
- **Parse Errors**: Graceful handling of malformed XML/JSON
- **No Results**: Informative message when no matching parameters are found

## Dependencies

- **commander**: Command-line interface parsing
- **xmldom**: XML document parsing and manipulation

## Requirements

- Node.js 14.0.0 or higher
- npm or yarn package manager

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details