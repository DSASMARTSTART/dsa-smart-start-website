const fs = require('fs');
const https = require('https');
const path = require('path');

// Ensure directory exists
const dir = path.join(__dirname, '..', 'public', 'assets', 'images');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const destPath = path.join(dir, 'parent-support.jpg');
const file = fs.createWriteStream(destPath);

// Using a different Unsplash ID that is definitely valid and high quality
// Photo by "National Cancer Institute" on Unsplash (Parent helping child)
// or similar. 
// Let's use the one from the first attempt which is good: photo-1577896851239-ee1af04116ac
const url = "https://images.unsplash.com/photo-1577896851239-ee1af04116ac?auto=format&fit=crop&q=80&w=800";

console.log(`Downloading to ${destPath}...`);

https.get(url, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
      console.log(`Redirecting to ${response.headers.location}`);
      https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log("Download completed (after redirect).");
          });
      });
  } else if (response.statusCode === 200) {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log("Download completed.");
      });
  } else {
      console.error(`Failed to download: ${response.statusCode}`);
      response.resume(); // consume response data to free up memory
  }
}).on('error', (err) => {
    fs.unlink(destPath, () => {}); // Delete the file async. (But we don't check for this)
    console.error(`Error: ${err.message}`);
});
