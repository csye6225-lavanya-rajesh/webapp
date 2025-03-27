const { File } = require('../models');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: 'us-east-1' });
const { statsd } = require('../cloudwatch/metrics');
const logger = require('../cloudwatch/logger');

// Save file metadata (unchanged)
const saveFileMetadata = async (fileName, fileId, s3Path, uploadDate, fileSize, contentType, expirationDate, fileExtension) => {
  const start = Date.now();
  try {
    logger.info(`Starting to save metadata for file: ${fileName} (ID: ${fileId})`, {
      fileSize,
      contentType,
      fileExtension,
      expirationDate
    });
    
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
    
    logger.info(`Successfully saved metadata for file: ${fileName} (ID: ${fileId})`, {
      metadataId: fileMetadata.id,
      duration: Date.now() - start
    });
    statsd.increment('db.file_metadata.create.success');
    statsd.timing('db.file_metadata.create.duration', Date.now() - start);
    
    return fileMetadata.id;
  } catch (error) {
    logger.error(`Failed to save metadata for file: ${fileName} (ID: ${fileId})`, { 
      error: error.message, 
      stack: error.stack,
      operation: 'database_create',
      fileDetails: { fileName, fileId, fileSize }
    });
    statsd.increment('db.file_metadata.create.error');
    throw error;
  }
};

// Upload file handler
const uploadFile = async (req, res) => {
  const apiStart = Date.now();
  
  try {
    if (!req.file) {
      logger.warn('File upload attempt with no file attached', {
        headers: req.headers,
        ip: req.ip
      });
      return res.status(400).end();
    }

    const fileBuffer = req.file.buffer;
    const fileId = uuidv4();
    const originalFileName = req.file.originalname;
    const s3FileName = `${fileId}-${originalFileName}`;
    const mimetype = req.file.mimetype;
    const fileSize = req.file.size;
    const fileExtension = originalFileName.split(".").pop().toLowerCase();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    logger.info(`Starting file upload process for: ${originalFileName} (ID: ${fileId})`, {
      fileSize,
      mimetype,
      fileExtension
    });

    // Upload to S3
    const s3Start = Date.now();
    logger.debug(`Initiating S3 upload for file: ${originalFileName}`, {
      bucket: process.env.S3_BUCKET,
      key: s3FileName
    });
    
    const s3Url = await s3.upload({
      Bucket: process.env.S3_BUCKET,
      Key: s3FileName,
      Body: fileBuffer,
      ContentType: mimetype,
    }).promise();
    
    const s3Duration = Date.now() - s3Start;
    logger.info(`Successfully uploaded to S3: ${originalFileName}`, {
      s3Location: s3Url.Location,
      duration: s3Duration,
      operation: 's3_upload'
    });
    statsd.timing('s3.upload.duration', s3Duration);
    statsd.increment('s3.upload.success');

    logger.debug(`Saving metadata for uploaded file: ${originalFileName}`);
    await saveFileMetadata(
      originalFileName,
      fileId, 
      s3Url.Location, 
      new Date().toISOString().split("T")[0], 
      fileSize, 
      mimetype, 
      expirationDate, 
      fileExtension
    );

    const totalDuration = Date.now() - apiStart;
    logger.info(`File upload completed successfully: ${originalFileName}`, {
      fileId,
      totalDuration,
      status: 'success'
    });
    statsd.timing('api.file_upload.duration', totalDuration);
    statsd.increment('api.file_upload.success');
    
    res.status(201).json({ 
      file_name: originalFileName,
      id: fileId, 
      url: s3Url.Location,
      upload_date: new Date().toISOString().split("T")[0] 
    });
  } catch (error) {
    logger.error('File upload process failed', { 
      error: error.message, 
      stack: error.stack,
      operation: 'file_upload',
      fileDetails: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null
    });
    statsd.increment('api.file_upload.error');
    res.status(500).end();
  }
};

// Function to delete file metadata from database
const deleteFileMetadata = async (fileId) => {
  const start = Date.now();
  try {
    logger.info(`Starting deletion of file metadata (ID: ${fileId})`);
    
    const result = await File.destroy({
      where: { id: fileId },
    });
    
    if (result === 1) {
      logger.info(`Successfully deleted file metadata (ID: ${fileId})`, {
        duration: Date.now() - start
      });
    } else {
      logger.warn(`No file metadata found to delete (ID: ${fileId})`);
    }
    
    statsd.increment('db.file_metadata.delete.success');
    statsd.timing('db.file_metadata.delete.duration', Date.now() - start);
  } catch (error) {
    logger.error(`Failed to delete file metadata (ID: ${fileId})`, { 
      error: error.message, 
      stack: error.stack,
      operation: 'metadata_deletion'
    });
    statsd.increment('db.file_metadata.delete.error');
    throw error;
  }
};

