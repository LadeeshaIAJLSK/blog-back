const mongoose = require('mongoose');
require('dotenv').config();

// Import the Post model
const Post = require('../models/Post');

async function fixImagePaths() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog');
    console.log('Connected to MongoDB');

    // Find all posts with featured images
    const posts = await Post.find({ featuredImage: { $exists: true, $ne: null } });
    console.log(`Found ${posts.length} posts with featured images`);

    let updated = 0;
    for (const post of posts) {
      const originalPath = post.featuredImage;
      
      // Normalize path separators to forward slashes
      const normalizedPath = originalPath.replace(/\\/g, '/');
      
      if (originalPath !== normalizedPath) {
        post.featuredImage = normalizedPath;
        await post.save();
        updated++;
        console.log(`Updated: ${originalPath} -> ${normalizedPath}`);
      }
    }

    console.log(`Updated ${updated} image paths`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing image paths:', error);
    process.exit(1);
  }
}

fixImagePaths();