const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Comment = require('../models/Comment');

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

// This route is for standalone comment operations
// Most comment functionality is in posts.js under /posts/:id/comments

// Like/Unlike a comment
router.post('/:commentId/like', likeRateLimit, async (req, res) => {
  try {
    const commentId = req.params.id;
    
    // Create a unique user identifier using session ID (preferred) or IP+UserAgent fallback
    const sessionId = req.headers['x-session-id'];
    const ip = req.ip || 
              req.headers['x-forwarded-for']?.split(',')[0] || 
              req.connection.remoteAddress || 
              req.socket.remoteAddress ||
              '127.0.0.1';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if this user has already liked this comment
    const existingLike = comment.likes.find(like => {
      if (sessionId) {
        return like.sessionId === sessionId;
      } else {
        return like.ip === ip && like.userAgent === userAgent.substring(0, 50);
      }
    });
    
    if (existingLike) {
      // User can only remove their own like
      comment.likes = comment.likes.filter(like => {
        if (sessionId) {
          return like.sessionId !== sessionId;
        } else {
          return !(like.ip === ip && like.userAgent === userAgent.substring(0, 50));
        }
      });
      comment.likesCount = comment.likes.length;
      await comment.save();
      
      res.json({ 
        message: 'Comment unliked', 
        liked: false, 
        likesCount: comment.likesCount 
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
      
      comment.likes.push(likeData);
      comment.likesCount = comment.likes.length;
      await comment.save();
      
      res.json({ 
        message: 'Comment liked', 
        liked: true, 
        likesCount: comment.likesCount 
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get comment like status
router.get('/:id/like-status', async (req, res) => {
  try {
    const commentId = req.params.id;
    
    // Create the same unique user identifier
    const sessionId = req.headers['x-session-id'];
    const ip = req.ip || 
              req.headers['x-forwarded-for']?.split(',')[0] || 
              req.connection.remoteAddress || 
              req.socket.remoteAddress ||
              '127.0.0.1';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const comment = await Comment.findById(commentId).select('likes likesCount');
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if this specific user has liked this comment
    const liked = comment.likes.some(like => {
      if (sessionId) {
        return like.sessionId === sessionId;
      } else {
        return like.ip === ip && like.userAgent === userAgent.substring(0, 50);
      }
    });
    
    res.json({ 
      liked, 
      likesCount: comment.likesCount 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;