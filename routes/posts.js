const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// Rate limiting for like operations
const likeRateLimit = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 3, // max 3 like operations per 5 seconds
  message: { message: 'Too many like requests. Please wait a moment before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use sessionId if available, otherwise fall back to IP
    return req.headers['x-session-id'] || req.ip || 'unknown';
  }
});

// Get all posts with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const tag = req.query.tag;
    const search = req.query.search;
    
    const query = { status: 'published' };
    
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const posts = await Post.find(query)
      .populate('author', 'username bio avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content');
    
    const total = await Post.countDocuments(query);
    
    // Get sidebar data (categories and popular tags)
    const categories = await Post.distinct('category', { status: 'published' });
    const allTags = await Post.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const popularTags = allTags.map(tag => ({ name: tag._id, count: tag.count }));
    
    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      sidebar: {
        categories,
        popularTags
      },
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single post by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Check if identifier is ObjectId or slug
    const query = identifier.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: identifier } 
      : { slug: identifier };
    
    const post = await Post.findOne({ ...query, status: 'published' })
      .populate('author', 'username bio avatar socialLinks');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Get comments separately from Comment collection
    const comments = await Comment.find({ 
      post: post._id, 
      status: 'approved' 
    }).sort({ createdAt: -1 });
    
    // Add comments to post object
    post.comments = comments;
    
    // Increment view count
    await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });
    
    // Get related posts
    const relatedPosts = await Post.find({
      _id: { $ne: post._id },
      $or: [
        { category: post.category },
        { tags: { $in: post.tags } }
      ],
      status: 'published'
    })
    .populate('author', 'username')
    .limit(3)
    .select('title slug featuredImage createdAt category');
    
    res.json({ post, relatedPosts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like/Unlike a post
router.post('/:id/like', likeRateLimit, async (req, res) => {
  try {
    const postId = req.params.id;
    
    // Create a unique user identifier using session ID (preferred) or IP+UserAgent fallback
    const sessionId = req.headers['x-session-id'];
    const ip = req.ip || 
              req.headers['x-forwarded-for']?.split(',')[0] || 
              req.connection.remoteAddress || 
              req.socket.remoteAddress ||
              '127.0.0.1';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Use session ID if available, otherwise fall back to IP+UserAgent
    const userIdentifier = sessionId || `${ip}_${userAgent.substring(0, 50)}`;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if this user has already liked this post
    const existingLike = post.likes.find(like => {
      if (sessionId) {
        return like.sessionId === sessionId;
      } else {
        return like.ip === ip && like.userAgent === userAgent.substring(0, 50);
      }
    });
    
    if (existingLike) {
      // User can only remove their own like
      post.likes = post.likes.filter(like => {
        if (sessionId) {
          return like.sessionId !== sessionId;
        } else {
          return !(like.ip === ip && like.userAgent === userAgent.substring(0, 50));
        }
      });
      post.likesCount = post.likes.length;
      await post.save();
      
      res.json({ 
        message: 'Post unliked', 
        liked: false, 
        likesCount: post.likesCount 
      });
    } else {
      // Add like - only if this user hasn't liked it already
      const likeData = { 
        ip, 
        userAgent: userAgent.substring(0, 50),
        timestamp: new Date()
      };
      
      if (sessionId) {
        likeData.sessionId = sessionId;
      }
      
      post.likes.push(likeData);
      post.likesCount = post.likes.length;
      await post.save();
      
      res.json({ 
        message: 'Post liked', 
        liked: true, 
        likesCount: post.likesCount 
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if post is liked by current user
router.get('/:id/like-status', async (req, res) => {
  try {
    const postId = req.params.id;
    
    // Create the same unique user identifier
    const sessionId = req.headers['x-session-id'];
    const ip = req.ip || 
              req.headers['x-forwarded-for']?.split(',')[0] || 
              req.connection.remoteAddress || 
              req.socket.remoteAddress ||
              '127.0.0.1';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const post = await Post.findById(postId).select('likes likesCount');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if this specific user has liked this post
    const liked = post.likes.some(like => {
      if (sessionId) {
        return like.sessionId === sessionId;
      } else {
        return like.ip === ip && like.userAgent === userAgent.substring(0, 50);
      }
    });
    
    res.json({ 
      liked, 
      likesCount: post.likesCount 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add comment to post
router.post('/:id/comments', [
  body('text').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters'),
  body('username').trim().isLength({ min: 1, max: 50 }).withMessage('Name must be between 1 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }
    
    const postId = req.params.id;
    const { text, username, email } = req.body;
    // Get IP address with fallbacks
    const ip = req.ip || 
              req.headers['x-forwarded-for']?.split(',')[0] || 
              req.connection.remoteAddress || 
              req.socket.remoteAddress ||
              '127.0.0.1';
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const comment = new Comment({
      post: postId,
      text,
      username,
      email,
      ip
    });
    
    await comment.save();
    
    // Update post comment count
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    
    res.status(201).json({ 
      message: 'Comment added successfully',
      comment 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get comments for a post
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const comments = await Comment.find({ 
      post: postId, 
      status: 'approved' 
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const total = await Comment.countDocuments({ 
      post: postId, 
      status: 'approved' 
    });
    
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

// Get categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Post.distinct('category', { status: 'published' });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tags
router.get('/meta/tags', async (req, res) => {
  try {
    const tags = await Post.distinct('tags', { status: 'published' });
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;