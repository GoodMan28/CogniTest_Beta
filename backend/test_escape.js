const assert = require('assert');

// Suppose the text file literally contains: {"text": "hello\nworld, \text \theta \times \n foo"}
// Wait, \n in a text file is two characters: \ and n.
let rawContent = '{"text": "hello\\nworld, \\text \\theta \\times \\n foo"}';

// 1. Escape all backslashes
rawContent = rawContent.replace(/\\/g, '\\\\');
// Now rawContent is: {"text": "hello\\nworld, \\text \\theta \\times \\n foo"} (but with 2x backslashes)

// 2. Revert double backslash + n to single backslash + n
rawContent = rawContent.replace(/\\\\n/g, '\\n');

// 3. Revert double backslash + " to single backslash + "
rawContent = rawContent.replace(/\\\\"/g, '\\"');

let parsed = JSON.parse(rawContent);

console.log("Parsed text:", JSON.stringify(parsed.text));
