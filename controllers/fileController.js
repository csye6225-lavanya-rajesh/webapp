const AWS = require('aws-sdk');
const { File } = require('../models');
const { v4: uuidv4 } = require('uuid');
const s3 = new AWS.S3({
  region: 'us-east-1',
});

// Function to save file metadata directly in the controller
const saveFileMetadata = async (fileName, fileId, s3Path, uploadDate, fileSize, contentType, expirationDate, fileExtension) => {
  try {
    const fileMetadata = await File.create({
      id: fileId,
      file_name: fileName,
      url: s3Path,
      upload_date: uploadDate,
      file_size: fileSize,
      content_type: contentType,
      file_extension: fileExtension,
      expiration_date: expirationDate, 
    });
    return fileMetadata.id;  
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw error;
  }
};

const uploadFile = async (req, res) => {
  try {
    console.log(req.file);  // Log to ensure req.file is populated
    if (!req.file) {
      return res.status(400);
    }

    const fileBuffer = req.file.buffer;  // File data from 'req.file'
    const fileName = req.file.originalname;  // Original file name
    const mimetype = req.file.mimetype;
    const fileSize = req.file.size;  // Get the file size from the upload
    const fileId = uuidv4();  // Generate a unique file ID

    // Extract file extension from the file name (e.g., '.jpg')
    const fileExtension = fileName.split('.').pop().toLowerCase();

    // Set expiration date (e.g., 30 days from the upload date)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);  // Set expiration to 30 days from today

    // Upload the file to S3
    await uploadToS3(fileBuffer, fileName, mimetype);

    // Format the URL for S3 access
    const formattedUrl = `${process.env.S3_BUCKET}/${fileId}/${fileName}`;

    const formattedDate = new Date().toISOString().split('T')[0];  // Format the upload date

    // Save file metadata to the database
    await saveFileMetadata(fileName, fileId, formattedUrl, formattedDate, fileSize, mimetype, expirationDate, fileExtension);

    // Return the response with the file metadata
    res.status(201).set('X-Status-Message', 'File Added').json({
      file_name: fileName,
      id: fileId,
      url: formattedUrl,
      upload_date: formattedDate,
    });
  } catch (error) {
    console.error(error);
    res.status(400);
  }
};


// Upload file to S3 function
const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
  };

  try {
    const data = await s3.upload(params).promise();
    return data.Location;  // S3 file URL
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

// Function to delete file metadata by fileId
const deleteFileMetadata = async (fileId) => {
  try {
    await File.destroy({
      where: { id: fileId },
    });
    console.log('File metadata deleted successfully');
  } catch (error) {
    console.error('Error deleting file metadata:', error);
    throw error;
  }
};

const deleteFile = async (req, res) => {
  const fileId = req.params.id;

  try {
    // Get the file metadata from the database
    const fileMetadata = await getFileById(fileId);
    if (!fileMetadata) {
      // File not found, send 404 Not Found
      return res.status(404)
        .set('X-Status-Message', 'Not Found')
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('X-Content-Type-Options', 'nosniff')
        .end(); // No response body
    }

    // Directly delete the file from S3 and database
    await deleteFromS3(fileMetadata.file_name);
    await deleteFileMetadata(fileId);

    // Return 204 No Content for successful deletion with no content in response
    return res.status(204).send();
  } catch (error) {
    console.error(error);

    // Handle general server error with 500 Internal Server Error
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete file from S3
const deleteFromS3 = async (s3Name) => {
  // Decode the URL to get the correct file key
  const key = s3Name;

  console.log('Attempting to delete file from S3 with key:', key); // Log the decoded key to verify

  const params = {
    Bucket: process.env.S3_BUCKET,  // Ensure this matches your bucket name
    Key: key,  // Use the decoded key (file path) for deletion
  };

  try {
    await s3.deleteObject(params).promise();
    console.log('File deleted from S3 successfully');
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

const getFileById = async (fileId) => {
  try {
    // Fetch the file metadata from the database
    const fileMetadata = await File.findOne({
      where: { id: fileId },
    });

    // If file is found, return only the necessary fields
    if (fileMetadata) {
      return {
        file_name: fileMetadata.file_name, // assuming the field is named 'file_name'
        id: fileMetadata.id,
        url: fileMetadata.url, // assuming 'user_id' and 'file_name' are present
        upload_date: fileMetadata.upload_date.toISOString().split('T')[0], // format the date as "YYYY-MM-DD"
      };
    }
    return null; // Return null if file not found
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    throw error;
  }
};

// Function to retrieve file metadata for the given fileId
const getFileMetadata = async (req, res) => {
  const fileId = req.params.id;

  try {
    const fileMetadata = await getFileById(fileId);
    if (!fileMetadata) {
      return res.status(404)
        .set('X-Status-Message', 'Not Found')
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('X-Content-Type-Options', 'nosniff')
        .end(); // No response body;;
    }

    res.status(200).json(fileMetadata);
  } catch (error) {
    console.error(error);
    res.status(404)
      .set('X-Status-Message', 'Not Found')
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end(); // No response body;
  }
};

module.exports = { uploadFile, deleteFile, getFileMetadata };
