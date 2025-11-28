const { r2 } = require('../config/cloud');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Get all images from cloud storage
const getImages = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Images/';
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });

    const response = await r2.send(command);
    
    // Filter out directories (objects ending with /) and get only image files
    const imageFiles = (response.Contents || [])
      .filter(obj => {
        // Exclude directories and ensure it's an image file
        const key = obj.Key;
        const isDirectory = key.endsWith('/');
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key);
        return !isDirectory && isImage;
      })
      .map(obj => {
        // Return the full URL to the image
        const cloudStorageUrl = process.env.R2_PUBLIC_DOMAIN;
        const imageKey = obj.Key;
        // Construct URL: ensure no double slashes
        let imageUrl;
        if (cloudStorageUrl) {
          const baseUrl = cloudStorageUrl.endsWith('/') ? cloudStorageUrl.slice(0, -1) : cloudStorageUrl;
          const key = imageKey.startsWith('/') ? imageKey : `/${imageKey}`;
          imageUrl = `${baseUrl}${key}`;
        } else {
          imageUrl = imageKey;
        }
        return {
          key: imageKey,
          url: imageUrl,
          name: imageKey.replace(prefix, ''),
          size: obj.Size,
          lastModified: obj.LastModified
        };
      });

    res.json({
      success: true,
      images: imageFiles,
      count: imageFiles.length
    });
  } catch (error) {
    console.error('Error fetching images from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images',
      message: error.message
    });
  }
};

// Get all slides from cloud storage
const getSlides = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Slides/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const slides = response.Contents.map(obj => {
      return {
        key: obj.Key,
        url: `${process.env.R2_PUBLIC_DOMAIN}/${obj.Key}`,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      slides: slides,
      count: slides.length
    });
  } catch (error) {
    console.error('Error fetching slides from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch slides',
      message: error.message
    });
  }
};

// Get all videos from cloud storage
const getVideos = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Videos/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const videos = response.Contents.map(obj => {
      return {
        key: obj.Key,
        url: `${process.env.R2_PUBLIC_DOMAIN}/${obj.Key}`,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      videos: videos,
      count: videos.length
    });
  } catch (error) {
    console.error('Error fetching videos from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos',
      message: error.message
    });
  }
};

// Get all codes from cloud storage
const getCodes = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Codes/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const codes = response.Contents.map(obj => {
      return {
        key: obj.Key,
        url: `${process.env.R2_PUBLIC_DOMAIN}/${obj.Key}`,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      codes: codes,
      count: codes.length
    });
  } catch (error) {
    console.error('Error fetching codes from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch codes',
      message: error.message
    });
  }
};

// Get all assets from cloud storage
const getAssets = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Assets/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const assets = response.Contents.map(obj => {
      return {
        key: obj.Key,
        url: `${process.env.R2_PUBLIC_DOMAIN}/${obj.Key}`,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      assets: assets,
      count: assets.length
    });
  } catch (error) {
    console.error('Error fetching assets from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assets',
      message: error.message
    });
  }
};

// Get all event thumbnails from cloud storage
const getEventThumbnails = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Events_Thumbnails/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const eventThumbnails = response.Contents.map(obj => {
      return {
        key: obj.Key,
        url: `${process.env.R2_PUBLIC_DOMAIN}/${obj.Key}`,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      eventThumbnails: eventThumbnails,
      count: eventThumbnails.length
    });
  } catch (error) {
    console.error('Error fetching event thumbnails from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event thumbnails',
      message: error.message
    });
  }
};

// Get all documents from cloud storage
const getDocuments = async (req, res) => {
  try {
    const bucket = process.env.R2_BUCKET;
    const prefix = 'Documents/';
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    const response = await r2.send(command);
    const documents = response.Contents.map(obj => {
      return {
        key: obj.Key,
        url: `${process.env.R2_PUBLIC_DOMAIN}/${obj.Key}`,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
    res.json({
      success: true,
      documents: documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Error fetching documents from R2:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
};

module.exports = {
  getImages,
  getSlides,
  getVideos,
  getCodes,
  getAssets,
  getEventThumbnails,
  getDocuments
};