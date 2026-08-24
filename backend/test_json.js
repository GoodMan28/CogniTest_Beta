let str = '{"text": "hello\\\\nworld"}';
str = str.replace(/\\\\n/g, '\\n');
console.log("String after replace:", JSON.stringify(str));
try {
  JSON.parse(str);
  console.log('Parsed OK');
} catch(e) {
  console.log('Error:', e.message);
}
