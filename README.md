# URL Expander

A powerful command-line tool for expanding shortened URLs in text files using headless browser technology. This tool is particularly useful for LinkedIn posts, social media content, and any text containing shortened URLs that need to be expanded to their full destinations.

## Features

- **Headless Browser Expansion**: Uses Puppeteer to handle complex JavaScript-based redirects
- **Multi-threaded Processing**: Processes multiple URLs concurrently for faster results
- **Markdown Support**: Preserves markdown link formatting while expanding URLs
- **Comprehensive URL Detection**: Detects both standalone URLs and markdown links
- **Retry Mechanism**: Automatic retries for failed URL expansions
- **HTTP HEAD Optimization**: Uses faster HEAD requests when possible before falling back to browser
- **Extensive Shortener Support**: Supports 100+ URL shortening services

## Installation

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn

### Install from npm (coming soon)
```bash
npm install -g url-expander
```

### Install from source
```bash
git clone https://github.com/kweusuf/url-expander.git
cd url-expander
npm install
npm link  # Makes the command available globally
```

## Usage

### Basic Usage
```bash
url-expander process your_file.md
```

This will create a new file called `your_file_expanded.md` with all shortened URLs expanded.

### Advanced Options
```bash
url-expander process your_file.md --concurrency 10 --timeout 60 --retries 3
```

- `--concurrency <number>`: Number of concurrent URL expansions (default: 5)
- `--timeout <seconds>`: Browser timeout in seconds (default: 30)
- `--retries <number>`: Number of retry attempts for failed expansions (default: 2)

### Example
```bash
# Process a markdown file with LinkedIn short URLs
url-expander process linkedin_post.md

# Process with higher concurrency for faster results
url-expander process social_media_content.txt --concurrency 15

# Process with longer timeout for complex redirects
url-expander process research_links.md --timeout 60
```

## How It Works

1. **URL Detection**: The tool scans the input text for both standalone URLs and markdown links
2. **Short URL Identification**: Checks if URLs belong to known shortening services
3. **Optimized Expansion**:
   - First attempts fast HTTP HEAD requests for simple redirects
   - Falls back to headless browser for complex JavaScript-based redirects
4. **Concurrent Processing**: Expands multiple URLs simultaneously for efficiency
5. **Result Generation**: Creates a new file with expanded URLs while preserving original formatting

## Supported URL Shorteners

The tool supports over 100 URL shortening services including:

- LinkedIn: `lnkd.in`, `linkedin.com`
- Bitly: `bit.ly`, `bitly.com`, `j.mp`
- Google: `goo.gl`, `g.co`
- TinyURL: `tinyurl.com`, `tiny.cc`
- Twitter: `t.co`, `x.co`
- YouTube: `youtu.be`
- And many more...

## Configuration

You can customize the behavior by creating a configuration object:

```javascript
const URLExpander = require('./urlExpander');

const expander = new URLExpander({
  concurrency: 10,    // Number of concurrent expansions
  timeout: 60000,     // Browser timeout in milliseconds
  retries: 3          // Number of retry attempts
});
```

## Programmatic Usage

```javascript
const URLExpander = require('./urlExpander');

async function expandUrls() {
  const expander = new URLExpander();

  try {
    // Process text directly
    const text = 'Check out this link: https://lnkd.in/example';
    const expandedText = await expander.processText(text);
    console.log(expandedText);

    // Process a file
    const result = await expander.processFile('input.md', 'output.md');
    console.log('File processed:', result.success);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await expander.close();
  }
}

expandUrls();
```

## Performance Optimization

For best performance:

- Use higher concurrency values (10-20) for files with many URLs
- Set appropriate timeout values based on your network speed
- Use retry mechanism for unreliable network connections
- Process large files in batches if needed

## Error Handling

The tool includes comprehensive error handling:

- Automatic retries for failed URL expansions
- Graceful fallback to original URLs when expansion fails
- Detailed error logging for debugging
- Proper resource cleanup (browser instances)

## Development

### Running Tests
```bash
npm test
```

### Building
```bash
npm run build
```

### Contributing
Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the ISC License.

## Examples

### Before Expansion
```markdown
Check out these resources:
- [System Design Guide](https://lnkd.in/eNf2QxVZ)
- [AWS Architecture](https://lnkd.in/eU736g9Q)
```

### After Expansion
```markdown
Check out these resources:
- [System Design Guide](https://www.example.com/system-design-guide)
- [AWS Architecture](https://aws.amazon.com/architecture/10-million-users)
```

## Troubleshooting

### Common Issues

**Issue: Browser crashes or hangs**
- Solution: Reduce concurrency or increase timeout values

**Issue: Some URLs don't expand**
- Solution: Check if the URL shortener is in the supported list
- Solution: Increase retry count for unreliable services

**Issue: Slow performance**
- Solution: Increase concurrency for parallel processing
- Solution: Check network connectivity

### Debugging

Enable verbose logging by modifying the source code or using environment variables:

```bash
DEBUG=url-expander:* url-expander process your_file.md
```

## Roadmap

- GUI interface for easier use
- Batch processing of multiple files
- Custom URL shortener lists
- API endpoint for programmatic access
- Browser extension integration

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**URL Expander** - Expand your links, expand your knowledge! 🚀
