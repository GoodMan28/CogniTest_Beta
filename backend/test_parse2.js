const raw = '{"text": "hello \\text \\theta \\times"}';
let replaced = raw.replace(/\\/g, '\\\\');
let parsed = JSON.parse(replaced);
console.log(parsed.text);
