const { S3Client, PutObjectCommand, GetObjectCommand } = require(require('path').resolve(__dirname, '../backend/node_modules/@aws-sdk/client-s3'));

console.log('S3Client loaded successfully:', typeof S3Client);