// Delete file handler
const deleteFile = async (req, res) => {
  const apiStart = Date.now();
  const fileId = req.params.id;

  try {
    logger.info(`Starting file deletion process (ID: ${fileId})`);
    
    const fileMetadata = await getFileById(fileId);
    if (!fileMetadata) {
      logger.warn(`File not found for deletion (ID: ${fileId})`, {
        operation: 'file_deletion',
        status: 'not_found'
      });
      return res.status(404).end();
    }

    const s3Key = `${fileMetadata.id}-${fileMetadata.file_name}`;
    logger.debug(`Initiating S3 file deletion (Key: ${s3Key})`);
    
    const s3Start = Date.now();
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
    }).promise();
    
    const s3Duration = Date.now() - s3Start;
    logger.info(`Successfully deleted file from S3 (ID: ${fileId})`, {
      s3Key,
      duration: s3Duration
    });
    statsd.timing('s3.delete.duration', s3Duration);
    statsd.increment('s3.delete.success');

    logger.debug(`Deleting metadata for file (ID: ${fileId})`);
    await deleteFileMetadata(fileId);

    const totalDuration = Date.now() - apiStart;
    logger.info(`File deletion completed successfully (ID: ${fileId})`, {
      totalDuration,
      status: 'success'
    });
    statsd.timing('api.file_delete.duration', totalDuration);
    statsd.increment('api.file_delete.success');
    
    res.status(204).end();
  } catch (error) {
    logger.error(`File deletion failed (ID: ${fileId})`, { 
      error: error.message, 
      stack: error.stack,
      operation: 'file_deletion'
    });
    statsd.increment('api.file_delete.error');
    res.status(500).end();
  }
};

// Get file metadata handler
const getFileMetadata = async (req, res) => {
  const apiStart = Date.now();
  const fileId = req.params.id;

  try {
    logger.info(`Request received for file metadata (ID: ${fileId})`);
    
    const fileMetadata = await getFileById(fileId);
    if (!fileMetadata) {
      logger.warn(`File metadata not found (ID: ${fileId})`, {
        operation: 'metadata_retrieval',
        status: 'not_found'
      });
      return res.status(404).end();
    }

    const duration = Date.now() - apiStart;
    logger.info(`Successfully retrieved file metadata (ID: ${fileId})`, {
      duration,
      fileName: fileMetadata.file_name
    });
    statsd.timing('api.file_get.duration', duration);
    statsd.increment('api.file_get.success');
    
    res.status(200).json(fileMetadata);
  } catch (error) {
    logger.error(`Failed to retrieve file metadata (ID: ${fileId})`, { 
      error: error.message, 
      stack: error.stack,
      operation: 'metadata_retrieval'
    });
    statsd.increment('api.file_get.error');
    res.status(500).end();
  }
};

// Helper function to get file by ID
const getFileById = async (fileId) => {
  const start = Date.now();
  try {
    logger.debug(`Fetching file metadata from database (ID: ${fileId})`);
    
    const fileMetadata = await File.findOne({
      where: { id: fileId },
    });

    if (fileMetadata) {
      const duration = Date.now() - start;
      logger.debug(`Successfully retrieved file from database (ID: ${fileId})`, {
        duration,
        fileName: fileMetadata.file_name
      });
      statsd.increment('db.file_metadata.read.success');
      statsd.timing('db.file_metadata.read.duration', duration);
      
      return {
        file_name: fileMetadata.file_name,
        id: fileMetadata.id,
        url: fileMetadata.url,
        upload_date: fileMetadata.upload_date.toISOString().split('T')[0],
      };
    }
    
    logger.debug(`No file found in database (ID: ${fileId})`);
    return null;
  } catch (error) {
    logger.error(`Database query failed for file (ID: ${fileId})`, { 
      error: error.message, 
      stack: error.stack,
      operation: 'database_query'
    });
    statsd.increment('db.file_metadata.read.error');
    throw error;
  }
};

module.exports = { uploadFile, deleteFile, getFileMetadata };