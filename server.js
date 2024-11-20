// Required dependencies
const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');

// Initialize express app
const app = express();

// Set up AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.accessKeyId,
  secretAccessKey: process.env.secretAccessKey,
  region: process.env.region
});

// In-memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Compress middleware to upload files to S3
const compress = async (req, res, next) => {
  try {
    const originalBucketName = process.env.bucket;
    const originalFiles = req.files;  // Array of files from the form
    console.log("Original Files Data Before Upload:", originalFiles);

    const compressedFiles = [];

    // Loop through files and upload them to S3
    for (const originalFile of originalFiles) {
      console.log("Original file data:", originalFile);

      const originalKey = `uploads/${originalFile.fieldname}_${Date.now()}${path.extname(originalFile.originalname)}`;

      const compressedParams = {
        Bucket: originalBucketName,
        Key: originalKey,
        Body: originalFile.buffer
      };

      // Upload the file to S3
      await s3.upload(compressedParams).promise();

      // Push the key of the uploaded file into the array
      compressedFiles.push(originalKey.replace('uploads/', ''));
    }

    console.log("Compressed Files:", compressedFiles);

    // Attach the uploaded file names to the request object for further use
    req.compressedFiles = compressedFiles;

    // Update file names in req.files
    req.files.forEach((file, index) => {
      file.filename = compressedFiles[index];
    });

    next();  // Move to the next middleware or route handler
  } catch (error) {
    console.error("Error in compress middleware:", error);
    next(error);  // Forward error to next middleware
  }
};

// Basic file upload route
app.post('/upload', upload.array('files'), compress, (req, res) => {
  // After the compress middleware, we can access the uploaded file names
  console.log("Uploaded File Names:", req.compressedFiles);
  res.status(200).json({
    Status: true,
    message: 'Files uploaded successfully!',
    files: req.compressedFiles  // Send back the uploaded file names (S3 keys)
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
