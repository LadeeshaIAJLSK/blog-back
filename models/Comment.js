const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  ip: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'spam'],
    default: 'approved'
  },
  replies: [{
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    username: {
      type: String,
      required: true,
      maxlength: 50
    },
    email: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  }],
  likes: [{
    ip: String,
    userAgent: String,
    sessionId: String, // Unique session identifier from frontend
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better performance
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ status: 1 });

module.exports = mongoose.model('Comment', CommentSchema);