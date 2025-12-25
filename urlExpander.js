const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class URLExpander {
  constructor(options = {}) {
    this.browser = null;
    this.concurrency = options.concurrency || 5;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 2;
    this.shortDomains = [
      'bit.ly', 'goo.gl', 'tinyurl.com', 'ow.ly', 't.co',
      'is.gd', 'buff.ly', 'adf.ly', 'j.mp', 'bc.vc',
      'twitthis.com', 'u.to', 'tinylink.in', 'soo.gd',
      's2r.co', 'g.co', 'youtu.be', 'lnkd.in', 'linkedin.com',
      'cutt.ly', 'short.link', 'tiny.cc', 'rb.gy', 'clk.im',
      'bit.do', 'mcaf.ee', 'qr.ae', 'v.gd', 'tr.im',
      'x.co', '1url.com', 't2m.io', 'zip.net', 'clicky.me',
      'short.io', 'tinyurl.co', 'urlshortener', 'linktr.ee',
      'sni.pt', 'snipurl.com', 'snurl.com', 'shorturl.at',
      'chilp.it', 'cl.lk', 'fa.by', 'go2.me', 'hit.my',
      'linkbee.com', 'liip.to', 'moourl.com', 'pic.gd',
      'poprl.com', 'qlnk.net', 'ri.ms', 'rubyurl.com',
      'shorl.com', 'shrinkify.com', 'shrinkster.com', 'smsh.me',
      'snipr.com', 'snipurl.com', 'snurl.com', 'sp2.ro',
      'su.pr', 'tinylink.in', 'tinyurl.com', 'togoto.us',
      'tr.im', 'trunc.im', 'twurl.nl', 'u.to', 'url.ie',
      'url4.eu', 'urlx.org', 'yep.it', 'yfrog.com', 'zi.ma',
      'zurl.ws', 'x.co', 'bitly.com', 'buff.ly', 'ow.ly'
    ];
    this.urlRegex = /https?:\/\/[^\s<>"'()]+/g;
  }

  // Initialize browser
  async init() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
  }

  // Close browser
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Detect URLs in text
  detectURLs(text) {
    // Find all markdown links first: [text](url)
    const markdownLinks = [];
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s<>"'()]+)\)/g;
    let markdownMatch;

    while ((markdownMatch = markdownRegex.exec(text)) !== null) {
      markdownLinks.push({
        fullMatch: markdownMatch[0],
        text: markdownMatch[1],
        url: markdownMatch[2],
        start: markdownMatch.index,
        end: markdownRegex.lastIndex
      });
    }

    // Find standalone URLs (not in markdown links)
    const standaloneUrls = [];
    const standaloneRegex = /(^|\s)(https?:\/\/[^\s<>"'()]+)($|\s)/g;
    let standaloneMatch;

    while ((standaloneMatch = standaloneRegex.exec(text)) !== null) {
      // Check if this URL is not part of a markdown link
      const isMarkdownLink = markdownLinks.some(link =>
        standaloneMatch.index >= link.start && standaloneMatch.index < link.end
      );

      if (!isMarkdownLink) {
        standaloneUrls.push(standaloneMatch[2]);
      }
    }

    // Combine all URLs, removing duplicates
    const allUrls = [
      ...markdownLinks.map(link => link.url),
      ...standaloneUrls
    ];

    return [...new Set(allUrls)]; // Remove duplicates
  }

  // Check if URL is from a shortener service
  isShortURL(urlStr) {
    try {
      const url = new URL(urlStr);
      const host = url.hostname.toLowerCase().replace('www.', '');
      return this.shortDomains.some(domain => host.includes(domain));
    } catch (e) {
      return false;
    }
  }

  // Try HTTP HEAD request first (faster)
  async tryHeadRequest(url) {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(res.headers.location);
        } else {
          resolve(null);
        }
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      
      req.end();
    });
  }

  // Expand URL with retry mechanism
  async expandURL(url, attempt = 1) {
    try {
      // First try HEAD request for simple redirects
      const headResult = await this.tryHeadRequest(url);
      if (headResult && headResult !== url) {
        console.log(`HEAD expanded: ${url} → ${headResult}`);
        return headResult;
      }

      // Fall back to browser for complex redirects
      return await this.expandURLWithBrowser(url);
    } catch (error) {
      if (attempt < this.retries) {
        console.warn(`Retry ${attempt}/${this.retries} for ${url}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.expandURL(url, attempt + 1);
      }
      console.warn(`Failed to expand ${url}: ${error.message}`);
      return url;
    }
  }

  // Expand URL using headless browser
  async expandURLWithBrowser(url) {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser.newPage();

    // Set user agent and other headers to mimic a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    });

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to the URL with timeout
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Wait a bit more for potential JavaScript redirects
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get final URL
      const finalUrl = page.url();

      // Close the page
      await page.close();

      return finalUrl;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  // Process URLs in parallel batches
  async processURLsBatch(urls) {
    const results = new Map();
    
    for (let i = 0; i < urls.length; i += this.concurrency) {
      const batch = urls.slice(i, i + this.concurrency);
      const batchPromises = batch.map(async (url) => {
        if (this.isShortURL(url)) {
          try {
            const expandedUrl = await this.expandURL(url);
            return { url, expandedUrl, success: true };
          } catch (error) {
            console.warn(`Failed to expand ${url}: ${error.message}`);
            return { url, expandedUrl: url, success: false };
          }
        }
        return { url, expandedUrl: url, success: false };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        results.set(result.url, result);
      });
    }

    return results;
  }

  // Process text to expand all shortened URLs
  async processText(text) {
    // First, detect all markdown links and standalone URLs
    const markdownLinks = [];
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s<>"'()]+)\)/g;
    let markdownMatch;

    while ((markdownMatch = markdownRegex.exec(text)) !== null) {
      markdownLinks.push({
        fullMatch: markdownMatch[0],
        text: markdownMatch[1],
        url: markdownMatch[2],
        start: markdownMatch.index,
        end: markdownRegex.lastIndex
      });
    }

    // Collect all URLs that need expansion
    const urlsToExpand = [];
    markdownLinks.forEach(link => {
      if (this.isShortURL(link.url)) {
        urlsToExpand.push(link.url);
      }
    });

    // Add standalone URLs
    const standaloneUrls = this.detectURLs(text).filter(url =>
      !markdownLinks.some(link => link.url === url) && this.isShortURL(url)
    );
    urlsToExpand.push(...standaloneUrls);

    // Process URLs in parallel
    const expansionResults = await this.processURLsBatch(urlsToExpand);

    // Apply expansions to markdown links
    let result = text;
    for (const link of markdownLinks) {
      const expansion = expansionResults.get(link.url);
      if (expansion && expansion.success && expansion.expandedUrl !== link.url) {
        const newLink = `[${link.text}](${expansion.expandedUrl})`;
        result = result.replace(link.fullMatch, newLink);
        console.log(`Expanded: ${link.url} → ${expansion.expandedUrl}`);
      }
    }

    // Apply expansions to standalone URLs
    for (const url of standaloneUrls) {
      const expansion = expansionResults.get(url);
      if (expansion && expansion.success && expansion.expandedUrl !== url) {
        result = result.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), expansion.expandedUrl);
        console.log(`Expanded: ${url} → ${expansion.expandedUrl}`);
      }
    }

    return result;
  }

  // Process a file
  async processFile(inputPath, outputPath) {
    try {
      const content = fs.readFileSync(inputPath, 'utf8');
      const processedContent = await this.processText(content);
      fs.writeFileSync(outputPath, processedContent);
      return { success: true, inputPath, outputPath };
    } catch (error) {
      console.error(`Error processing file: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = URLExpander;
