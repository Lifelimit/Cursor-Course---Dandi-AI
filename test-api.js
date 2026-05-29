const http = require('http');

async function test() {
  const payload = JSON.stringify({
    githubUrl: "https://github.com/facebook/react",
    apiKey: "__demo__"
  });

  const req = http.request("http://localhost:3001/api/github-summarizer", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    res.on('data', (chunk) => {
      console.log('Chunk:', chunk.toString());
    });
  });
  
  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(payload);
  req.end();
}

test();
