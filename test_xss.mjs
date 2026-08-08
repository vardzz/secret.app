import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const payload = `
# XSS Test
This is a test.
<script>alert('XSS 1')</script>
<a href="javascript:alert('XSS 2')">Click me</a>
<img src="x" onerror="alert('XSS 3')" />
`;

console.log("Original Markdown:");
console.log(payload);

const rawHtml = marked.parse(payload, { async: false });
console.log("\nRaw HTML from Marked:");
console.log(rawHtml);

const sanitizedHtml = DOMPurify.sanitize(rawHtml);
console.log("\nSanitized HTML from DOMPurify:");
console.log(sanitizedHtml);

const xss1Removed = !sanitizedHtml.includes('<script>');
const xss2Removed = !sanitizedHtml.includes('javascript:alert');
const xss3Removed = !sanitizedHtml.includes('onerror=');

if (xss1Removed && xss2Removed && xss3Removed) {
  console.log("\n[PASS] All XSS vectors successfully stripped by DOMPurify.");
} else {
  console.log("\n[FAIL] Some XSS vectors bypassed DOMPurify!");
  process.exit(1);
}
