const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = 'uploads/images';
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create new post (handles both file upload and URL)
router.post('/posts', [auth, adminAuth, upload.single('featuredImage')], [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, content, excerpt, category, tags, status, metaDescription } = req.body;
    
    // Generate unique slug
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingPost = await Post.findOne({ slug });
    if (existingPost) {
      slug = `${slug}-${Date.now()}`;
    }

    // Handle both file upload and URL
    let featuredImagePath = null;
    if (req.file) {
      // File was uploaded
      featuredImagePath = req.file.path.replace(/\\/g, '/');
    } else if (req.body.featuredImage) {
      // URL was provided
      featuredImagePath = req.body.featuredImage;
    }

    const post = new Post({
      title,
      content,
      excerpt,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      featuredImage: featuredImagePath,
      status: status || 'published',
      author: req.user.userId,
      slug,
      metaDescription
    });

    await post.save();
    await post.populate('author', 'username bio avatar');

    // Update user post count
    await User.findByIdAndUpdate(req.user.userId, { $inc: { postsCount: 1 } });

    res.status(201).json({ 
      message: 'Post created successfully', 
      post 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all posts (admin view)
router.get('/posts', [auth, adminAuth], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;
    const category = req.query.category;
    const search = req.query.search;
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }
    
    const posts = await Post.find(query)
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content');
    
    // Add published field based on status for backward compatibility
    const postsWithPublished = posts.map(post => ({
      ...post.toObject(),
      published: post.status === 'published'
    }));
    
    const total = await Post.countDocuments(query);
    
    res.json({
      posts: postsWithPublished,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single post by ID (admin view)
router.get('/posts/:id', [auth, adminAuth], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username bio avatar');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json({ post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update post
router.put('/posts/:id', [auth, adminAuth, upload.single('featuredImage')], [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, content, excerpt, category, tags, status, metaDescription } = req.body;
    
    const updateData = {
      title,
      content,
      excerpt,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status: status || 'published',
      metaDescription
    };

    // Update slug if title changed
    const existingPost = await Post.findById(req.params.id);
    if (existingPost && existingPost.title !== title) {
      let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const slugExists = await Post.findOne({ slug, _id: { $ne: req.params.id } });
      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
      updateData.slug = slug;
    }

    // Handle featured image
    if (req.file) {
      updateData.featuredImage = req.file.path.replace(/\\/g, '/');
      
      // Delete old image if exists
      if (existingPost && existingPost.featuredImage) {
        try {
          await fs.unlink(existingPost.featuredImage);
        } catch (err) {
          console.log('Failed to delete old image:', err.message);
        }
      }
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'username bio avatar');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ 
      message: 'Post updated successfully', 
      post 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle post publish status
router.patch('/posts/:id/publish', [auth, adminAuth], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Toggle the status
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { status: newStatus },
      { new: true, runValidators: true }
    ).populate('author', 'username bio avatar');

    res.json({ 
      message: `Post ${newStatus} successfully`, 
      post: updatedPost 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete post
router.delete('/posts/:id', [auth, adminAuth], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Delete associated comments
    await Comment.deleteMany({ post: req.params.id });

    // Delete featured image if exists
    if (post.featuredImage) {
      try {
        await fs.unlink(post.featuredImage);
      } catch (err) {
        console.log('Failed to delete image:', err.message);
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    // Update user post count
    await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all comments (admin view)
router.get('/comments', [auth, adminAuth], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    
    const query = {};
    if (status) query.status = status;
    
    const comments = await Comment.find(query)
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Comment.countDocuments(query);
    
    res.json({
      comments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update comment status
router.put('/comments/:id/status', [auth, adminAuth], [
  body('status').isIn(['pending', 'approved', 'spam']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { status } = req.body;
    
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('post', 'title');

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json({ 
      message: 'Comment status updated successfully', 
      comment 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete comment
router.delete('/comments/:id', [auth, adminAuth], async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Update post comment count
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dashboard endpoint (main endpoint called by frontend)
router.get('/dashboard', [auth, adminAuth], async (req, res) => {
  try {
    const [
      totalPosts,
      publishedPosts, 
      draftPosts, 
      totalComments, 
      pendingComments, 
      totalViews
    ] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' }),
      Comment.countDocuments({ status: 'approved' }),
      Comment.countDocuments({ status: 'pending' }),
      Post.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } }
      ])
    ]);

    // Recent posts (all posts, not just published)
    const recentPosts = await Post.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt views commentsCount status published');

    // Popular posts (published only)
    const popularPosts = await Post.find({ status: 'published' })
      .populate('author', 'username')
      .sort({ views: -1 })
      .limit(5)
      .select('title views status published');

    // Recent comments
    const recentComments = await Comment.find({ status: 'approved' })
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalPosts,
      publishedPosts,
      draftPosts,
      totalComments,
      pendingComments,
      totalViews: totalViews[0]?.total || 0,
      recentPosts,
      popularPosts,
      recentComments
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dashboard stats (legacy endpoint)
router.get('/dashboard/stats', [auth, adminAuth], async (req, res) => {
  try {
    const [totalPosts, totalComments, pendingComments, totalViews] = await Promise.all([
      Post.countDocuments({ status: 'published' }),
      Comment.countDocuments({ status: 'approved' }),
      Comment.countDocuments({ status: 'pending' }),
      Post.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } }
      ])
    ]);

    // Recent posts
    const recentPosts = await Post.find({ status: 'published' })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt views commentsCount');

    // Recent comments
    const recentComments = await Comment.find({ status: 'approved' })
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalPosts,
        totalComments,
        pendingComments,
        totalViews: totalViews[0]?.total || 0
      },
      recentPosts,
      recentComments
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;