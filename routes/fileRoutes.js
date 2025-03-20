const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.post('/v1/file', fileController.uploadFile);
router.get('/v1/file/:id', fileController.getFileMetadata);
router.delete('/v1/file/:id', fileController.deleteFile);

module.exports = router;
